import {Calculation} from "./compute/Calculation.ts";
import {Loader} from "./component/Loader.ts";
import {Constant} from "./data/Constant.ts";
import {ComponentDrawer} from "./drawer/ComponentDrawer.ts";
import {Model} from "./model/Model.ts";
import {ValuesDrawer} from "./drawer/ValuesDrawer.ts";
import {Message} from "./worker/infrastructure/Message.ts";
import {Pool} from "./worker/Pool.ts";
import {Saver} from "./worker/Saver.ts";

(async (): Promise<void> => {
    //Functions for init
    const WORKER_COUNT: number = window.navigator.hardwareConcurrency;
    const callback = async (msg: MessageEvent): Promise<void> => {
        const message: Message.WorkerMessage = msg.data;
        switch (message.action) {
            case Constant.Action.LOAD: {
                const loadMessage: Message.TranchesLoadComplete = message as Message.TranchesLoadComplete;
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
                    ComponentDrawer.draw(new Model.AxisValues());
                } else {
                    return Pool.WORKER_POOL.takeNext(loadMessage.from);
                }
                break;
            }
            case Constant.Action.CALCULATE: {
                const calcMessage: Message.CalculationDone = message as Message.CalculationDone;
                calcCounter++;
                console.log(calcMessage.from, "Calculation done.");
                Calculation.CALC_RESULT.addPart(calcMessage.data);
                const result: Calculation.CalculationResult | undefined = Calculation.CALC_RESULT.getFinalResult();
                if (calcCounter === WORKER_COUNT && result !== undefined) {
                    console.log("Full calculation done!");
                    ValuesDrawer.fillCells(result);
                    calcCounter = 0;
                }
                break;
            }
            case Constant.Action.RELOAD: {
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
        init.push(Pool.WORK_QUEUE.push(new Message.NetworkLoadRequest(`tranche/tranche${i}.json`)));
    }
    Promise.all(init).then(() => Pool.WORKER_POOL.init(callback));
})();

function doFullReload():void {
    window.localStorage.clear();
    location.reload();
}