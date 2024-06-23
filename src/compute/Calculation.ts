export namespace Calculation {

    export interface ResultProcessor {
        addPart(result: CalculationResult): void;
        getFinalResult(): CalculationResult | undefined;
        clearState(): void;
    }

    class CalculationResultProcessor implements ResultProcessor {
        private calcResults: Array<CalculationResult> = [];
        private finalResult?: CalculationResult;

        addPart(result: Calculation.CalculationResult): void {
            this.calcResults.push(result);
        }

        getFinalResult(): CalculationResult | undefined {
            if (this.calcResults.length > 0) {
                const head: CalculationResult | undefined = this.calcResults.pop();
                this.finalResult = head !== undefined && this.finalResult !== undefined ? this.merge(this.finalResult, head) : head;
            }
            return this.finalResult;
        }

        clearState(): void {
            this.calcResults.length = 0;
            this.finalResult = undefined;
        }

        private merge(first: CalculationResult, second: CalculationResult): CalculationResult {
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

    export const CALC_RESULT: ResultProcessor = new CalculationResultProcessor();

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