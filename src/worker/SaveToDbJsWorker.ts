import {Constant} from "../Constant.ts";
import {Message} from "./infrastructure/Message.ts";

self.addEventListener("message", async (msg:any):Promise<void> => {
	const req:IDBOpenDBRequest = indexedDB.open(Constant.Database.NAME, Constant.Database.VERSION);
	req.onsuccess = ():void => {
		const db:IDBDatabase = req.result;
		console.log(`${self.name}: DB init done.`);
		addDBEntry(db, msg.data);
	};
	req.onerror = (event:Event):void => {
		console.error(`${self.name}: DB init.`, event.target.errorCode);
	};
	req.onupgradeneeded = (event:IDBVersionChangeEvent):void => {
		const store:IDBObjectStore = event.currentTarget.result.createObjectStore(
			Constant.Database.STORE_NAME, { keyPath: "part" });
		store.createIndex("bytes", "bytes", { unique: false });
	};
}, false);

function addDBEntry(db:IDBDatabase, jsons:ReadonlyArray<Message.LoadCompleteMessage>):void {
	const transaction:IDBTransaction = db.transaction(Constant.Database.STORE_NAME, "readwrite");
	transaction.oncomplete = ():void => {
		self.postMessage(new Message.SaveMessage(self.name, "Successfully saved to DB."));
		self.close();
	};
	transaction.onerror = (event:Event):void => {
		console.error(`${self.name}: while saving tranches.`, event.target);
		self.close();
	};
	const request:IDBObjectStore = transaction.objectStore(Constant.Database.STORE_NAME);
	request.onsuccess = ():void => {
		console.log(`${self.name}: tranches saved to DB.`)
	};
	request.onerror = (event:Event):void => {
		console.error(`${self.name}: while saving tranches.`, event.target);
		self.close();
	};
	request.clear();
	jsons.forEach(entry => request.add({ part: entry.name, bytes: entry.bytes }));
}