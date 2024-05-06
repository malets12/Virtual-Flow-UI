import {Constant} from "../Constant.ts";
import Database = Constant.Database;
import Message from "./infrastructure/Message.ts";
import LoadCompleteMessage = Message.LoadCompleteMessage;
import SaveMessage = Message.SaveMessage;

self.addEventListener("message", async (msg:any):Promise<void> => {
	const req:IDBOpenDBRequest = indexedDB.open(Database.NAME, Database.VERSION);
	req.onsuccess = ():void => {
		const db:IDBDatabase = req.result;
		console.log(`${self.name}: DB init done.`);
		addDBEntry(db, msg.data);
	};
	req.onerror = (event):void => {
		console.error(`${self.name}: DB init.`, event.target.errorCode);
	};
	req.onupgradeneeded = (event):void => {
		const store:IDBObjectStore = event.currentTarget.result.createObjectStore(
			Database.STORE_NAME, { keyPath: "part" });
		store.createIndex("bytes", "bytes", { unique: false });
	};
}, false);

function addDBEntry(db:IDBDatabase, jsons:ReadonlyArray<LoadCompleteMessage>):void {
	const transaction:IDBTransaction = db.transaction(Database.STORE_NAME, "readwrite");
	transaction.oncomplete = ():void => {
		self.postMessage(new SaveMessage(self.name, "Successfully saved to DB."));
		self.close();
	};
	transaction.onerror = (event:Event):void => {
		console.error(`${self.name}: while saving tranches.`, event.target);
		self.close();
	};
	const request:IDBObjectStore = transaction.objectStore(Database.STORE_NAME);
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