import {Loader} from "./component/Loader.ts";
import {Constant} from "./Constant.ts";
import {Drawer} from "./Drawer.ts";
import {Calculation, State} from "./State.ts";
import {Values} from "./Values.ts";
import {Message} from "./worker/infrastructure/Message.ts";
import {Pool, Saver} from "./worker/Pool.ts";

(async (): Promise<void> => {
    //Functions for init
    const WORKER_COUNT: number = window.navigator.hardwareConcurrency;
    const callback = async (msg: any): Promise<void> => {
        const message: Message.WorkerMessage | Message.LoadComplete | Message.CalculationDone = msg.data;
        switch (message.action) {
            case Constant.WorkerAction.LOAD: {
                const loadMessage: Message.LoadComplete = message as Message.LoadComplete;
                loadCounter++;
                switch (loadMessage.source) {
                    case Constant.Source.NETWORK: {
                        Saver.SAVER.add(loadMessage)
                            .then(() => console.log(loadMessage.from, `JSON from ${loadMessage.name} loaded.`));
                        break;
                    }
                    case Constant.Source.DATABASE: {
                        console.log(loadMessage.from, `JSON ${loadMessage.name} loaded from DB.`);
                        break;
                    }
                }
                if (loadCounter === Constant.PARTS) {
                    loadCounter = 0;
                    document.addEventListener(Constant.EventName.CALCULATION_DONE, () => Loader.hideLoader(), false);
                    if (loadMessage.source === Constant.Source.NETWORK) {
                        document.addEventListener(Constant.EventName.SAVE_TO_DATABASE, () => Saver.SAVER.saveAll(), false);
                    }
                    Drawer.render(new State.AxisValues());
                } else {
                    return Pool.WORKER_POOL.takeNext(loadMessage.from);
                }
                break;
            }
            case Constant.WorkerAction.CALCULATE: {
                const calcMessage: Message.CalculationDone = message as Message.CalculationDone;
                calcCounter++;
                console.log(calcMessage.from, "Calculation done.");
                Calculation.ResultProcessor.addResult(Calculation.CALC_RESULT, calcMessage.data);
                const result: Calculation.CalculationResult | undefined = Calculation.ResultProcessor.finalResult(Calculation.CALC_RESULT);
                if (calcCounter === WORKER_COUNT && result !== undefined) {
                    console.log("Full calculation done!");
                    Values.fillCells(result);
                    calcCounter = 0;
                }
                break;
            }
            case Constant.WorkerAction.RELOAD: {
                doFullReload();
                break;
            }
        }
    }
    //Init logic
    let loadCounter: number = 0;
    let calcCounter: number = 0;
    const init: Array<Promise<void>> = [];
    for (let i: number = 0; i < Constant.PARTS; i++) {
        init.push(Pool.WORK_QUEUE.push(new Message.LoadRequest(`tranche/tranche${i}.json`)));
    }
    Promise.all(init).then(() => Pool.WORKER_POOL.init(callback));
})();

function doFullReload():void {
    window.localStorage.clear();
    location.reload();
}