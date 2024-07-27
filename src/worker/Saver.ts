import {AxisSelector} from "../component/AxisSelector.ts";
import {LocalStorage} from "../component/LocalStorage.ts";
import {Calculation} from "../compute/Calculation.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import {Message} from "./infrastructure/Message.ts";
import {JSWorkerFactory} from "./WorkerFactory.ts";

export namespace Saver {

    export interface BackgroundSaver {
        saveAll(): Promise<void>;
        add(message: Message.LoadComplete): Promise<void>;
        loadInitial(): Promise<void>;
    }

    class AsyncBackgroundSaver implements BackgroundSaver {
        private worker: Worker;
        private readonly jsonsAsByteArrays: Array<Message.LoadComplete> = [];

        async saveAll(): Promise<void> {
            const callback = async (msg: MessageEvent): Promise<void> => {
                const message: Message.WorkerMessage = msg.data;
                switch (message.action) {
                    case Constant.WorkerAction.SAVE: {
                        const saveMessage: Message.SavingDone = message as Message.SavingDone;
                        console.log(saveMessage.from, `${saveMessage.result} for ${saveMessage.dataType}`);
                        switch (saveMessage.dataType) {
                            case Constant.DataType.TRANCHES: {
                                LocalStorage.markHasTranchesLocalCopy();
                                break;
                            }
                            case Constant.DataType.INITIAL_STATE: {
                                LocalStorage.markHasPersistedInitial();
                                break;
                            }
                        }
                        break;
                    }
                    case Constant.WorkerAction.LOAD: {
                        //TODO
                        break;
                    }
                }
            };
            return JSWorkerFactory.newDatabaseSaver(callback).then(namedWorker => {
                this.worker = namedWorker.worker;
                this.worker.postMessage(new Message.SaveTranchesRequest(this.jsonsAsByteArrays));
                document.addEventListener(Constant.EventName.CALCULATION_DONE, () => this.tryPersistInitialState(), false)
            }).catch(error => console.error(error))
              .finally(() => this.jsonsAsByteArrays.length = 0);
            //TODO? load collections
        }

        async add(message: Message.LoadComplete): Promise<void> {
            this.jsonsAsByteArrays.push(message);
        }

        async loadInitial(): Promise<void> {
            this.worker.postMessage(new Message.DBLoadRequest());
        }

        private tryPersistInitialState(): void {
            if (LocalStorage.hasPersistedInitial()) {
                return;
            }
            const initResult: Calculation.CalculationResult | undefined = Calculation.CALC_RESULT.getFinalResult();
            const isInitial: boolean = Model.AxisValues.equals(AxisSelector.getAxisValues(), new Model.AxisValues());
            if (initResult !== undefined && isInitial) {
                this.worker.postMessage(new Message.SaveInitialStateRequest(initResult));
            }
        }
    }

    export const SAVER: BackgroundSaver = new AsyncBackgroundSaver();
}