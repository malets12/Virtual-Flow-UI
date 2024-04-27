import {EventName, WorkerAction} from "./worker/Enum.ts";
import LocalStorage, {abbrN, doFullReload} from "./Utils.ts";
import {KEY} from "./data/mapping/key.ts";
import {COLOR} from "./data/mapping/color.ts";
import type {AxisValues, Limits} from "./State.ts";
import {CalculationResult} from "./State.ts";
import Message, {LoadRequestMessage} from "./worker/infrastructure/Message.ts";
import SaveMessage = Message.SaveMessage;
import WorkerMessage = Message.WorkerMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import LoadMessage = Message.LoadMessage;
import {Source} from "./Enum.ts";
import newDatabaseSaver = JSWorkerFactory.newDatabaseSaver;
import newDatabaseLoader = JSWorkerFactory.newDatabaseLoader;
import newNetworkLoader = JSWorkerFactory.newNetworkLoader;
import {Constant} from "./Constant.ts";
import PARTS = Constant.PARTS;
import markHasLocalCopy = LocalStorage.markHasLocalCopy;
import hideLoader = Loader.hideLoader;
import hasLocalCopy = LocalStorage.hasLocalCopy;
import Table from "./component/Table.ts";
import renderTable = Table.renderTable;
import Downloads from "./component/Downloads.ts";
import renderDownloads = Downloads.renderDownloads;
import createSpecialContainer = Wrapper.createSpecialContainer;
import Slider from "./component/Slider.ts";
import addSliderEvents = Slider.addSliderEvents;
import showLoader = Loader.showLoader;
import AxisSelector from "./component/AxisSelector.ts";
import addAxisChangeListener = AxisSelector.addAxisChangeListener;
import setAxisValues = AxisSelector.setAxisValues;

const TOTALS_MAP:Map<string, number> = new Map();
const WORKER_POOL:Map<string, Worker> = new Map();
let cellToTranches = new Map();
let SLIDERS_SNAPSHOT:ReadonlyMap<string, Limits> = new Map();

(async (): Promise<void> => {
    //Functions for init
    const saveToDB = async ():Promise<void> => {
        newDatabaseSaver((message:SaveMessage):void => {
            console.log(`${message.from}: ${message.result}`);
            markHasLocalCopy();
        }).then(namedWorker => namedWorker.worker
            .postMessage(jsonsAsByteArrays, [jsonsAsByteArrays])) //transfer
        //TODO load collections?
    }
    const callback = async (msg:any):Promise<void> => {
        const message:WorkerMessage|LoadCompleteMessage|CalculationDoneMessage = msg.data;
        switch (message.action) {
            case WorkerAction.LOAD: {
                const loadMessage:LoadCompleteMessage = message as LoadCompleteMessage;
                loadCounter++;
                switch (loadMessage.source) {
                    case Source.NETWORK: {
                        jsonsAsByteArrays.push(loadMessage);
                        console.log(`${loadMessage.from}: JSON from ${loadMessage.name} loaded.`);
                        break;
                    }
                    case Source.DATABASE: {
                        console.log(`${loadMessage.from}: JSON ${loadMessage.name} loaded from DB.`);
                        break;
                    }
                }
                if (loadCounter === PARTS) {
                    loadCounter = 0;
                    document.addEventListener(EventName.CALCULATION_DONE, () => hideLoader(), false);
                    if (loadMessage.source === Source.NETWORK) {
                        document.addEventListener(EventName.SAVE_TO_DATABASE, () => saveToDB(), false);
                    }
                    render(new AxisValues());
                } else if (workQueue.length > 0) {
                    WORKER_POOL.get(loadMessage.from).postMessage(workQueue.pop());
                }
                break;
            }
            case WorkerAction.CALCULATE: {
                const calcMessage:CalculationDoneMessage = message as CalculationDoneMessage;
                calcCounter++;
                console.log(`${calcMessage.from}: calculation done.`);
                calcResults.push(calcMessage.data);
                if (calcResults.length > 1) {
                    calcResults.push(calcResults.pop().merge(calcResults.pop()));
                }
                if (calcCounter === workersCount) {
                    console.log("Full calculation done!");
                    fillCells(calcResults[0]);
                    calcResults.length = 0;
                    calcCounter = 0;
                }
                break;
            }
            case WorkerAction.RELOAD: {
                doFullReload();
                break;
            }
        }
    }
    //Init logic
    const workQueue:Array<LoadMessage> = [];
    const calcResults:Array<CalculationResult> = [];
    const loadFromDB:boolean = hasLocalCopy();
    const workersCount:number = window.navigator.hardwareConcurrency;
    const jsonsAsByteArrays:Array<LoadCompleteMessage> = [];
    let loadCounter:number = 0;
    let calcCounter:number = 0;

    for (let i = 0; i < PARTS; i++) {
        const jsonUrl:string = "tranche" + i + ".json";
        workQueue.push(new LoadRequestMessage(jsonUrl))
    }

    for (let i:number = 0; i < workersCount; i++) {
        (loadFromDB ? newDatabaseLoader(callback, i) : newNetworkLoader(callback, i))
            .then(namedWorker => {
                WORKER_POOL.set(namedWorker.name, namedWorker.worker);
                worker.postMessage(workQueue.pop())
            });
    }
})();

