import {Calculation} from "../compute/Calculation.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import {Message} from "./infrastructure/Message.ts";

const DEFAULT_STATE_PART: string = "default-state-part-";
const RESULT_PROCESSOR: Calculation.ResultProcessor = new Calculation.CalculationResultProcessor();

self.addEventListener("message", async (msg: MessageEvent): Promise<void> => {
    const message: Message.DBLoadRequest | Message.SaveRequest = msg.data;
    const req: IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
    req.onsuccess = (): void => {
        const db: IDBDatabase = req.result;
        switch (message.action) {
            case Constant.Action.SAVE: {
                persist(db, message as Message.SaveRequest)
                    .then(result => self.postMessage(result))
                    .catch(error => console.error(error));
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

    };
    req.onerror = (event: Event): void => {
        console.error(self.name, "On DB init.", event.target);
    };
    req.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
        const tranchesStore: IDBObjectStore = event.currentTarget.result.createObjectStore(
            Constant.Database.STORE_NAME_TRANCHES, { keyPath: "part" });
        tranchesStore.createIndex("bytes", "bytes", { unique: false });
        const stateStore: IDBObjectStore = event.currentTarget.result.createObjectStore(
            Constant.Database.STORE_NAME_STATE, { keyPath: "part" });
        stateStore.createIndex("object", "object", { unique: false });
    };
}, false);

async function persist(db: IDBDatabase, message: Message.SaveRequest): Promise<Message.SavingDone> {
    return new Promise((resolve, reject): void => {
        const dataType: Constant.DataType = message.dataType;
        const store: string = toStoreName(dataType);
        console.log(self.name, `DB init done for saving ${dataType}.`);
        const transaction: IDBTransaction = db.transaction(store, "readwrite");
        transaction.onerror = (event: Event): void => {
            reject(new Message.SavingDone(self.name, dataType, `Failed to persist to '${store}': ${event.target}`));
        };
        transaction.oncomplete = (): void => {
            resolve(new Message.SavingDone(self.name, dataType, `Successfully saved to '${store}' DB.`));
        };
        const objectStore: IDBObjectStore = transaction.objectStore(store);
        objectStore.onerror = (event: Event): void => {
            reject(self.name, `While saving ${dataType} to '${store}'.`, event.target);
        };
        saveAll(message, objectStore);
    });
}

function toStoreName(dataType: Constant.DataType): string {
    switch (dataType) {
        case Constant.DataType.TRANCHES: return Constant.Database.STORE_NAME_TRANCHES;
        case Constant.DataType.DEFAULT_STATE: return Constant.Database.STORE_NAME_STATE;
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
            //TODO check is serialization required
            break;
        }
    }
}

async function load(db: IDBDatabase, message: Message.DBLoadRequest): Promise<Message.StateLoadComplete> {
    return new Promise((resolve, reject): void => {
        console.log(self.name, `DB init done for loading ${message.dataType}.`);
        const key: IDBKeyRange = IDBKeyRange.bound(`${DEFAULT_STATE_PART}0`, `${DEFAULT_STATE_PART}2`);
        const request: IDBRequest<any[]> = db.transaction(Constant.Database.STORE_NAME_STATE, "readonly")
            .objectStore(Constant.Database.STORE_NAME_STATE)
            .getAll(key);
        request.onsuccess = (): void => {
            for (const part: Model.StateDBEntry of request.result as ReadonlyArray<Model.StateDBEntry>) {
                RESULT_PROCESSOR.addPart(part.object as Calculation.CalculationResult)
                RESULT_PROCESSOR.getFinalResult();
                console.log(part.part); //TODO
            }
            const result: Calculation.CalculationResult | undefined = RESULT_PROCESSOR.getFinalResult();
            if (result === undefined) {
                reject(`${message.dataType} is undefined after merging.`);
            } else {
                resolve(new Message.StateLoadComplete(Constant.Action.LOAD, self.name, Constant.Source.DATABASE, result));
            }
        }
        request.onerror = (event: Event): void => {
            reject(`Failed to read ${message.dataType} from ${Constant.Database.STORE_NAME_STATE} of DB: ${event.target}.`);
        }
    });
}