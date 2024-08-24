import {Calculation} from "../compute/Calculation.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import type {Database} from "./infrastructure/Abstractions.ts";
import IndexedDB from "./infrastructure/IndexedDB.ts";
import {Message} from "./infrastructure/Message.ts";

const DEFAULT_STATE_PART: string = "default-state-part-";
const RESULT_PROCESSOR: Calculation.ResultProcessor = new Calculation.CalculationResultProcessor();
const dbWrapper: Database = new IndexedDB(self.name, true);

self.addEventListener("message", async (msg: MessageEvent): Promise<void> => {
    dbWrapper.getDB().then(db => {
        const message: Message.DBLoadRequest | Message.SaveRequest = msg.data;
        switch (message.action) {
            case Constant.Action.SAVE: {
                persist(db, message as Message.SaveRequest)
                    .then(result => self.postMessage(result))
                    .catch(error => console.error(error))
                break;
            }
            case Constant.Action.LOAD: {
                load(db, message as Message.DBLoadRequest)
                    .then(result => self.postMessage(result))
                    .catch(error => console.error(error))
                    .finally(() => RESULT_PROCESSOR.clearState());
                break;
            }
        }
    })
}, false);

async function persist(db: IDBDatabase, message: Message.SaveRequest): Promise<Message.SavingDone> {
    return new Promise((resolve, reject): void => {
        const dataType: Constant.DataType = message.dataType;
        const store: string = toStoreName(dataType);
        const transaction: IDBTransaction = db.transaction(store, "readwrite");
        transaction.onerror = (event: Event): void => {
            reject(`Failed to persist '${dataType}' to '${store}': ${event.target.error}`);
        };
        transaction.oncomplete = (): void => {
            resolve(new Message.SavingDone(self.name, dataType, `Successfully saved to '${store}' DB`));
        };
        const objectStore: IDBObjectStore = transaction.objectStore(store);
        objectStore.clear();
        saveAll(message, objectStore);
    });
}

function toStoreName(dataType: Constant.DataType): string {
    switch (dataType) {
        case Constant.DataType.TRANCHES:
            return Constant.Database.STORE_NAME_TRANCHES;
        case Constant.DataType.DEFAULT_STATE:
            return Constant.Database.STORE_NAME_STATE;
    }
}

function saveAll(message: Message.SaveRequest, objectStore: IDBObjectStore): void {
    switch (message.dataType) {
        case Constant.DataType.TRANCHES: {
            const saveTranchesRequest: Message.SaveTranchesRequest = message as Message.SaveTranchesRequest;
            const jsons: ReadonlyArray<Message.TranchesLoadComplete> = saveTranchesRequest.jsons;
            jsons.forEach((entry: Message.TranchesLoadComplete) => objectStore.add(new Model.TranchesDBEntry(entry.name, entry.bytes)));
            break;
        }
        case Constant.DataType.DEFAULT_STATE: {
            const saveInitialStateRequest: Message.SaveInitialStateRequest = message as Message.SaveInitialStateRequest;
            const state: Calculation.CalculationResult = saveInitialStateRequest.state;
            //Split result because of DB limits:
            const map0: Map<string, Array<string>> = new Map();
            const map1: Map<string, Array<string>> = new Map();
            const map2: Map<string, Array<string>> = new Map();
            let rowIndex: number;
            for (const [key, value]: [string, Array<string>] of state.cellToTranches.entries()) {
                rowIndex = key.charCodeAt(1);
                if (rowIndex > 67) { //D,E,F
                    map0.set(key, value);
                } else if (rowIndex === 66) { //B
                    map2.set(key, value);
                } else {
                    map1.set(key, value);
                }
            }
            objectStore.add(new Model.StateDBEntry(`${DEFAULT_STATE_PART}0`, new Calculation.CalculationResult(state.cellCounts, map0, state.totalTranches, state.totalCompounds)));
            objectStore.add(new Model.StateDBEntry(`${DEFAULT_STATE_PART}1`, new Calculation.CalculationResult(new Map(), map1, 0, 0)));
            objectStore.add(new Model.StateDBEntry(`${DEFAULT_STATE_PART}2`, new Calculation.CalculationResult(new Map(), map2, 0, 0)));
            break;
        }
    }
}

async function load(db: IDBDatabase, message: Message.DBLoadRequest): Promise<Message.StateLoadComplete> {
    return Promise.all(
        [`${DEFAULT_STATE_PART}0`, `${DEFAULT_STATE_PART}1`, `${DEFAULT_STATE_PART}2`].map(key => getDBEntry(db, key)
            .then(entry => {
                RESULT_PROCESSOR.addPart(entry.object as Calculation.CalculationResult);
                return RESULT_PROCESSOR.getFinalResult();
            })))
        .then(() => {
            const result: Calculation.CalculationResult | undefined = RESULT_PROCESSOR.getFinalResult();
            if (result === undefined) {
                throw `${message.dataType} is undefined after merging.`;
            } else {
                return new Message.StateLoadComplete(Constant.Action.LOAD, self.name, Constant.Source.DATABASE, result);
            }
        });
}

async function getDBEntry(db: IDBDatabase, key: string): Promise<Model.StateDBEntry> {
    return new Promise((resolve, reject): void => {
        db.transaction(Constant.Database.STORE_NAME_STATE, "readonly")
            .objectStore(Constant.Database.STORE_NAME_STATE)
            .get(key).onsuccess = (event: Event): void => {
            const result: Model.StateDBEntry | null = event.target.result;
            if (result !== null) {
                resolve(result);
            } else {
                reject(`Failed to read '${key}' from '${Constant.Database.STORE_NAME_STATE}' store: ${event.target.error}`);
            }
        };
    });
}