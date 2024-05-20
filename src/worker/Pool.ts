import {LocalStorage} from "../component/LocalStorage.ts";
import {Constant} from "../Constant.ts";
import {Message} from "./infrastructure/Message.ts";
import {JSWorkerFactory} from "./WorkerFactory.ts";

export namespace Pool {
    export const WORKER_POOL:WorkerPool = new WorkerPool();
    export const WORK_QUEUE:WorkQueue = new WorkQueue();

    class WorkerPool {
        private readonly workers:Map<string, Worker> = new Map();

        async init(callback:(msg:any) => Promise<void>):Promise<void> {
            const loadFromDB:boolean = LocalStorage.hasLocalCopy();
            for (let i:number = 0; i < Constant.WORKER_COUNT; i++) {
                (loadFromDB ? JSWorkerFactory.newDatabaseLoader(callback, i) : JSWorkerFactory.newNetworkLoader(callback, i))
                    .then(namedWorker => {
                        this.workers.set(namedWorker.name, namedWorker.worker);
                        namedWorker.worker.postMessage(WORK_QUEUE.pop())
                    });
            }
        }

        async takeNext(workerName: string): Promise<void> {
            return WORK_QUEUE.hasMessage().then(has => {
                if (has) {
                    WORK_QUEUE.pop()
                        .then(msg => {
                            const worker: Worker | undefined = this.workers.get(workerName);
                            if (msg !== undefined && worker !== undefined) {
                                worker.postMessage(msg);
                            }
                        });
                }
            });
        }

        async notifyAll(message:Message.CalculationRequest):Promise<void> {
            for (const worker:Worker of this.workers.values()) {
                worker.postMessage(message);
            }
        }
    }

    class WorkQueue {
        private readonly queue:Array<Message.LoadRequest> = [];

        async pop():Promise<Message.LoadRequest|undefined> {
            return this.queue.pop();
        }

        async push(message:Message.LoadRequest):Promise<void> {
            this.queue.push(message);
        }

        async hasMessage():Promise<boolean> {
            return this.queue.length > 0;
        }
    }

}

export namespace Saver {
    export const SAVER:BackgroundSaver = new BackgroundSaver();

    class BackgroundSaver {
        private readonly jsonsAsByteArrays:Array<Message.LoadComplete> = [];

        async saveAll():Promise<void> {
            JSWorkerFactory.newDatabaseSaver(async (message:any):Promise<void> => {
                console.log(`${message.from}: ${message.result}`);
                LocalStorage.markHasLocalCopy();
            }).then(namedWorker => namedWorker.worker.postMessage(this.jsonsAsByteArrays))
                .finally(() => this.jsonsAsByteArrays.length = 0);
            //TODO? load collections
        }

        async add(message:Message.LoadComplete):Promise<void> {
            this.jsonsAsByteArrays.push(message);
        }
    }
}