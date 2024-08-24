import {Model} from "../../model/Model.ts";
import {AsyncCalculator, Calculator, Database, Loader, Tranche} from "./Abstractions.ts";
import IndexedDB from "./IndexedDB.ts";
import {Message} from "./Message.ts";
import {Constant} from "../../data/Constant.ts";

export default class DatabaseLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS: Array<Tranche>;
    readonly label: string;
    readonly source: Constant.Source;
    private readonly dbWrapper: Database;

    constructor(label: string) {
        super();
        this.JSONS = [];
        this.label = label;
        this.source = Constant.Source.DATABASE;
        this.dbWrapper = new IndexedDB(label);
    }

    async calculate(requestMessage: Message.CalculationRequest): Promise<Message.CalculationDone> {
        return super.calculatePart(requestMessage)
            .then(result => new Message.CalculationDone(this.label, result))
            .finally((): void => this.dbWrapper.close());
    }

    async load(loadMessage: Message.NetworkLoadRequest): Promise<Message.TranchesLoadComplete> {
        return this.dbWrapper.getDB().then(db => this.getDBEntry(db, loadMessage.jsonUrl));
    }

    private async getDBEntry(db: IDBDatabase, key: string): Promise<Message.TranchesLoadComplete> {
        return new Promise((resolve, reject): void => {
            db.transaction(Constant.Database.STORE_NAME_TRANCHES, "readonly")
                .objectStore(Constant.Database.STORE_NAME_TRANCHES)
                .get(key).onsuccess = (event: Event): void => {
                const result: Model.TranchesDBEntry | null = event.target.result;
                if (result !== null) {
                    this.JSONS.push(JSON.parse(new TextDecoder().decode(result.bytes)));
                    resolve(new Message.TranchesLoadComplete(this.label, this.source, key));
                } else {
                    reject(`${this.label}: No JSON for ${key}; ${event.target.error}`);
                }
            };
        });
    }
}