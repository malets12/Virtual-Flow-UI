import {Constant} from "../data/Constant.ts";
import {Message} from "./infrastructure/Message.ts";
import NetworkLoadCounter from "./infrastructure/NetworkLoadCounter.ts";

const worker: NetworkLoadCounter = new NetworkLoadCounter(self.name);
self.addEventListener("message", async (msg: MessageEvent): Promise<void> => {
    const message: Message.DBLoadRequest | Message.CalculationRequest = msg.data;
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