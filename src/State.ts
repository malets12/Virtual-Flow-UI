namespace State {
    export class Axis {
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

    export class Limits {
        readonly min: number;
        readonly max: number;

        constructor(min: number, max: number) {
            this.min = min;
            this.max = max;
        }
    }

    export class CalculationResult {
        readonly final_map: Map<string, number>;
        readonly tranches_map: Map<string, Array<string>>;
        readonly total_tranches: number;
        readonly total_cmpds: number;

        constructor(cellCounts: Map<string, number>,
                    tranches_map: Map<string, Array<string>>,
                    totalTranches: number,
                    totalCompounds: number) {
            this.final_map = cellCounts;
            this.tranches_map = tranches_map;
            this.total_tranches = totalTranches;
            this.total_cmpds = totalCompounds;
        }
    }
}