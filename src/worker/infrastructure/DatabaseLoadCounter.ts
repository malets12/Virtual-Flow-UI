import {AsyncCalculator, Calculator, Loader, Tranche} from "./Abstractions.ts";
import {Message} from "./Message.ts";
import {Constant} from "../../Constant.ts";

export default class DatabaseLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS:Array<Tranche>;
    readonly label:string;
    readonly source:Constant.Source;
    readonly errorMessage:Message.WorkerMessage;

    constructor(label:string) {
        super();
        this.JSONS = [];
        this.label = label;
        this.source = Constant.Source.DATABASE
        this.errorMessage = new Message.WorkerMessage(Constant.WorkerAction.RELOAD, label);
    }

    async calculate(requestMessage:Message.CalculationRequestMessage):Promise<Message.CalculationDoneMessage> {
        return super.calculatePart(requestMessage).then(result => new Message.CalculationDoneMessage(this.label, result));
    }

    async load(loadMessage:Message.LoadRequestMessage):Promise<Message.LoadCompleteMessage | Message.WorkerMessage> {
        const req:IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
        req.onsuccess = ():Promise<Message.LoadCompleteMessage> => {
            const db:IDBDatabase = req.result;
            console.log(`${this.label}: DB init done, looking for ${loadMessage.jsonUrl}`);
            return this.getDBEntry(db, loadMessage.jsonUrl);
        };
        req.onerror = (event:Event):Promise<Message.WorkerMessage> => {
            console.error(`${this.label}: DB init: ${event.target.errorCode}`);
            return Promise.reject(this.errorMessage);
        };
        req.onupgradeneeded = ():Promise<Message.WorkerMessage> => {
            console.error(`${this.label}: no DB ${Constant.Database.NAME}`);
            return Promise.reject(this.errorMessage);
        };
    }

    private async getDBEntry(db:IDBDatabase, key:string):Promise<Message.LoadCompleteMessage | Message.WorkerMessage> {
        const request:IDBRequest = db.transaction(Constant.Database.STORE_NAME, "readonly")
            .objectStore(Constant.Database.STORE_NAME)
            .get(key);
        request.onsuccess = (event:Event):Message.LoadCompleteMessage | Message.WorkerMessage =>  {
            const result = event.target.result; //TODO
            if (result) {
                this.JSONS.push(JSON.parse(new TextDecoder().decode(result.bytes)));
                return new Message.LoadCompleteMessage(this.label, this.source, key);
            }
            else {
                console.error(`${this.label}: no JSON for ${key}`, event.target);
                return this.errorMessage;
            }
        };
    }
}