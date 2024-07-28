import {Calculation} from "../compute/Calculation.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import {Message} from "./infrastructure/Message.ts";

const INITIAL_STATE_PART: string = "initial_state_part";

self.addEventListener("message", async (msg: MessageEvent): Promise<void> => {
    const message: Message.DBLoadRequest | Message.SaveRequest = msg.data;
    const req: IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
    req.onsuccess = (): void => {
        const db: IDBDatabase = req.result;
        console.log(self.name, "DB init done.");
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
                    .catch(error => console.error(error));
                break;
            }
        }

    };
    req.onerror = (event: Event): void => {
        console.error(self.name, "On DB init.", event.target.errorCode);
    };
    req.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
        const store: IDBObjectStore = event.currentTarget.result.createObjectStore(
            Constant.Database.STORE_NAME, { keyPath: "part" });
        store.createIndex("bytes", "bytes", { unique: false });
    };
}, false);

async function persist(db: IDBDatabase, message: Message.SaveRequest): Promise<Message.SavingDone> {
    return new Promise((resolve) => {
        const transaction: IDBTransaction = db.transaction(Constant.Database.STORE_NAME, "readwrite");
        transaction.onerror = (event: Event): void => {
            resolve(new Message.SavingDone(self.name, message.dataType, `Failed to persist: ${event.target}`));
        };
        transaction.oncomplete = (): void => {
            resolve(new Message.SavingDone(self.name, message.dataType, "Successfully saved to DB."));
        };
        const request: IDBObjectStore = transaction.objectStore(Constant.Database.STORE_NAME);
        request.onsuccess = (): void => {
            console.log(self.name, `${message.dataType} saved to DB.`);
        };
        request.onerror = (event: Event): void => {
            console.error(self.name, `While saving ${message.dataType}.`, event.target);
        };
        request.clear();
        switch (message.dataType) {
            case Constant.DataType.TRANCHES: {
                const saveTranchesRequest: Message.SaveTranchesRequest = message as Message.SaveTranchesRequest;
                const jsons: ReadonlyArray<Message.TranchesLoadComplete> = saveTranchesRequest.jsons;
                jsons.forEach(entry => request.add(new Model.DBEntry(entry.name, entry.bytes)));
                break;
            }
            case Constant.DataType.INITIAL_STATE: {
                const saveInitialStateRequest: Message.SaveInitialStateRequest = message as Message.SaveInitialStateRequest;
                const state: Calculation.CalculationResult = saveInitialStateRequest.state;
                request.add(new Model.DBEntry(INITIAL_STATE_PART, state));
                //TODO check is serialization required
            }
        }
    });
}

async function load(db: IDBDatabase, message: Message.DBLoadRequest): Promise<Message.StateLoadComplete | Message.WorkerMessage> {
    return new Promise((resolve) => {
        db.transaction(Constant.Database.STORE_NAME, "readonly")
            .objectStore(Constant.Database.STORE_NAME)
            .get(INITIAL_STATE_PART).onsuccess = (event: Event): void => {
            const result: Model.DBEntry | null = event.target.result;
            if (result) {
                resolve(new Message.StateLoadComplete(Constant.Action.LOAD, self.name, Constant.Source.DATABASE, result.bytes));
            } else {
                console.error(this.label, "Failed to read initial state from DB.", event.target);
                resolve(new Message.WorkerMessage(Constant.Action.LOAD, self.name));
            }
        };
    });
}