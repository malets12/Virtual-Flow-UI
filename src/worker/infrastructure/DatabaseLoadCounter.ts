import {AsyncCalculator, Calculator, Loader, Tranche} from "./Abstractions.ts";
import {Message} from "./Message.ts";
import {Constant} from "../../Constant.ts";
import Source = Constant.Source;
import WorkerAction = Constant.WorkerAction;
import Database = Constant.Database;
import WorkerMessage = Message.WorkerMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import LoadRequestMessage = Message.LoadRequestMessage;

export default class DatabaseLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS:Array<Tranche>;
    readonly label:string;
    readonly source:Source;
    readonly errorMessage:WorkerMessage;

    constructor(label:string) {
        super();
        this.JSONS = [];
        this.label = label;
        this.source = Source.DATABASE
        this.errorMessage = new WorkerMessage(WorkerAction.RELOAD, label);
    }

    async calculate(requestMessage:CalculationRequestMessage):Promise<CalculationDoneMessage> {
        return super.calculatePart(requestMessage).then(result => new CalculationDoneMessage(this.label, result));
    }

    async load(loadMessage:LoadRequestMessage):Promise<LoadCompleteMessage | WorkerMessage> {
        const req:IDBOpenDBRequest = indexedDB.open(Database.NAME, Database.VERSION);
        req.onsuccess = ():void => {
            const db:IDBDatabase = req.result;
            console.log(`${this.label}: DB init done, looking for ${loadMessage.jsonUrl}`);
            return this.getDBEntry(db, key);
        };
        req.onerror = (event:Event):void => {
            console.error(`${this.label}: DB init: ${event.target.errorCode}`);
            return this.errorMessage;
        };
        req.onupgradeneeded = ():void => {
            console.error(`${this.label}: no DB ${Database.NAME}`);
            return this.errorMessage;
        };
    }

    private async getDBEntry(db:IDBDatabase, key:string):Promise<LoadCompleteMessage | WorkerMessage> {
        const request:IDBRequest = db.transaction(Database.STORE_NAME, "readonly")
            .objectStore(Database.STORE_NAME)
            .get(key);
        request.onsuccess = (event:Event):void =>  {
            const result = event.target.result;
            if (result) {
                this.JSONS.push(JSON.parse(new TextDecoder().decode(result.bytes)));
                return new LoadCompleteMessage(this.label, this.source, key);
            }
            else {
                console.error(`${this.label}: no JSON for ${key}`, event.target);
                return this.errorMessage;
            }
        };
    }
}