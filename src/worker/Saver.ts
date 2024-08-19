import {AxisSelector} from "../component/AxisSelector.ts";
import {LocalStorage} from "../component/LocalStorage.ts";
import {Calculation} from "../compute/Calculation.ts";
import {State} from "../compute/State.ts";
import {Constant} from "../data/Constant.ts";
import {ValuesDrawer} from "../drawer/ValuesDrawer.ts";
import {Message} from "./infrastructure/Message.ts";
import {JSWorkerFactory} from "./WorkerFactory.ts";

export namespace Saver {

    export interface BackgroundSaver {
        init(): Promise<void>;
        saveAll(): Promise<void>;
        add(message: Message.TranchesLoadComplete): Promise<void>;
        loadDefaultState(): Promise<void>;
    }

    class AsyncBackgroundSaver implements BackgroundSaver {
        private worker: Worker;
        private readonly jsonsAsByteArrays: Array<Message.TranchesLoadComplete> = [];

        async init(): Promise<void> {
            const callback = async (msg: MessageEvent): Promise<void> => {
                const message: Message.WorkerMessage = msg.data;
                switch (message.action) {
                    case Constant.Action.SAVE: {
                        const saveMessage: Message.SavingDone = message as Message.SavingDone;
                        console.log(saveMessage.from, `${saveMessage.dataType}: ${saveMessage.result}`);
                        switch (saveMessage.dataType) {
                            case Constant.DataType.TRANCHES: {
                                LocalStorage.markHasTranchesLocalCopy();
                                break;
                            }
                            case Constant.DataType.DEFAULT_STATE: {
                                LocalStorage.markHasPersistedDefaultState();
                                break;
                            }
                        }
                        break;
                    }
                    case Constant.Action.LOAD: {
                        const loadCompleteMessage: Message.StateLoadComplete = message as Message.StateLoadComplete;
                        console.log(loadCompleteMessage.from, "Initial state loaded.");
                        Calculation.CALC_RESULT.addPart(loadCompleteMessage.state);
                        ValuesDrawer.fillCells(loadCompleteMessage.state);
                        break;
                    }
                }
            };
            JSWorkerFactory.newDatabaseSaver(callback)
                .then(namedWorker => this.worker = namedWorker.worker)
                .then(() => document.addEventListener(Constant.EventName.CALCULATION_DONE, () => this.tryPersistDefaultState(), false))
                .catch(error => console.error(error));
        }

        async saveAll(): Promise<void> {
            return new Promise<void>(() => {
                this.worker.postMessage(new Message.SaveTranchesRequest(this.jsonsAsByteArrays))
                //TODO? load collections
            }).finally(() => this.jsonsAsByteArrays.length = 0);
        }

        async add(message: Message.TranchesLoadComplete): Promise<void> {
            this.jsonsAsByteArrays.push(message);
        }

        async loadDefaultState(): Promise<void> {
            this.worker.postMessage(new Message.DBLoadRequest());
        }

        private tryPersistDefaultState(): void {
            if (LocalStorage.hasPersistedDefaultState()) {
                return;
            }
            const initResult: Calculation.CalculationResult | undefined = Calculation.CALC_RESULT.getFinalResult();
            const isDefaultState: boolean = State.Snapshot.isDefaultState(AxisSelector.getAxisValues());
            if (initResult !== undefined && isDefaultState) {
                this.worker.postMessage(new Message.SaveInitialStateRequest(initResult));
            }
        }
    }

    export const SAVER: BackgroundSaver = new AsyncBackgroundSaver();
}