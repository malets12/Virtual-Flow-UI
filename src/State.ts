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
            return Range.isNotValid(range) ? new Range(range.max, range.min) : range;
        }

        static isWithZeroLength(range: Range): boolean {
            return range.min === range.max;
        }
    }

    export class Totals {
        private compounds: Range = new Range(0, 0);
        private tranches: Range = new Range(0, 0);

        static get(counter: Constant.Counter): Range {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    return TOTALS.compounds;
                }
                case Constant.Counter.TRANCHES: {
                    return TOTALS.tranches;
                }
            }
        }

        static setMax(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    TOTALS.compounds = new Range(TOTALS.compounds.min, value);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    TOTALS.tranches = new Range(TOTALS.tranches.min, value);
                    break;
                }
            }
        }

        static setMin(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    TOTALS.compounds = new Range(value, TOTALS.compounds.max);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    TOTALS.tranches = new Range(value, TOTALS.tranches.max);
                    break;
                }
            }
        }
    }

    export class Snapshot {
        private map: ReadonlyMap<string, Range> = new Map();

        static current(): ReadonlyMap<string, Range> {
            return SLIDERS_STATE.map;
        }

        static saveNew(axis: AxisValues, full: boolean = false): void {
            SLIDERS_STATE.map = Snapshot.currentState(axis, full);
        }

        static isNeedRecalculation(axisValues: AxisValues): boolean {
            const current: ReadonlyMap<string, Range> = Snapshot.currentState(axisValues);
            for (const [key, val]: [string, Range] of SLIDERS_STATE.map) {
                const currentVal: Range | undefined = current.get(key);
                if (currentVal?.min !== val.min || currentVal?.max !== val.max) {
                    return true;
                }
            }
            return false;
        }

        private static currentState(axisValues: AxisValues, full: boolean = false): ReadonlyMap<string, Range> {
            const snapshot: Map<string, Range> = new Map();
            Array.from(KEY.map.keys())
                .filter(dimension => full || (dimension !== axisValues.x && dimension !== axisValues.y))
                .forEach(dimension => snapshot.set(dimension, Range.getValidated(Slider.getRange(dimension))));
            return snapshot;
        }
    }

    const TOTALS: Totals = new Totals();
    const SLIDERS_STATE: Snapshot = new Snapshot();
}

export namespace Calculation { //TODO move to separate file, to interfaces
    export class ResultProcessor {
        calcResults: Array<CalculationResult> = [];
        finalResult?: CalculationResult; //TODO private

        static addResult(holder: ResultProcessor, result: Calculation.CalculationResult): void {
            holder.calcResults.push(result);
        }

        static clearState(holder: ResultProcessor): void {
            holder.calcResults.length = 0;
            holder.finalResult = undefined;
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