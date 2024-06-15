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

        static getValue(values: State.AxisValues, axis: Constant.Axis): string { //TODO refactor other
            switch (axis) {
                case Constant.Axis.X:
                    return values.x;
                case Constant.Axis.Y:
                    return values.y;
            }
        }

        static getComplementValue(values: State.AxisValues, axis: Constant.Axis): string {
            switch (axis) {
                case Constant.Axis.X:
                    return values.y;
                case Constant.Axis.Y:
                    return values.x;
            }
        }
    }

    export class Range {
        readonly min: number;
        readonly max: number;

        constructor(min: number, max: number) {
            this.min = min;
            this.max = max;
        }

        static matches(range: Range | undefined, int: number): boolean {
            return int >= range?.min && int < range?.max;
        }

        static isNotValid(range: Range): boolean {
            return range.min > range.max;
        }

        static getValidated(range: Range): Range {
            return this.isNotValid(range) ? new Range(range.max, range.min) : range;
        }

        static isWithZeroLength(range: Range): boolean {
            return range.min === range.max;
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
                .forEach(dimension => snapshot.set(dimension, Range.getValidated(Slider.getRange(dimension))));
            return snapshot;
        }
    }

    export const TOTALS: Totals = new Totals();
    export const SLIDERS_STATE: Snapshot = new Snapshot();
}

export namespace Calculation { //TODO move to separate file, to interfaces
    export class ResultProcessor {
        calcResults: Array<CalculationResult> = [];
        finalResult?: CalculationResult; //TODO private

        static addResult(holder: ResultProcessor, result: Calculation.CalculationResult): void {
            holder.calcResults.push(result);
        }

        static finalResult(holder: ResultProcessor): Calculation.CalculationResult | undefined {
            if (holder.calcResults.length > 0) {
                const head: CalculationResult | undefined = holder.calcResults.pop();
                if (head !== undefined && holder.finalResult !== undefined) {
                    holder.finalResult = ResultProcessor.merge(holder.finalResult, head);
                } else {
                    holder.finalResult = head;
                }
            }
            return holder.finalResult;
        }

        private static merge(first: CalculationResult, second: CalculationResult): CalculationResult {
            for (const [key, val]: [string, number] of second.cellCounts) {
                const cellCountsValue: number | undefined = first.cellCounts.get(key);
                if (cellCountsValue === undefined) {
                    first.cellCounts.set(key, val);
                } else {
                    first.cellCounts.set(key, cellCountsValue + val);
                }
            }
            for (const [key, val]: [string, Array<string>] of second.cellToTranches) {
                const tranchesArray: Array<string> | undefined = first.cellToTranches.get(key);
                if (tranchesArray === undefined) {
                    first.cellToTranches.set(key, val);
                } else {
                    first.cellToTranches.set(key, tranchesArray.concat(val));
                }
            }
            first.totalTranches += second.totalTranches;
            first.totalCompounds += second.totalCompounds;
            return first;
        }
    }

    export const CALC_RESULT: ResultProcessor = new ResultProcessor();

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
    }
}