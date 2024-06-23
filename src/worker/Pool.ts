import {LocalStorage} from "../component/LocalStorage.ts";
import {Constant} from "../data/Constant.ts";
import {Message} from "./infrastructure/Message.ts";
import {JSWorkerFactory} from "./WorkerFactory.ts";

export namespace Pool {

    export interface WorkQueue {
        pop(): Promise<Message.LoadRequest | undefined>;
        push(message: Message.LoadRequest): Promise<void>;
        hasMessage(): Promise<boolean>;
    }

    export interface WorkerPool {
        init(callback: (msg: any) => Promise<void>): Promise<void>;
        takeNext(workerName: string): Promise<void>;
        notifyAll(message: Message.CalculationRequest): Promise<void>;
    }

    class MessageWorkQueue implements WorkQueue {
        private readonly queue: Array<Message.LoadRequest> = [];

        async pop(): Promise<Message.LoadRequest | undefined> {
            return this.queue.pop();
        }

        async push(message: Message.LoadRequest): Promise<void> {
            this.queue.push(message);
        }

        async hasMessage(): Promise<boolean> {
            return this.queue.length > 0;
        }
    }

    export const WORK_QUEUE: WorkQueue = new MessageWorkQueue();

    class AsyncWorkerPool {
        private readonly workers: Map<string, Worker> = new Map();

        async init(callback: (msg: any) => Promise<void>): Promise<void> {
            const WORKER_COUNT: number = window.navigator.hardwareConcurrency;
            const loadFromDB: boolean = LocalStorage.hasLocalCopy();
            const maxPartsPerWorker: number = Constant.PARTS / WORKER_COUNT;
            let workCounter: number = 0;
            for (let i: number = 0; i < WORKER_COUNT; i++) {
                (loadFromDB ? JSWorkerFactory.newDatabaseLoader(callback, i) : JSWorkerFactory.newNetworkLoader(callback, i))
                    .then(namedWorker => {
                        this.workers.set(namedWorker.name, namedWorker.worker);
                        for (let part: number = 0; part < maxPartsPerWorker; part++) {
                            AsyncWorkerPool.postMessage(namedWorker);
                            workCounter++;
                        }
                        while (i === WORKER_COUNT - 1 && workCounter !== Constant.PARTS) {
                            AsyncWorkerPool.postMessage(namedWorker);
                            workCounter++;
                        }
                    });
            }
        }

        private static postMessage(namedWorker: JSWorkerFactory.NamedWorker): void {
            WORK_QUEUE.pop()
                .then(msg => {
                    if (msg !== undefined) {
                        namedWorker.worker.postMessage(msg);
                    }
                });
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

        async notifyAll(message: Message.CalculationRequest): Promise<void> {
            for (const worker: Worker of this.workers.values()) {
                worker.postMessage(message);
            }
        }
    }

    export const WORKER_POOL: WorkerPool = new AsyncWorkerPool();
}