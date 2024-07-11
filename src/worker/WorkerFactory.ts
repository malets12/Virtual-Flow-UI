export namespace JSWorkerFactory {

    export interface NamedWorker {
        readonly name: string;
        readonly worker: Worker;
    }

    abstract class AbstractWorker implements NamedWorker {
        readonly _name: string;
        readonly _worker: Worker;

        protected constructor(fileName: string, callback: (msg: MessageEvent) => Promise<void>, order: number) {
            this._name = `Worker-${order}`;
            this._worker = new Worker(fileName, { name: this._name, type: "module" });
            this._worker.addEventListener("message", (msg: MessageEvent) => callback(msg), false);
        }

        get name(): string {
            return this._name;
        }

        get worker(): Worker {
            return this._worker;
        }
    }

    class NetworkLoader extends AbstractWorker {
        constructor(callback: (msg: MessageEvent) => Promise<void>, order: number) {
            super("worker/FetchAndCountJsWorker.js", callback, order);
        }
    }

    class DatabaseLoader extends AbstractWorker {
        constructor(callback: (msg: MessageEvent) => Promise<void>, order: number) {
            super("worker/LoadFromDbAndCountJsWorker.js", callback, order);
        }
    }

    class DatabaseSaver extends AbstractWorker {
        constructor(callback: (msg: MessageEvent) => Promise<void>) {
            super("worker/SaveToDbJsWorker.js", callback, 999);
        }
    }

    export async function newNetworkLoader(callback: (msg: MessageEvent) => Promise<void>, order: number): Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new NetworkLoader(callback, order));
    }

    export async function newDatabaseLoader(callback: (msg: MessageEvent) => Promise<void>, order: number): Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new DatabaseLoader(callback, order));
    }

    export async function newDatabaseSaver(callback: (msg: MessageEvent) => Promise<void>): Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new DatabaseSaver(callback));
    }

    export async function newServiceWorker(): Promise<ServiceWorkerRegistration> {
        return navigator.serviceWorker.register("ServiceWorker.js", { scope: "/" });
    }
}