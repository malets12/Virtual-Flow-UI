export namespace JSWorkerFactory {

    export interface NamedWorker {
        readonly name:string;
        readonly worker:Worker;
    }

    abstract class AbstractWorker implements NamedWorker {
        private readonly _name:string;
        private readonly _worker:Worker;

        protected constructor(fileName:string, callback:(msg:any) => Promise<void>, order:number) {
            this._name = "Worker-" + order;
            this._worker = new Worker(fileName, {name: this._name});
            this._worker.addEventListener("message", (msg:any) => callback(msg), false);
        }

        get name(): string {
            return this._name;
        }

        get worker(): Worker {
            return this._worker;
        }
    }

    class NetworkLoader extends AbstractWorker {
        constructor(callback:(msg:any) => Promise<void>, order:number) {
            super("FetchAndCountJsWorker.ts", callback, order);
        }
    }

    class DatabaseLoader extends AbstractWorker {
        constructor(callback:(msg:any) => Promise<void>, order:number) {
            super("LoadFromDbAndCountJsWorker.ts", callback, order);
        }
    }

    class DatabaseSaver extends AbstractWorker {
        constructor(callback:(msg:any) => Promise<void>) {
            super("SaveToDbJsWorker.ts", callback, 999);
        }
    }

    export async function newNetworkLoader(callback:(msg:any) => Promise<void>, order:number):Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new NetworkLoader(callback, order));
    }

    export async function newDatabaseLoader(callback:(msg:any) => Promise<void>, order:number):Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new DatabaseLoader(callback, order));
    }

    export async function newDatabaseSaver(callback: (message: any) => Promise<void>):Promise<JSWorkerFactory.NamedWorker> {
        return Promise.resolve(new DatabaseSaver(callback));
    }
}