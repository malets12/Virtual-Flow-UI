import {Constant} from "../../Constant.ts";
import {State, Calculation} from "../../State.ts";

namespace Message {
    import WorkerAction = Constant.WorkerAction;
    import AxisValues = State.AxisValues;
    import Limits = State.Limits;
    import Source = Constant.Source;
    import CalculationResult = Calculation.CalculationResult;

    private abstract class ActionMessage {
        readonly action: WorkerAction;

        protected constructor(action: WorkerAction) {
            this.action = action;
        }
    }

    export class LoadRequestMessage extends ActionMessage {
        readonly jsonUrl: string;

        constructor(jsonUrl: string) {
            super(WorkerAction.LOAD);
            this.jsonUrl = jsonUrl;
        }
    }

    export class CalculationRequestMessage extends ActionMessage {
        readonly isInit:boolean;
        readonly axis:AxisValues;
        readonly possibleValues:ReadonlyMap<string, Limits>;
        readonly notSelectedDimensions:ReadonlyArray<string>;

        constructor(isInit:boolean, axis:AxisValues,
                    possibleValues:ReadonlyMap<string, Limits>,
                    notSelectedDimensions:ReadonlyArray<string>) {
            super(WorkerAction.CALCULATE);
            this.isInit = isInit;
            this.axis = axis;
            this.possibleValues = possibleValues;
            this.notSelectedDimensions = notSelectedDimensions;
        }
    }

    export class WorkerMessage extends ActionMessage {
        readonly from: string;

        constructor(action: WorkerAction, from: string) {
            super(action);
            this.from = from;
        }
    }

    export class LoadCompleteMessage extends WorkerMessage {
        readonly source:Source;
        readonly name:string;
        readonly bytes?:ArrayBuffer;

        constructor(from:string, source:Source, name:string, bytes?:ArrayBuffer) {
            super(WorkerAction.LOAD, from);
            this.source = source;
            this.name = name;
            this.bytes = bytes;
        }
    }

    export class CalculationDoneMessage extends WorkerMessage {
        readonly data:CalculationResult;

        constructor(from: string, data: CalculationResult) {
            super(WorkerAction.CALCULATE, from)
            this.data = data;
        }
    }

    export class SaveMessage extends WorkerMessage {
        readonly result:string;

        constructor(from: string, result: string) {
            super(WorkerAction.SAVE_COMPLETE, from);
            this.result = result;
        }
    }
}