import {Calculation} from "../../compute/Calculation.ts";
import {Constant} from "../../data/Constant.ts";
import {Model} from "../../model/Model.ts";

export namespace Message {
    abstract class ActionMessage {
        readonly action: Constant.Action;

        protected constructor(action: Constant.Action) {
            this.action = action;
        }
    }

    abstract class LoadRequest extends ActionMessage {
        readonly source: Constant.Source;
        readonly dataType: Constant.DataType;

        protected constructor(source: Constant.Source, dataType: Constant.DataType) {
            super(Constant.Action.LOAD);
            this.source = source;
            this.dataType = dataType;
        }
    }

    export class NetworkLoadRequest extends LoadRequest {
        readonly jsonUrl: string;

        constructor(jsonUrl: string) {
            super(Constant.Source.NETWORK, Constant.DataType.TRANCHES);
            this.jsonUrl = jsonUrl;
        }
    }

    export class DBLoadRequest extends LoadRequest {
        constructor() {
            super(Constant.Source.DATABASE, Constant.DataType.INITIAL_STATE);
        }
    }

    export class CalculationRequest extends ActionMessage {
        readonly isInit: boolean;
        readonly axis: Model.AxisValues;
        readonly possibleValues: ReadonlyMap<string, Model.Range>;
        readonly notSelectedDimensions: ReadonlyArray<string>;

        constructor(isInit: boolean, axis: Model.AxisValues,
                    possibleValues: ReadonlyMap<string, Model.Range>,
                    notSelectedDimensions: ReadonlyArray<string>) {
            super(Constant.Action.CALCULATE);
            this.isInit = isInit;
            this.axis = axis;
            this.possibleValues = possibleValues;
            this.notSelectedDimensions = notSelectedDimensions;
        }
    }
    
    export abstract class SaveRequest extends ActionMessage {
        readonly dataType: Constant.DataType;

        protected constructor(dataType: Constant.DataType) {
            super(Constant.Action.SAVE);
            this.dataType = dataType;
        }
    }

    export class SaveTranchesRequest extends SaveRequest {
        readonly jsons: ReadonlyArray<TranchesLoadComplete>;

        constructor(jsons: ReadonlyArray<TranchesLoadComplete>) {
            super(Constant.DataType.TRANCHES);
            this.jsons = jsons;
        }
    }

    export class SaveInitialStateRequest extends SaveRequest {
        readonly state: Calculation.CalculationResult;

        constructor(state: Calculation.CalculationResult) {
            super(Constant.DataType.INITIAL_STATE);
            this.state = state;
        }
    }

    export class WorkerMessage extends ActionMessage {
        readonly from: string;

        constructor(action: Constant.Action, from: string) {
            super(action);
            this.from = from;
        }
    }

    abstract class LoadComplete extends WorkerMessage {
        readonly source: Constant.Source;
        readonly dataType: Constant.DataType;

        protected constructor(action: Constant.Action, from: string, source: Constant.Source, dataType: Constant.DataType) {
            super(action, from);
            this.source = source;
            this.dataType = dataType;
        }
    }

    export class StateLoadComplete extends LoadComplete {
        readonly state: Calculation.CalculationResult;

        constructor(action: Constant.Action, from: string, source: Constant.Source, state: Calculation.CalculationResult) {
            super(action, from, source, Constant.DataType.INITIAL_STATE);
            this.state = state;
        }
    }

    export class TranchesLoadComplete extends LoadComplete {
        readonly name: string;
        readonly bytes?: ArrayBuffer;

        constructor(from: string, source: Constant.Source, name: string, bytes?: ArrayBuffer) {
            super(Constant.Action.LOAD, from, source, Constant.DataType.TRANCHES);
            this.name = name;
            this.bytes = bytes;
        }
    }

    export class CalculationDone extends WorkerMessage {
        readonly data: Calculation.CalculationResult;

        constructor(from: string, data: Calculation.CalculationResult) {
            super(Constant.Action.CALCULATE, from);
            this.data = data;
        }
    }

    export class SavingDone extends WorkerMessage {
        readonly dataType: Constant.DataType;
        readonly result: string;

        constructor(from: string, dataType: Constant.DataType, result: string) {
            super(Constant.Action.SAVE, from);
            this.dataType = dataType;
            this.result = result;
        }
    }
}