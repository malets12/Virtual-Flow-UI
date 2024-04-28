import {EventName, WorkerAction} from "./worker/Enum.ts";
import LocalStorage, {abbrN, doFullReload} from "./Utils.ts";
import {KEY} from "./data/mapping/key.ts";
import {COLOR} from "./data/mapping/color.ts";
import type {AxisValues, Limits} from "./State.ts";
import State, {CALC_RESULT} from "./State.ts";
import Snapshot, {CalculationResult} from "./State.ts";
import Message, {LoadRequestMessage} from "./worker/infrastructure/Message.ts";
import {Source} from "./Enum.ts";
import {Constant, WORKER_COUNT} from "./Constant.ts";
import Table from "./component/Table.ts";
import Downloads from "./component/Downloads.ts";
import Slider from "./component/Slider.ts";
import AxisSelector from "./component/AxisSelector.ts";
import WorkerMessage = Message.WorkerMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import PARTS = Constant.PARTS;
import hideLoader = Loader.hideLoader;
import hasLocalCopy = LocalStorage.hasLocalCopy;
import renderTable = Table.renderTable;
import renderDownloads = Downloads.renderDownloads;
import createSpecialContainer = Wrapper.createSpecialContainer;
import addSliderEvents = Slider.addSliderEvents;
import showLoader = Loader.showLoader;
import addAxisChangeListener = AxisSelector.addAxisChangeListener;
import setAxisValues = AxisSelector.setAxisValues;
import TOTALS = State.TOTALS;
import getAxisValue = AxisSelector.getAxisValue;
import Axis = Constant.Axis;
import renderControls = Slider.renderControls;
import SLIDERS_STATE = Snapshot.SLIDERS_STATE;
import Counter = Constant.Counter;
import WORKER_POOL = WorkerPool.WORKER_POOL;
import WorkerPool from "./worker/Pool.ts";
import saveToDB = WorkerPool.saveToDB;
import WORK_QUEUE = WorkerPool.WORK_QUEUE;
import narrow = Slider.narrow;

let cellToTranches = new Map(); //TODO move to calculationResult

(async (): Promise<void> => {
    //Functions for init
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
                        document.addEventListener(EventName.SAVE_TO_DATABASE, () => saveToDB(jsonsAsByteArrays), false);
                    }
                    render(new AxisValues());
                } else {
                    WORKER_POOL.takeNext(loadMessage.from);
                }
                break;
            }
            case WorkerAction.CALCULATE: {
                const calcMessage:CalculationDoneMessage = message as CalculationDoneMessage;
                calcCounter++;
                console.log(`${calcMessage.from}: calculation done.`);
                CALC_RESULT.addResult(calcMessage.data);
                CALC_RESULT.tryMerge();
                if (calcCounter === WORKER_COUNT) {
                    console.log("Full calculation done!");
                    fillCells(CALC_RESULT.finalResult());
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
    const jsonsAsByteArrays:Array<LoadCompleteMessage> = [];
    let loadCounter:number = 0;
    let calcCounter:number = 0;

    for (let i = 0; i < PARTS; i++) {
        WORK_QUEUE.push(new LoadRequestMessage(`tranche${i}.json`));
    }
    WORKER_POOL.init(callback);
})();

function render(axis:AxisValues):void {
    removePrevious();
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

function renderValues(axis:AxisValues, isInit:boolean = false):void {
    //Check if other dimensions are in use
    if (!isInit && !SLIDERS_STATE.isNeedRecalculation(axis)) return;
    showLoader();
    SLIDERS_STATE.saveNew(axis);
    const notSelectedDimensions:ReadonlyArray<string> = Array.from(SLIDERS_STATE.map().keys());
    const possibleValues:Map<string, Limits> = new Map();
    if (!isInit) {
        for (const dimension:string of notSelectedDimensions) {
            const limits:Limits = SLIDERS_STATE.map().get(dimension);
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
    WORKER_POOL.notifyAll(new CalculationRequest(isInit, axis, possibleValues, notSelectedDimensions));
}

function fillCells(results:CalculationResult):void {
    if (results.totalCompounds > 0 && results.totalTranches > 0) {
        TOTALS.setMax(Counter.COMPOUNDS, results.totalCompounds);
        TOTALS.setMax(Counter.TRANCHES, results.totalTranches);
    }
    cellToTranches = results.cellToTranches;
    calcRowsAndColumnSums(results);
    //Coloring and abbr
    const colorsMap:ReadonlyMap<string, string> = COLOR.map; //TODO refactor
    const limits = Array.from(colorsMap.keys());
    limits.push(Infinity);
    for (const cell:HTMLElement of document.getElementsByClassName("not_zero")) {
        for (let color:string of colorsMap.values()) {
            cell.classList.remove(color)
        }
        const num:number = parseInt(cell.getAttribute("num"));
        for (let i:number = 0; i < limits.length; i++) {
            if (num > limits[i] && num < limits[i + 1]) {
                cell.classList.add(colorsMap.get(limits[i]));
                break;
            }
        }
    }
    narrow(getAxisValue(Axis.X));
    document.dispatchEvent(new Event(EventName.CALCULATION_DONE));
}

function calcRowsAndColumnSums(results:CalculationResult):void {
    const summaryMap:Map<string, number> = new Map(); //TODO refactor
    results.cellCounts.forEach((num, final_key):void => {
        const column = `${final_key.substring(0, 1)}0`;
        const row = `0${final_key.substring(1, 2)}`;
        [column, row].forEach(element => {
            const sum:number = summaryMap.get(element);
            if (sum === undefined) {
                summaryMap.set(element, num);
            } else {
                summaryMap.set(element, sum + num);
            }
        });
        const cell:HTMLElement = document.getElementById(final_key);
        cell.classList.add("not_zero");
        cell.setAttribute("num", num);
        cell.textContent = abbrN(num);
    });
    summaryMap.forEach((val, key):void => {
        const cell = document.getElementById(key);
        cell.classList.add("frame", "sum");
        cell.setAttribute("num", val)
        cell.textContent = abbrN(val);
    });
}

function removePrevious():void {
    //Remove previous data
    ["table", "info_wrapper", "controls_wrapper", "download", "downloadC"]
        .map(id => document.getElementById(id))
        .filter(element => element !== undefined)
        .forEach(element => element.remove());
}

function createSpecialContainer(name:string):HTMLElement {
    const text:HTMLElement = document.createElement("div");
    text.setAttribute("id", name + "_wrapper");
    for (let i:number = 0; i < 2; i++) {
        const col:HTMLElement = document.createElement("div");
        col.setAttribute("class", name + "_col");
        col.setAttribute("id", name + "_" + i);
        text.appendChild(col);
    }
    return text;
}