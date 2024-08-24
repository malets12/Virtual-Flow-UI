import {Constant} from "../../data/Constant.ts";
import type {Database} from "./Abstractions.ts";

export default class IndexedDB implements Database {
    private readonly owner: string;
    private readonly isWriter: boolean;
    private db: IDBDatabase | null;

    constructor(owner: string, isWriter: boolean = false) {
        this.owner = owner;
        this.isWriter = isWriter;
    }

    private async openDB(isWriter: boolean): Promise<IDBDatabase> {
        return new Promise((resolve): void => {
            const req: IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
            req.onsuccess = (): void => {
                resolve(req.result);
            };
            req.onerror = (event: Event): void => {
                console.error(this.owner, `Failed to open DB '${Constant.Database.NAME}' with version '${Constant.Database.VERSION}: Error ${event.target.errorCode}`);
            };
            req.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
                const db: IDBDatabase = event.target.result;
                if (!isWriter) {
                    console.error(this.owner, `Failed to open DB '${db.name}' with version '${db.version}'`);
                    return;
                }
                console.log(this.owner, `Creating DB '${db.name}' with version '${db.version}'`);
                const tranchesStore: IDBObjectStore = db.createObjectStore(
                    Constant.Database.STORE_NAME_TRANCHES, {keyPath: "part"});
                tranchesStore.createIndex("bytes", "bytes", {unique: false});
                const stateStore: IDBObjectStore = db.createObjectStore(
                    Constant.Database.STORE_NAME_STATE, {keyPath: "part"});
                stateStore.createIndex("object", "object", {unique: false});
            };
        });
    }

    getDB(): Promise<IDBDatabase> {
        if (this.db == null) {
            return this.openDB(this.isWriter).then(db => this.db = db);
        }
        return Promise.resolve(this.db);
    }

    close(): void {
        if (this.db !== null) {
            this.db.close();
            this.db = null;
        }
    }
}