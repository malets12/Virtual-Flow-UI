import Message from "./infrastructure/Message.ts";

namespace JSWorkerFactory {

    import SaveMessage = Message.SaveMessage;

    export interface NamedWorker {
        readonly name:string;
        readonly worker:Worker;
    }

    abstract class AbstractWorker implements NamedWorker {
        readonly name:string;
        readonly worker:Worker;

        protected constructor(fileName:string, callback:(msg:any) => Promise<void>, order:number) {
            this.name = "Worker-" + order;
            this.worker = new Worker(fileName, {name: this.name});
            this.worker.addEventListener("message", (msg:any) => callback(msg), false);
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

    export async function newNetworkLoader(callback:(msg:any) => Promise<void>, order:number):Promise<NamedWorker> {
        return Promise.resolve(new NetworkLoader(callback, order));
    }

    export async function newDatabaseLoader(callback:(msg:any) => Promise<void>, order:number):Promise<NamedWorker> {
        return Promise.resolve(new DatabaseLoader(callback, order));
    }

    export async function newDatabaseSaver(callback:(msg:SaveMessage) => Promise<void>):Promise<NamedWorker> {
        return Promise.resolve(new DatabaseSaver(callback));
    }
}