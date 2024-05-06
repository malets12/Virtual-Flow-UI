import LocalStorage from "../Utils.ts";
import Message, {CalculationRequestMessage, LoadRequestMessage} from "./infrastructure/Message.ts";
import {WORKER_COUNT} from "../Constant.ts";
import JSWorkerFactory from "./WorkerFactory.ts";

namespace Pool {
    import newNetworkLoader = JSWorkerFactory.newNetworkLoader;
    import newDatabaseLoader = JSWorkerFactory.newDatabaseLoader;
    import hasLocalCopy = LocalStorage.hasLocalCopy;
    import NamedWorker = JSWorkerFactory.NamedWorker;
    export const WORKER_POOL:WorkerPool = new WorkerPool();
    export const WORK_QUEUE:WorkQueue = new WorkQueue();


    class WorkerPool {
        private readonly workers:Map<string, Worker>;

        constructor() {
            this.workers = new Map();
        }

        async init(callback:(msg:any) => Promise<void>):Promise<void> {
            const loadFromDB:boolean = hasLocalCopy();
            for (let i:number = 0; i < WORKER_COUNT; i++) {
                (loadFromDB ? newDatabaseLoader(callback, i) : newNetworkLoader(callback, i))
                    .then(namedWorker => {
                        this.workers.set(namedWorker.name, namedWorker.worker);
                        namedWorker.postMessage(WORK_QUEUE.pop())
                    });
            }
        }

        async takeNext(worker:string):Promise<void> {
            return Promise.resolve(WORK_QUEUE.hasMessage())
                .then(has => {
                    if (has) {
                        WORK_QUEUE.pop()
                            .then(msg => this.workers.get(worker).postMessage(msg));
                    }
                });
        }

        async notifyAll(message:CalculationRequestMessage):Promise<void> {
            for (const worker:Worker of this.workers.values()) {
                worker.postMessage(message);
            }
        }
    }

    class WorkQueue {
        private readonly queue:Array<LoadRequestMessage>;

        constructor() {
            this.queue = [];
        }

        async pop():Promise<LoadRequestMessage> {
            return this.queue.pop();
        }

        async push(message:LoadRequestMessage):Promise<void> {
            this.queue.push(message);
        }

        async hasMessage():Promise<boolean> {
            return this.queue.length > 0;
        }
    }

}

namespace Saver {
    import LoadCompleteMessage = Message.LoadCompleteMessage;
    import newDatabaseSaver = JSWorkerFactory.newDatabaseSaver;
    import SaveMessage = Message.SaveMessage;
    import markHasLocalCopy = LocalStorage.markHasLocalCopy;
    export const SAVER = new Saver();

    class Saver {
        private readonly jsonsAsByteArrays:Array<LoadCompleteMessage>;

        constructor() {
            this.jsonsAsByteArrays = [];
        }

        async saveAll():Promise<void> {
            newDatabaseSaver((message:SaveMessage):void => {
                console.log(`${message.from}: ${message.result}`);
                markHasLocalCopy();
            }).then(namedWorker => namedWorker.worker
                .postMessage(this.jsonsAsByteArrays, [this.jsonsAsByteArrays])) //transfer
            //TODO load collections?
        }

        async add(message:LoadCompleteMessage):Promise<void> {
            this.jsonsAsByteArrays.push(message);
        }
    }
}