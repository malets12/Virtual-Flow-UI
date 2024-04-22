export namespace Constant {
    export const PARTS:number = 24
    export const LOCAL_COPY:string = "tranchesLocalCopy";
    export const FIRST_COLUMN_SLIDERS:ReadonlyArray<string> = ["MW", "SlogP", "HBA", "HBD", "RotB", "TPSA", "MR", "logS", "AromProportion"];

    export enum WorkerAction { LOAD, SAVE_KEY, CALCULATE , RELOAD, SAVE_COMPLETE}

    export enum Database { NAME = "tranches-db", VERSION = 1, STORE_NAME = "tranches-jsons" }

    export enum EventName {
        SAVE_TO_DATABASE = "save-to-database",
        CALCULATION_DONE = "calculation-done"
    }

    export enum Source { NETWORK, DATABASE}
}