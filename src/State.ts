import {Constant} from "./Constant.ts";
import {KEY} from "./data/mapping/key.ts";

namespace State {
    import Counter = Constant.Counter;
    import Axis = Constant.Axis;

    export const TOTALS:Totals = new Totals();
    export const SLIDERS_STATE:Snapshot = new Snapshot();

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

        getValue(axis: Axis): string {
            switch (axis) {
                case Axis.X:
                    return this.x;
                case Axis.Y:
                    return this.y;
            }
        }

        getComplementValue(axis: Axis): string {
            switch (axis) {
                case Axis.X:
                    return this.y;
                case Axis.Y:
                    return this.x;
            }
        }
    }

    export class Limits { //TODO rename as Range
        readonly min: number;
        readonly max: number;

        constructor(min: number, max: number) {
            this.min = min;
            this.max = max;
        }

        getValidated(): Limits {
            if (this.min > this.max) {
                return new Limits(this.max, this.min);
            } else {
                return this;
            }
        }

        matches(int: number): boolean {
            return int >= limits.min && int < limits.max;
        }

        areEqual():boolean {
            return this.min === this.max;
        }
    }

    class Totals {
        private _compounds: Limits = new State.Limits(0, 0);
        private _tranches: Limits = new State.Limits(0, 0);

        get(what: Counter): Limits {
            return what === Counter.COMPOUNDS ? this._compounds : this._tranches;
        }

        setMax(what: Counter, value: number): void {
            switch (what) {
                case Counter.COMPOUNDS: {
                    this._compounds = new State.Limits(this._compounds.min, value);
                    break;
                }
                case Counter.TRANCHES: {
                    this._tranches = new State.Limits(this._tranches.min, value);
                    break;
                }
            }
        }

        setMin(what: Counter, value: number): void {
            switch (what) {
                case Counter.COMPOUNDS: {
                    this._compounds = new State.Limits(value, this._compounds.max);
                    break;
                }
                case Counter.TRANCHES: {
                    this._tranches = new State.Limits(value, this._tranches.max);
                    break;
                }
            }
        }
    }

    class Snapshot {
        private _map: ReadonlyMap<string, Limits>;

        constructor() {
            this._map = new Map();
        }

        get map(): ReadonlyMap<string, State.Limits> {
            return this._map;
        }

        saveNew(axis: AxisValues, full: boolean = false): void {
            this._map = this.currentState(axis, full);
        }

        isNeedRecalculation(axis:AxisValues):boolean {
            const current:ReadonlyMap<string, Limits> = this.currentState(axis);
            for (let [key, val] of this._map) {
                const currentVal:Limits = current.get(key);
                if (currentVal.min !== val.min || currentVal.max !== val.max) {
                    return true;
                }
            }
            return false;
        }

        private currentState(axis: AxisValues, full: boolean = false):ReadonlyMap<string, Limits> {
            const snapshot: Map<string, Limits> = new Map();
            Array.from(KEY.map.keys())
                .filter(key => full || (key !== axis.x && key !== axis.y))
                .forEach(dimension =>
                    snapshot.set(dimension, new Limits(
                        parseInt(document.getElementById(dimension + "_min").value),
                        parseInt(document.getElementById(dimension + "_max").value)
                    ).getValidated()));
            return snapshot;
        }
    }
}

namespace Calculation {

    export const CALC_RESULT:CalculationResult = new CalculationResult();

    export class CalculationResult {
        private readonly calcResults:Array<CalculationResult>;
        private _finalResult:CalculationResult;

        constructor() {
            this.result = new CalculationResult();
            this.calcResults = [];
        }

        tryMerge():void {
            if (this.calcResults.length > 1) {
                this.calcResults.push(
                    this.calcResults.pop().merge(this.calcResults.pop())
                );
            }
        }

        addResult(result:Calculation.CalculationResult):void {
            this.calcResults.push(result);
        }

        get finalResult():Calculation.CalculationResult {
            if (this.calcResults.length === 1) {
                this._finalResult = this.calcResults.pop();
            }
            return this._finalResult;
        }
    }

    export class CalculationResult {
        private readonly _cellCounts:Map<string, number>;
        private readonly _cellToTranches:Map<string, Array<string>>;
        private _totalTranches:number;
        private _totalCompounds:number;

        constructor(cellCounts:Map<string, number>,
                    cellToTranches:Map<string, Array<string>>,
                    totalTranches:number,
                    totalCompounds:number) {
            this._cellCounts = cellCounts;
            this._cellToTranches = cellToTranches;
            this._totalTranches = totalTranches;
            this._totalCompounds = totalCompounds;
        }

        merge(other:CalculationResult):CalculationResult {
            for (const [key, val] of other.cellCounts()) {
                const cellCountsValue:number|undefined = this._cellCounts.get(key);
                if (cellCountsValue === undefined) {
                    this._cellCounts.set(key, val);
                } else {
                    this._cellCounts.set(key, cellCountsValue + val);
                }
            }
            for (const [key, val] of other.cellToTranches()) {
                const tranchesArray:Array<string>|undefined = this._cellToTranches.get(key);
                if (tranchesArray === undefined) {
                    this._cellToTranches.set(key, val);
                } else {
                    this._cellToTranches.set(key, [...tranchesArray, ...val]);
                }
            }
            this._totalTranches += other.totalTranches();
            this._totalCompounds += other.totalCompounds();
            return this;
        }

        get totalTranches():number {
            return this._totalTranches;
        }

        get totalCompounds():number {
            return this._totalCompounds;
        }

        get cellCounts():Map<string, number> {
            return this._cellCounts;
        }

        get cellToTranches():Map<string, Array<string>> {
            return this._cellToTranches;
        }
    }
}