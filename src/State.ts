import {Slider} from "./component/Slider.ts";
import {Constant} from "./Constant.ts";
import {KEY} from "./data/mapping/key.ts";

export namespace State {
    export class AxisValues {
        readonly x: string;
        readonly y: string;

        constructor(x: string = "MW", y: string = "SlogP") {
            if (x === y) {
                throw "Illegal state: same axis";
            }
            this.x = x;
            this.y = y;
        }
    }

    export class Range {
        readonly min: number;
        readonly max: number;

        constructor(min: number, max: number) {
            this.min = min;
            this.max = max;
        }

        isNotValid(): boolean {
            return this.min > this.max;
        }

        getValidated(): Range {
            if (this.isNotValid()) {
                return new Range(this.max, this.min);
            } else {
                return this;
            }
        }

        matches(int: number): boolean {
            return int >= this.min && int < this.max;
        }

        areEqual(): boolean {
            return this.min === this.max;
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
        map: ReadonlyMap<string, Range> = new Map();

        saveNew(axis: AxisValues, full: boolean = false): void {
            this.map = this.currentState(axis, full);
        }

        isNeedRecalculation(axisValues: AxisValues): boolean {
            const current: ReadonlyMap<string, Range> = this.currentState(axisValues);
            for (const [key, val]: [string, Range] of this.map) {
                const currentVal: Range | undefined = current.get(key);
                if (currentVal?.min !== val.min || currentVal?.max !== val.max) {
                    return true;
                }
            }
            return false;
        }

        private currentState(axisValues: AxisValues, full: boolean = false): ReadonlyMap<string, Range> {
            const snapshot: Map<string, Range> = new Map();
            Array.from(KEY.map.keys())
                .filter(key => full || (key !== axisValues.x && key !== axisValues.y))
                .forEach(dimension => snapshot.set(dimension, Slider.getRange(dimension).getValidated()));
            return snapshot;
        }
    }

    export const TOTALS: Totals = new Totals();
    export const SLIDERS_STATE: Snapshot = new Snapshot();
}

export namespace Calculation {
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

        finalResult(): Calculation.CalculationResult | undefined {
            if (this.calcResults.length === 1) {
                this._finalResult = this.calcResults.pop();
            }
            return this._finalResult;
        }
    }

    export const CALC_RESULT: CalculationResultHolder = new CalculationResultHolder();

    export class CalculationResult {
        readonly cellCounts: Map<string, number>;
        readonly cellToTranches: Map<string, Array<string>>;
        totalTranches: number;
        totalCompounds: number;

        constructor(cellCounts: Map<string, number>,
                    cellToTranches: Map<string, Array<string>>,
                    totalTranches: number,
                    totalCompounds: number) {
            this.cellCounts = cellCounts;
            this.cellToTranches = cellToTranches;
            this.totalTranches = totalTranches;
            this.totalCompounds = totalCompounds;
        }

        merge(other: CalculationResult): CalculationResult {
            for (const [key, val]: [string, number] of other.cellCounts) {
                const cellCountsValue: number | undefined = this.cellCounts.get(key);
                if (cellCountsValue === undefined) {
                    this.cellCounts.set(key, val);
                } else {
                    this.cellCounts.set(key, cellCountsValue + val);
                }
            }
            for (const [key, val]: [string, Array<string>] of other.cellToTranches) {
                const tranchesArray: Array<string> | undefined = this.cellToTranches.get(key);
                if (tranchesArray === undefined) {
                    this.cellToTranches.set(key, val);
                } else {
                    this.cellToTranches.set(key, [...tranchesArray, ...val]);
                }
            }
            this.totalTranches += other.totalTranches;
            this.totalCompounds += other.totalCompounds;
            return this;
        }
    }
}