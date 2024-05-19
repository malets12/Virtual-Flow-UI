import {Slider} from "./component/Slider.ts";
import {Constant} from "./Constant.ts";
import {KEY} from "./data/mapping/key.ts";

export namespace State {
    export const TOTALS: Totals = new Totals();
    export const SLIDERS_STATE: Snapshot = new Snapshot();

    export class AxisValues {
        private readonly x: string;
        private readonly y: string;

        constructor(x: string = "MW", y: string = "SlogP") {
            if (x === y) {
                throw "Illegal state: same axis";
            }
            this.x = x;
            this.y = y;
        }

        getValue(axis: Constant.Axis): string {
            switch (axis) {
                case Constant.Axis.X:
                    return this.x;
                case Constant.Axis.Y:
                    return this.y;
            }
        }

        getComplementValue(axis: Constant.Axis): string {
            switch (axis) {
                case Constant.Axis.X:
                    return this.y;
                case Constant.Axis.Y:
                    return this.x;
            }
        }
    }

    export class Range {
        private readonly _min: number;
        private readonly _max: number;

        constructor(min: number, max: number) {
            this._min = min;
            this._max = max;
        }

        isNotValid(): boolean {
            return this._min > this._max;
        }

        getValidated(): Range {
            if (this.isNotValid()) {
                return new Range(this._max, this._min);
            } else {
                return this;
            }
        }

        matches(int: number): boolean {
            return int >= this._min && int < this._max;
        }

        areEqual(): boolean {
            return this._min === this._max;
        }


        get min(): number {
            return this._min;
        }

        get max(): number {
            return this._max;
        }
    }

    class Totals {
        private _compounds: Range = new Range(0, 0);
        private _tranches: Range = new Range(0, 0);

        get(what: Constant.Counter): Range {
            return what === Constant.Counter.COMPOUNDS ? this._compounds : this._tranches;
        }

        setMax(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    this._compounds = new Range(this._compounds.min, value);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    this._tranches = new Range(this._tranches.min, value);
                    break;
                }
            }
        }

        setMin(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    this._compounds = new Range(value, this._compounds.max);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    this._tranches = new Range(value, this._tranches.max);
                    break;
                }
            }
        }
    }

    class Snapshot {
        private _map: ReadonlyMap<string, Range> = new Map();

        get map(): ReadonlyMap<string, Range> {
            return this._map;
        }

        saveNew(axis: AxisValues, full: boolean = false): void {
            this._map = this.currentState(axis, full);
        }

        isNeedRecalculation(axis: AxisValues): boolean {
            const current: ReadonlyMap<string, Range> = this.currentState(axis);
            for (const [key, val]: [string, Range] of this._map) {
                const currentVal: Range | undefined = current.get(key);
                if (currentVal?.min !== val.min || currentVal?.max !== val.max) {
                    return true;
                }
            }
            return false;
        }

        private currentState(axis: AxisValues, full: boolean = false): ReadonlyMap<string, Range> {
            const snapshot: Map<string, Range> = new Map();
            Array.from(KEY.map.keys())
                .filter(key => full || (key !== axis.getValue(Constant.Axis.X) && key !== axis.getValue(Constant.Axis.Y)))
                .forEach(dimension => snapshot.set(dimension, Slider.getRange(dimension).getValidated()));
            return snapshot;
        }
    }
}

export namespace Calculation {

    export const CALC_RESULT: CalculationResultHolder = new CalculationResultHolder();

    export class CalculationResultHolder {
        private readonly calcResults: Array<CalculationResult> = [];
        private _finalResult?: CalculationResult;

        tryMerge(): void {
            const head: CalculationResult | undefined = this.calcResults.pop();
            const other: CalculationResult | undefined = this.calcResults.pop();
            if (head !== undefined && other !== undefined) {
                this.calcResults.push(head.merge(other));
            }
        }

        addResult(result: Calculation.CalculationResult): void {
            this.calcResults.push(result);
        }

        get finalResult(): Calculation.CalculationResult | undefined {
            if (this.calcResults.length === 1) {
                this._finalResult = this.calcResults.pop();
            }
            return this._finalResult;
        }
    }

    export class CalculationResult {
        private readonly _cellCounts: Map<string, number>;
        private readonly _cellToTranches: Map<string, Array<string>>;
        private _totalTranches: number;
        private _totalCompounds: number;

        constructor(cellCounts: Map<string, number>,
                    cellToTranches: Map<string, Array<string>>,
                    totalTranches: number,
                    totalCompounds: number) {
            this._cellCounts = cellCounts;
            this._cellToTranches = cellToTranches;
            this._totalTranches = totalTranches;
            this._totalCompounds = totalCompounds;
        }

        merge(other: CalculationResult): CalculationResult {
            for (const [key, val]: [string, number] of other.cellCounts) {
                const cellCountsValue: number | undefined = this._cellCounts.get(key);
                if (cellCountsValue === undefined) {
                    this._cellCounts.set(key, val);
                } else {
                    this._cellCounts.set(key, cellCountsValue + val);
                }
            }
            for (const [key, val]: [string, Array<string>] of other.cellToTranches) {
                const tranchesArray: Array<string> | undefined = this._cellToTranches.get(key);
                if (tranchesArray === undefined) {
                    this._cellToTranches.set(key, val);
                } else {
                    this._cellToTranches.set(key, [...tranchesArray, ...val]);
                }
            }
            this._totalTranches += other.totalTranches;
            this._totalCompounds += other.totalCompounds;
            return this;
        }

        get totalTranches(): number {
            return this._totalTranches;
        }

        get totalCompounds(): number {
            return this._totalCompounds;
        }

        get cellCounts(): Map<string, number> {
            return this._cellCounts;
        }

        get cellToTranches(): Map<string, Array<string>> {
            return this._cellToTranches;
        }
    }
}