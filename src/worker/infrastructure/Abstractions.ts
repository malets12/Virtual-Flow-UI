import {Constant} from "../../Constant.ts";
import {ORDER} from "../../data/mapping/order.ts";
import {Calculation, State} from "../../State.ts";
import {Message} from "./Message.ts";
import CalculationResult = Calculation.CalculationResult;
import Axis = Constant.Axis;
import Source = Constant.Source;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import LoadRequestMessage = Message.LoadRequestMessage;
import WorkerMessage = Message.WorkerMessage;
import Limits = State.Limits;

export interface Tranche {
    readonly [key:string]:number;
}

export interface Loader {
    load(loadMessage:LoadRequestMessage):Promise<LoadCompleteMessage>|Promise<WorkerMessage>;
}

export interface Calculator {
    calculate(requestMessage:CalculationRequestMessage):Promise<CalculationDoneMessage>;
}

export abstract class AsyncCalculator {
    abstract readonly JSONS:Array<Tranche>;
    abstract readonly label:string;
    abstract readonly source:Source;

    protected async calculatePart(requestMessage:CalculationRequestMessage):Promise<CalculationResult> {
        const cellCounts:Map<string, number> = new Map();
        const cellToTranches:Map<string, Array<string>> = new Map();
        let totalTranches:number = 0;
        let totalCompounds:number = 0;
        const pos_x:number|undefined = ORDER.map.get(requestMessage.axis.getValue(Axis.X));
        const pos_y:number|undefined = ORDER.map.get(requestMessage.axis.getValue(Axis.Y));
        for (const json: Tranche of this.JSONS) {
            for (const entry:readonly [string, number] of Object.entries(json)) {
                const key:string = entry[0];
                const val:number = entry[1];
                const cellId:string = key.substring(pos_x - 1, pos_x) + key.substring(pos_y - 1, pos_y);
                let add:boolean = true;
                if (!requestMessage.isInit) {
                    add = requestMessage.notSelectedDimensions.every(dimension => {
                        const pos_param:number|undefined = ORDER.map.get(dimension);
                        const limits:Limits|undefined = requestMessage.possibleValues.get(dimension);
                        const int:number = this.toInt(key.substring(pos_param - 1, pos_param));
                        return limits.matches(int);
                    });
                } else {
                    totalCompounds = totalCompounds + val;
                    totalTranches++;
                }
                if (requestMessage.isInit || add) {
                    const cellCountsValue:number|undefined = cellCounts.get(cellId);
                    if (cellCountsValue === undefined) {
                        cellCounts.set(cellId, val);
                    } else {
                        cellCounts.set(cellId, cellCountsValue + val);
                    }
                    const tranchesArray:Array<string>|undefined = cellToTranches.get(cellId);
                    if (tranchesArray === undefined) {
                        cellToTranches.set(cellId, [key]);
                    } else {
                        tranchesArray.push(key);
                    }
                }
            }
        }
        return new CalculationResult(cellCounts, cellToTranches, totalTranches, totalCompounds);
    }

    private toInt(letter:string):number {
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