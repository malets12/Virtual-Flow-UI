import {Constant} from "../../Constant.ts";
import {State, Calculation} from "../../State.ts";

export namespace Message {
    abstract class ActionMessage {
        private readonly _action: Constant.WorkerAction;

        protected constructor(action: Constant.WorkerAction) {
            this._action = action;
        }

        get action(): Constant.WorkerAction {
            return this._action;
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
        private readonly _isInit:boolean;
        private readonly _axis:State.AxisValues;
        private readonly _possibleValues:ReadonlyMap<string, State.Range>;
        private readonly _notSelectedDimensions:ReadonlyArray<string>;

        constructor(isInit:boolean, axis:State.AxisValues,
                    possibleValues:ReadonlyMap<string, State.Range>,
                    notSelectedDimensions:ReadonlyArray<string>) {
            super(Constant.WorkerAction.CALCULATE);
            this._isInit = isInit;
            this._axis = axis;
            this._possibleValues = possibleValues;
            this._notSelectedDimensions = notSelectedDimensions;
        }


        get isInit(): boolean {
            return this._isInit;
        }

        get axis(): State.AxisValues {
            return this._axis;
        }

        get possibleValues(): ReadonlyMap<string, State.Range> {
            return this._possibleValues;
        }

        get notSelectedDimensions(): ReadonlyArray<string> {
            return this._notSelectedDimensions;
        }
    }

    export class WorkerMessage extends ActionMessage {
        private readonly _from: string;

        constructor(action: Constant.WorkerAction, from: string) {
            super(action);
            this._from = from;
        }

        get from(): string {
            return this._from;
        }
    }

    export class LoadComplete extends WorkerMessage {
        private readonly _source:Constant.Source;
        private readonly _name:string;
        private readonly _bytes?:ArrayBuffer;

        constructor(from:string, source:Constant.Source, name:string, bytes?:ArrayBuffer) {
            super(Constant.WorkerAction.LOAD, from);
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

    export class CalculationDone extends WorkerMessage {
        private readonly _data:Calculation.CalculationResult;

        constructor(from: string, data: Calculation.CalculationResult) {
            super(Constant.WorkerAction.CALCULATE, from)
            this._data = data;
        }

        get data(): Calculation.CalculationResult {
            return this._data;
        }
    }

    export class Save extends WorkerMessage {
        private readonly _result:string;

        constructor(from: string, result: string) {
            super(Constant.WorkerAction.SAVE_COMPLETE, from);
            this._result = result;
        }

        get result(): string {
            return this._result;
        }
    }
}