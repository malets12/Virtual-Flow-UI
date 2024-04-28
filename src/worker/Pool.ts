import LocalStorage from "../Utils.ts";
import Message from "./infrastructure/Message.ts";
import {WORKER_COUNT} from "../Constant.ts";

namespace WorkerPool {
    import newNetworkLoader = JSWorkerFactory.newNetworkLoader;
    import newDatabaseLoader = JSWorkerFactory.newDatabaseLoader;
    import newDatabaseSaver = JSWorkerFactory.newDatabaseSaver;
    import markHasLocalCopy = LocalStorage.markHasLocalCopy;
    import SaveMessage = Message.SaveMessage;
    import LoadCompleteMessage = Message.LoadCompleteMessage;
    import hasLocalCopy = LocalStorage.hasLocalCopy;

    export const WORKER_POOL:WorkerPool = new WorkerPool();
    export const WORK_QUEUE:WorkQueue = new WorkQueue();


    class WorkerPool {
        private readonly workers:ReadonlyMap<string, Worker>;

        constructor() {
            this.workers = new Map();
        }

        init(callback:(msg:any) => Promise<void>):void {
            const loadFromDB:boolean = hasLocalCopy();
            for (let i:number = 0; i < WORKER_COUNT; i++) {
                (loadFromDB ? newDatabaseLoader(callback, i) : newNetworkLoader(callback, i))
                    .then(namedWorker => {
                        this.workers.set(namedWorker.name, namedWorker.worker);
                        worker.postMessage(WORK_QUEUE.pop())
                    });
            }
        }

        takeNext(worker:string):void {
            if (WORK_QUEUE.hasMessage()) {
                this.workers.get(worker).postMessage(WORK_QUEUE.pop());
            }
        }

        notifyAll(message:CalculationRequest):void {
            for (const worker:Worker of this.workers.values()) {
                worker.postMessage(message);
            }
        }
    }

    class WorkQueue {
        private readonly queue:Array<LoadMessage>;

        constructor() {
            this.queue = [];
        }

        pop():LoadMessage {
            return this.queue.pop();
        }

        push(message:LoadMessage):void {
            this.queue.push(message);
        }

        hasMessage():boolean {
            return this.queue.length > 0;
        }
    }

    export async function saveToDB(jsonsAsByteArrays:Array<LoadCompleteMessage>):Promise<void> {
        newDatabaseSaver((message:SaveMessage):void => {
            console.log(`${message.from}: ${message.result}`);
            markHasLocalCopy();
        }).then(namedWorker => namedWorker.worker
            .postMessage(jsonsAsByteArrays, [jsonsAsByteArrays])) //transfer
        //TODO load collections?
    }

}