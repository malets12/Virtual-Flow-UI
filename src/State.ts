import {Constant} from "./Constant.ts";

namespace State {

    import Axis = Constant.Axis;

    export class AxisValues {
        readonly x:string;
        readonly y:string;

        constructor(x:string = "MW", y:string = "SlogP") {
            if (x === y) {
                throw "Illegal state: same axis";
            }
            this.x = x;
            this.y = y;
        }

        getValue(axis:Axis):string {
            switch (axis) {
                case Axis.X: return this.x;
                case Axis.Y: return this.y;
            }
        }

        getComplementValue(axis:Axis):string {
            switch (axis) {
                case Axis.X: return this.y;
                case Axis.Y: return this.x;
            }
        }
    }

    export class Limits {
        readonly min:number;
        readonly max:number;

        constructor(min:number, max:number) {
            this.min = min;
            this.max = max;
        }

        matches(int:number):boolean {
            return int >= limits.min && int < limits.max;
        }
    }

    export class CalculationResult {
        private readonly cellCounts:Map<string, number>;
        private readonly cellToTranches:Map<string, Array<string>>;
        private totalTranches:number;
        private totalCompounds:number;

        constructor(cellCounts:Map<string, number>,
                    cellToTranches:Map<string, Array<string>>,
                    totalTranches:number,
                    totalCompounds:number) {
            this.cellCounts = cellCounts;
            this.cellToTranches = cellToTranches;
            this.totalTranches = totalTranches;
            this.totalCompounds = totalCompounds;
        }

        merge(other:CalculationResult):CalculationResult {
            other.getCellCounts().forEach((val:number, key:string):void => {
                const cellCountsValue:number|undefined = first.cellCounts.get(key);
                if (cellCountsValue === undefined) {
                    this.cellCounts.set(key, val);
                } else {
                    this.cellCounts.set(key, cellCountsValue + val);
                }
            });
            other.getCellToTranches().forEach((val:Array<string>, key:string):void => {
                const tranchesArray:Array<string>|undefined = first.cellToTranches.get(key);
                if (tranchesArray === undefined) {
                    this.cellToTranches.set(key, val);
                } else {
                    this.cellToTranches.set(key, [...tranchesArray, ...val]);
                }
            });
            this.totalTranches += other.getTotalTranches();
            this.totalCompounds += other.getTotalCompounds();
            return this;
        }

        getTotalTranches():number {
            return this.totalTranches;
        }

        getTotalCompounds():number {
            return this.totalCompounds;
        }

        getCellCounts():Map<string, number> {
            return this.cellCounts;
        }

        getCellToTranches():Map<string, Array<string>> {
            return this.cellToTranches;
        }
    }
}