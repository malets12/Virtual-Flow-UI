export namespace Constant {
    export const PARTS:number = 24;
    export const WORKER_COUNT:number = window.navigator.hardwareConcurrency;
    export const FIRST_COLUMN_SLIDERS:ReadonlyArray<string> = ["MW", "SlogP", "HBA", "HBD", "RotB", "TPSA", "MR", "logS", "AromProportion"];

    export function sliderNameToPoints(name:string):ReadonlyArray<number> {
        switch (name) {
            case "EnamineCC": case "SulfurAC": case "HalogenAC": case "DoubleBondIsomer": return [3, 442];
            case "ChiralCenter": case "NegCharge": case "PosCharge": return [3, 219, 435];
            case "MW": return [3, 101, 192, 283, 379];
            case "HBD": return [3, 108, 212, 317, 421];
            case "MR": return [3, 105, 202, 297, 393];
            case "AromProportion": return [3, 105, 202, 300, 394];
            case "HBA": case "RotB": return [3, 85, 168, 250, 330, 407];
            case "TPSA": return [3, 82, 158, 230, 299, 373];
            case "logS": return [0, 76, 154, 232, 309, 387];
            case "FormCharge": return [0, 76, 154, 232, 315, 396];
            case "Fsp3": return [3, 83, 158, 233, 309, 381];
            case "SlogP": return [0, 63, 130, 197, 265, 332, 400];
            default: throw `Illegal key '${key}' !`;
        }
    }

    export enum WorkerAction { LOAD, SAVE_KEY, CALCULATE , RELOAD, SAVE_COMPLETE}

    export enum Database { NAME = "tranches-db", VERSION = 1, STORE_NAME = "tranches-jsons" }

    export enum EventName { SAVE_TO_DATABASE = "save-to-database", CALCULATION_DONE = "calculation-done" }

    export enum Source { NETWORK, DATABASE}

    export enum Axis { X = "x", Y = "y" }

    export enum Counter { COMPOUNDS = "compounds", TRANCHES = "tranches" }
}