import {Constant} from "../../Constant.ts";
import {State, Calculation} from "../../State.ts";

export namespace Message {
    abstract class ActionMessage {
        readonly action: Constant.WorkerAction;

        protected constructor(action: Constant.WorkerAction) {
            this.action = action;
        }
    }

    export class LoadRequest extends ActionMessage {
        readonly jsonUrl: string;

        constructor(jsonUrl: string) {
            super(Constant.WorkerAction.LOAD);
            this.jsonUrl = jsonUrl;
        }
    }

    export class CalculationRequest extends ActionMessage {
        readonly isInit:boolean;
        readonly axis:State.AxisValues;
        readonly possibleValues:ReadonlyMap<string, State.Range>;
        readonly notSelectedDimensions:ReadonlyArray<string>;

        constructor(isInit:boolean, axis:State.AxisValues,
                    possibleValues:ReadonlyMap<string, State.Range>,
                    notSelectedDimensions:ReadonlyArray<string>) {
            super(Constant.WorkerAction.CALCULATE);
            this.isInit = isInit;
            this.axis = axis;
            this.possibleValues = possibleValues;
            this.notSelectedDimensions = notSelectedDimensions;
        }
    }

    export class WorkerMessage extends ActionMessage {
        readonly from: string;

        constructor(action: Constant.WorkerAction, from: string) {
            super(action);
            this.from = from;
        }
    }

    export class LoadComplete extends WorkerMessage {
        readonly source:Constant.Source;
        readonly name:string;
        readonly bytes?:ArrayBuffer;

        constructor(from:string, source:Constant.Source, name:string, bytes?:ArrayBuffer) {
            super(Constant.WorkerAction.LOAD, from);
            this.source = source;
            this.name = name;
            this.bytes = bytes;
        }
    }

    export class CalculationDone extends WorkerMessage {
        readonly data:Calculation.CalculationResult;

        constructor(from: string, data: Calculation.CalculationResult) {
            super(Constant.WorkerAction.CALCULATE, from)
            this.data = data;
        }
    }

    export class Save extends WorkerMessage {
        readonly result:string;

        constructor(from: string, result: string) {
            super(Constant.WorkerAction.SAVE_COMPLETE, from);
            this.result = result;
        }
    }
}