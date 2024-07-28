import {Constant} from "../data/Constant.ts";
import DatabaseLoadCounter from "./infrastructure/DatabaseLoadCounter.ts";
import {Message} from "./infrastructure/Message.ts";

const worker: DatabaseLoadCounter = new DatabaseLoadCounter(self.name);
self.addEventListener("message", async (msg: MessageEvent): Promise<void> => {
    const message: Message.NetworkLoadRequest | Message.CalculationRequest = msg.data; //TODO rename load request
    switch (message.action) {
        case Constant.Action.LOAD: {
            worker.load(message as Message.NetworkLoadRequest)
                .then(result => self.postMessage(result))
                .catch(error => console.error(error));
            break;
        }
        case Constant.Action.CALCULATE: {
            worker.calculate(message as Message.CalculationRequest)
                .then(result => self.postMessage(result))
                .catch(error => console.error(error));
            break;
        }
    }
}, false);