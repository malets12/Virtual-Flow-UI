import {Constant} from "../../Constant.ts";
import Source = Constant.Source;
import CalculationResult = State.CalculationResult;
import Message from "./Message.ts";
import LoadRequestMessage = Message.LoadRequestMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import WorkerMessage = Message.WorkerMessage;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import {KEY} from "../../data/mapping/key.ts";

export interface Tranche {
    readonly [key: string]: number;
}

export interface Loader {
    load(loadMessage:LoadRequestMessage):Promise<LoadCompleteMessage>|Promise<WorkerMessage>;
}

export interface Calculator {
    calculate(requestMessage:CalculationRequestMessage):Promise<CalculationDoneMessage>;
}

export abstract class AsyncCalculator implements Calculator {
    abstract readonly JSONS:Array<Tranche>;
    abstract readonly label:string;
    abstract readonly source:Source;

    protected async calculatePart(requestMessage:CalculationRequestMessage):Promise<CalculationResult> {
        const cellCounts:Map<string, number> = new Map();
        const tranches_map:Map<string, Array<string>> = new Map();
        let totalTranches:number = 0;
        let totalCompounds:number = 0;
        const pos_x:number = KEY.map.get(requestMessage.axis.x);
        const pos_y:number = KEY.map.get(requestMessage.axis.y);
        for (const json: Tranche of this.JSONS) {
            for (const entry:readonly [string, number] of Object.entries(json)) {
                const key: string = entry[0];
                const val: number = entry[1];
                const cellId: string = key.substring(pos_x - 1, pos_x) + key.substring(pos_y - 1, pos_y);
                let add: boolean = true;
                if (!requestMessage.isInit) {
                    add = requestMessage.notSelectedDimensions.every(dimension => {
                        const pos_param:number = KEY.map.get(dimension);
                        const range = requestMessage.possibleValues.get(dimension);
                        const int:number = this.toInt(key.substring(pos_param - 1, pos_param));
                        return int >= range.min && int < range.max;
                    });
                } else {
                    totalCompounds = totalCompounds + val;
                    totalTranches++;
                }
                if (requestMessage.isInit || add) {
                    if (cellCounts.has(cellId)) {
                        cellCounts.set(cellId, cellCounts.get(cellId) + val);
                    } else {
                        cellCounts.set(cellId, val);
                    }
                    if (tranches_map.has(cellId)) {
                        tranches_map.get(cellId).push(key);
                    } else {
                        tranches_map.set(cellId, [key]);
                    }
                }
            }
        }
        return new CalculationResult(cellCounts, tranches_map, totalTranches, totalCompounds);
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