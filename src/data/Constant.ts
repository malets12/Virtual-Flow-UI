export namespace Constant {
    export const ENTRY_ID: string = "container";
    export const PARTS: number = 24;
    export const FIRST_COLUMN_SLIDERS: ReadonlyArray<string> = ["MW", "SlogP", "HBA", "HBD", "RotB", "TPSA", "MR", "logS", "AromProportion"];

    export enum Action { LOAD, CALCULATE, RELOAD, SAVE}

    export enum DataType { TRANCHES = "Tranches", INITIAL_STATE = "Initial State" }

    export enum Database { NAME = "tranches-db", VERSION = 1, STORE_NAME = "tranches-jsons" }

    export enum EventName { SAVE_TO_DATABASE = "save-to-database", CALCULATION_DONE = "calculation-done" }

    export enum Source { NETWORK, DATABASE}

    export enum Axis { X = "x", Y = "y" }

    export enum Counter { COMPOUNDS = "compounds", TRANCHES = "tranches" }
}