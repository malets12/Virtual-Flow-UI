import {Constant} from "../../Constant.ts";
import {ORDER} from "../../data/mapping/order.ts";
import {Calculation, State} from "../../State.ts";
import {Message} from "./Message.ts";

export type Tranche = { [s: string]: number };

export interface Loader {
    load(loadMessage: Message.LoadRequest): Promise<Message.LoadComplete | Message.WorkerMessage>;
}

export interface Calculator {
    calculate(requestMessage: Message.CalculationRequest): Promise<Message.CalculationDone>;
}

export abstract class AsyncCalculator {
    abstract readonly JSONS: Array<Tranche>;
    abstract readonly label: string;
    abstract readonly source: Constant.Source;

    protected async calculatePart(requestMessage: Message.CalculationRequest): Promise<Calculation.CalculationResult> {
        const cellCounts: Map<string, number> = new Map();
        const cellToTranches: Map<string, Array<string>> = new Map();
        let totalTranches: number = 0;
        let totalCompounds: number = 0;
        const pos_x: number | undefined = ORDER.map.get(requestMessage.axis.x);
        const pos_y: number | undefined = ORDER.map.get(requestMessage.axis.y);
        for (const json: Tranche of this.JSONS) {
            for (const [key, val]: readonly [string, number] of Object.entries(json)) {
                let add: boolean = true;
                if (!requestMessage.isInit) {
                    add = requestMessage.notSelectedDimensions.every(dimension => {
                        const pos_param: number | undefined = ORDER.map.get(dimension);
                        const range: State.Range | undefined = requestMessage.possibleValues.get(dimension);
                        const int: number = this.toInt(key.substring(pos_param - 1, pos_param));
                        return State.Range.matches(range, int);
                    });
                } else {
                    totalCompounds += val;
                    totalTranches++;
                }
                if (requestMessage.isInit || add) {
                    const cellId: string = `${key.substring(pos_x - 1, pos_x)}${key.substring(pos_y - 1, pos_y)}`;
                    const cellCountsValue: number | undefined = cellCounts.get(cellId);
                    cellCounts.set(cellId, cellCountsValue === undefined ? val : cellCountsValue + val);
                    const tranchesArray: Array<string> | undefined = cellToTranches.get(cellId);
                    if (tranchesArray === undefined) {
                        cellToTranches.set(cellId, [key]);
                    } else {
                        tranchesArray.push(key);
                    }
                }
            }
        }
        return new Calculation.CalculationResult(cellCounts, cellToTranches, totalTranches, totalCompounds);
    }

    private toInt(letter: string): number {
        switch (letter) {
            case "A":
                return 0;
            case "B":
                return 1;
            case "C":
                return 2;
            case "D":
                return 3;
            case "E":
                return 4;
            case "F":
                return 5;
        }
    }
}