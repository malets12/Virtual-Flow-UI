import {Constant} from "../data/Constant.ts";
import DatabaseLoadCounter from "./infrastructure/DatabaseLoadCounter.ts";
import {Message} from "./infrastructure/Message.ts";

const worker: DatabaseLoadCounter = new DatabaseLoadCounter(self.name);
self.addEventListener("message", async (msg: any): Promise<void> => {
    const message: Message.LoadRequest | Message.CalculationRequest = msg.data;
    switch (message.action) {
        case Constant.WorkerAction.LOAD: {
            worker.load(message as Message.LoadRequest)
                .then(result => self.postMessage(result))
                .catch(error => console.error(error));
            break;
        }
        case Constant.WorkerAction.CALCULATE: {
            worker.calculate(message as Message.CalculationRequest)
                .then(result => self.postMessage(result))
                .catch(error => console.error(error));
            break;
        }
    }
}, false);