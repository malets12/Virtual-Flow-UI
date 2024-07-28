import {Calculation} from "../../compute/Calculation.ts";
import {Constant} from "../../data/Constant.ts";
import {ORDER} from "../../data/mapping/order.ts";
import {Model} from "../../model/Model.ts";
import {Message} from "./Message.ts";

export type Tranche = { [s: string]: number };

export interface Loader {
    load(loadMessage: Message.NetworkLoadRequest): Promise<Message.TranchesLoadComplete | Message.WorkerMessage>;
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
        const positionX: number | undefined = ORDER.map.get(Model.AxisValues.getValue(requestMessage.axis, Constant.Axis.X));
        const positionY: number | undefined = ORDER.map.get(Model.AxisValues.getValue(requestMessage.axis, Constant.Axis.Y));
        if (positionX === undefined || positionY === undefined) {
            throw `For ${requestMessage.axis} undefined positionParameter`;
        }
        for (const json: Tranche of this.JSONS) {
            for (const [key, val]: readonly [string, number] of Object.entries(json)) {
                let add: boolean = true;
                if (!requestMessage.isInit) {
                    add = requestMessage.notSelectedDimensions.every(dimension => {
                        const positionParameter: number | undefined = ORDER.map.get(dimension);
                        const range: Model.Range | undefined = requestMessage.possibleValues.get(dimension);
                        if (positionParameter === undefined || range === undefined) {
                            throw `For ${dimension} undefined positionParameter or range`;
                        }
                        const int: number = this.toInt(key.substring(positionParameter, positionParameter + 1));
                        return Model.Range.matches(range, int);
                    });
                } else {
                    totalCompounds += val;
                    totalTranches++;
                }
                if (requestMessage.isInit || add) {
                    const cellId: string = `${key.substring(positionX, positionX + 1)}${key.substring(positionY, positionY + 1)}`;
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