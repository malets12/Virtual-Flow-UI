import Message from "./infrastructure/Message.ts";
import LoadRequestMessage = Message.LoadRequestMessage;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import {Constant} from "../Constant.ts";
import WorkerAction = Constant.WorkerAction;

const worker:DatabaseWorker = new DatabaseWorker(self.name);
self.addEventListener("message", async (msg:any): Promise<void> => {
	const message:LoadRequestMessage|CalculationRequestMessage = msg.data;
	switch (message.action) {
		case WorkerAction.LOAD: {
			worker.load(message as LoadRequestMessage).then(result => self.postMessage(result));
			break;
		}
		case WorkerAction.CALCULATE: {
			worker.calculate(message as CalculationRequestMessage).then(result => self.postMessage(result));
			break;
		}
	}
}, false);