import {Constant} from "../../Constant.ts";
import {State, Calculation} from "../../State.ts";

export namespace Message {
    import WorkerAction = Constant.WorkerAction;
    import AxisValues = State.AxisValues;
    import Limits = State.Limits;
    import Source = Constant.Source;
    import CalculationResult = Calculation.CalculationResult;

    abstract class ActionMessage {
        private readonly _action: WorkerAction;

        protected constructor(action: WorkerAction) {
            this._action = action;
        }

        get action(): Constant.WorkerAction {
            return this._action;
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
        private readonly _isInit:boolean;
        private readonly _axis:AxisValues;
        private readonly _possibleValues:ReadonlyMap<string, Limits>;
        private readonly _notSelectedDimensions:ReadonlyArray<string>;

        constructor(isInit:boolean, axis:AxisValues,
                    possibleValues:ReadonlyMap<string, Limits>,
                    notSelectedDimensions:ReadonlyArray<string>) {
            super(WorkerAction.CALCULATE);
            this._isInit = isInit;
            this._axis = axis;
            this._possibleValues = possibleValues;
            this._notSelectedDimensions = notSelectedDimensions;
        }


        get isInit(): boolean {
            return this._isInit;
        }

        get axis(): AxisValues {
            return this._axis;
        }

        get possibleValues(): ReadonlyMap<string, Limits> {
            return this._possibleValues;
        }

        get notSelectedDimensions(): ReadonlyArray<string> {
            return this._notSelectedDimensions;
        }
    }

    export class WorkerMessage extends ActionMessage {
        private readonly _from: string;

        constructor(action: WorkerAction, from: string) {
            super(action);
            this._from = from;
        }

        get from(): string {
            return this._from;
        }
    }

    export class LoadCompleteMessage extends WorkerMessage {
        private readonly _source:Source;
        private readonly _name:string;
        private readonly _bytes?:ArrayBuffer;

        constructor(from:string, source:Source, name:string, bytes?:ArrayBuffer) {
            super(WorkerAction.LOAD, from);
            this._source = source;
            this._name = name;
            this._bytes = bytes;
        }


        get source(): Constant.Source {
            return this._source;
        }

        get name(): string {
            return this._name;
        }

        get bytes(): ArrayBuffer|undefined {
            return this._bytes;
        }
    }

    export class CalculationDoneMessage extends WorkerMessage {
        private readonly _data:CalculationResult;

        constructor(from: string, data: CalculationResult) {
            super(WorkerAction.CALCULATE, from)
            this._data = data;
        }

        get data(): CalculationResult {
            return this._data;
        }
    }

    export class SaveMessage extends WorkerMessage {
        private readonly _result:string;

        constructor(from: string, result: string) {
            super(WorkerAction.SAVE_COMPLETE, from);
            this._result = result;
        }

        get result(): string {
            return this._result;
        }
    }
}