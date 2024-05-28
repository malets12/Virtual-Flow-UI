import {AsyncCalculator, Calculator, Loader, Tranche} from "./Abstractions.ts";
import {Message} from "./Message.ts";
import {Constant} from "../../Constant.ts";

export default class DatabaseLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS: Array<Tranche>;
    readonly label: string;
    readonly source: Constant.Source;
    readonly errorMessage: Message.WorkerMessage;

    constructor(label: string) {
        super();
        this.JSONS = [];
        this.label = label;
        this.source = Constant.Source.DATABASE
        this.errorMessage = new Message.WorkerMessage(Constant.WorkerAction.RELOAD, label);
    }

    async calculate(requestMessage: Message.CalculationRequest): Promise<Message.CalculationDone> {
        return super.calculatePart(requestMessage).then(result => new Message.CalculationDone(this.label, result));
    }

    async load(loadMessage: Message.LoadRequest): Promise<Message.LoadComplete | Message.WorkerMessage> {
        return new Promise((resolve) => {
            const req: IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
            req.onsuccess = (): void => {
                const db: IDBDatabase = req.result;
                console.log(this.label, `DB init done, looking for ${loadMessage.jsonUrl}`);
                resolve(this.getDBEntry(db, loadMessage.jsonUrl));
            };
            req.onerror = (event: Event): void => {
                console.error(this.label, `DB init: ${event.target.errorCode}`);
                resolve(this.errorMessage);
            };
            req.onupgradeneeded = (): void => {
                console.error(this.label, `No DB ${Constant.Database.NAME}`);
                resolve(this.errorMessage);
            };
        });
    }

    private async getDBEntry(db: IDBDatabase, key: string): Promise<Message.LoadComplete | Message.WorkerMessage> {
        return new Promise((resolve) => {
            db.transaction(Constant.Database.STORE_NAME, "readonly")
                .objectStore(Constant.Database.STORE_NAME)
                .get(key).onsuccess = (event: Event): void => {
                const result = event.target.result;
                if (result) {
                    this.JSONS.push(JSON.parse(new TextDecoder().decode(result.bytes)));
                    resolve(new Message.LoadComplete(this.label, this.source, key));
                } else {
                    console.error(this.label, `No JSON for ${key}`, event.target);
                    resolve(this.errorMessage);
                }
            };
        });
    }
}