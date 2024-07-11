import {LocalStorage} from "../component/LocalStorage.ts";
import {Message} from "./infrastructure/Message.ts";
import {JSWorkerFactory} from "./WorkerFactory.ts";

export namespace Saver {
    class BackgroundSaver {
        private readonly jsonsAsByteArrays: Array<Message.LoadComplete> = [];

        async saveAll(): Promise<void> {
            return JSWorkerFactory.newDatabaseSaver(async (message: MessageEvent): Promise<void> => {
                console.log(message.data.from, message.data.result);
                LocalStorage.markHasLocalCopy();
            }).then(namedWorker => namedWorker.worker.postMessage(this.jsonsAsByteArrays))
                .then(() => JSWorkerFactory.newServiceWorker())
                .catch(error => console.error(error))
                .finally(() => this.jsonsAsByteArrays.length = 0);
            //TODO? load collections
        }

        async add(message: Message.LoadComplete): Promise<void> {
            this.jsonsAsByteArrays.push(message);
        }
    }

    export const SAVER: BackgroundSaver = new BackgroundSaver();
}