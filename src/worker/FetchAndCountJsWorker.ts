import {Constant} from "../Constant.ts";
import {Message} from "./infrastructure/Message.ts";
import NetworkLoadCounter from "./infrastructure/NetworkLoadCounter.ts";

const worker:NetworkLoadCounter = new NetworkLoadCounter(self.name);
self.addEventListener("message", async (msg:any): Promise<void> => {
	const message:Message.LoadRequestMessage|Message.CalculationRequestMessage = msg.data;
	switch (message.action) {
		case Constant.WorkerAction.LOAD: {
			worker.load(message as Message.LoadRequestMessage).then(result => self.postMessage(result));
			break;
		}
		case Constant.WorkerAction.CALCULATE: {
			worker.calculate(message as Message.CalculationRequestMessage).then(result => self.postMessage(result));
			break;
		}
	}
}, false);