function render(axis:AxisValues):void {
    removeAll();
    const table:HTMLElement = renderTable(axis);
    document.getElementById("container").appendChild(table);
    //Create containers for controls and info
    const info = createSpecialContainer("info");
    table.after(info);
    info.after(createSpecialContainer("controls"));
    //Call functions
    setAxisValues(axis)
    renderControls();
    addSliderEvents(axis);
    renderDownloads();
    //TODO? render_collections_downloads();
    renderValues(axis, true);
    addAxisChangeListener();
    narrow(null, true);
    if (!hasLocalCopy()) {
        document.dispatchEvent(new Event(EventName.SAVE_TO_DATABASE));
    }
}

function makeSlidersSnapshot(axis:AxisValues, full:boolean):ReadonlyMap<string, Limits> {
    const snapshot:Map<string, Limits> = new Map();
    Array.from(KEY.map.keys())
        .filter(key => full || (key !== axis.x && key !== axis.y))
        .forEach(dimension => {
            let min:number = parseInt(document.getElementById(dimension + "_min").value);
            let max:number = parseInt(document.getElementById(dimension + "_max").value);
            if (min > max) [min, max] = [max, min];
            snapshot.set(dimension, new Limits(min, max))
        });
    return snapshot;
}

function isNeedRecalculation(axis:AxisValues):boolean {
    const current_state:ReadonlyMap<string, Limits> = makeSlidersSnapshot(axis, false);
    for (let [key, val] of SLIDERS_SNAPSHOT) {
        const currentVal = current_state.get(key);
        if (currentVal.min !== val.min || currentVal.max !== val.max) {
            return true;
        }
    }
    return false;
}

function renderValues(axis:AxisValues, isInit:boolean):void {
    //Check if other dimensions are in use
    if (!isInit && !isNeedRecalculation(axis)) return;
    showLoader();
    SLIDERS_SNAPSHOT = makeSlidersSnapshot(axis, false);
    const notSelectedDimensions:ReadonlyArray<string> = Array.from(SLIDERS_SNAPSHOT.keys());
    const possibleValues:Map<string, Limits> = new Map();
    if (!isInit) {
        for (const dimension:string of notSelectedDimensions) {
            const limits:Limits = SLIDERS_SNAPSHOT.get(dimension);
            const isZeroDimension:boolean = KEY.dimensionsWithZero.has(dimension);
            if (limits.min === limits.max && !isZeroDimension) {
                throw "Illegal state: this limit is not allowed";
            }
            if (isZeroDimension) {
                possibleValues.set(dimension, new Limits(limits.min - 1, limits.max));
            }
            else {
                possibleValues.set(dimension, limits);
            }
        }
    }
    //Clear cell values
    for (const className:string of ["sum", "field"]) {
        for (const element:Element of document.getElementsByClassName(className)) {
            element.textContent = "0";
            element.setAttribute("num", "0");
        }
    }
    WORKER_POOL.forEach((worker:Worker, name:string) =>
        worker.postMessage(new CalculationRequest(isInit, axis, possibleValues, notSelectedDimensions)));
}

function fillCells(results:CalculationResult):void {
    if (results.totalCompounds > 0 && results.totalTranches > 0) {
        TOTALS_MAP.set("p_max_cmpds", results.totalCompounds);
        TOTALS_MAP.set("p_max_trs", results.totalTranches);
    }
    cellToTranches = results.cellToTranches;
    const sum_map = new Map();
    results.cellCounts.forEach((num, final_key) => {
        const column = final_key.substring(0, 1) + "0", row = "0" + final_key.substring(1, 2);
        [column, row].forEach(element => {
            if (sum_map.has(element)) sum_map.set(element, sum_map.get(element) + num);
            else sum_map.set(element, num);
        });
        const cell = document.getElementById(final_key);
        cell.classList.add("not_zero");
        cell.setAttribute("num", num);
        cell.textContent = abbrN(num);
    });
    sum_map.forEach((val, key) => {
        const cell = document.getElementById(key);
        cell.classList.add("frame", "sum");
        cell.setAttribute("num", val)
        cell.textContent = abbrN(val);
    });
    //Coloring and abbr
    const colorsMap:ReadonlyMap<string, string> = COLOR.map;
    const limits = Array.from(colorsMap.keys());
    const colors = Array.from(colorsMap.values());
    limits.push(Infinity);
    Array.from(document.getElementsByClassName("not_zero")).forEach(cell => {
        for (let color of colors) cell.classList.remove(color)
        const num = parseInt(cell.getAttribute("num"));
        for (let i = 0; i < limits.length; i++)
            if (num > limits[i] && num < limits[i + 1]) {
                cell.classList.add(colorsMap.get(limits[i]));
                break;
            }
    });
    narrow(document.getElementById("select_x").value);
    document.dispatchEvent(new Event(EventName.CALCULATION_DONE));
}

function findInbox() {
    return Array.from(document.getElementsByClassName("inbox"))
        .map(cell => cell.id)
        .filter(id => cellToTranches.has(id))
        .map(id => cellToTranches.get(id))
        .reduce((arr1, arr2) => [...arr1, ...arr2]);
}

function removeAll():void {
    //Remove everything we do not like
    ["table", "info_wrapper", "controls_wrapper", "download", "downloadC"]
        .map(id => document.getElementById(id))
        .filter(element => element)
        .forEach(element => element.remove());
}