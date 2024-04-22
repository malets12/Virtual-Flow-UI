import {WorkerAction} from "../Enum.ts";
import {CalculationRequestMessage, LoadMessage} from "./Message.ts";
import type {NetworkLoadCounter} from "./NetworkLoadCounter.ts";

const worker:NetworkLoadCounter = new NetworkLoadCounter(self.name);
self.addEventListener("message", async (msg:any): Promise<void> => {
	const message:LoadMessage|CalculationRequestMessage = msg.data;
	switch (message.action) {
		case WorkerAction.LOAD: {
			worker.load(message as LoadMessage).then(result => self.postMessage(result));
			break;
		}
		case WorkerAction.CALCULATE: {
			worker.calculate(message as CalculationRequestMessage).then(result => self.postMessage(result));
			break;
		}
	}
}, false);