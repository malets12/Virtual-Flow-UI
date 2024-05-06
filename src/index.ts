import Message from "./worker/infrastructure/Message.ts";
import WorkerMessage = Message.WorkerMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import LoadRequestMessage = Message.LoadRequestMessage;
import {Constant} from "./Constant.ts";
import Source = Constant.Source;
import Counter = Constant.Counter;
import WorkerAction = Constant.WorkerAction;
import PARTS = Constant.PARTS;
import WORKER_COUNT = Constant.WORKER_COUNT;
import Axis = Constant.Axis;
import EventName = Constant.EventName;
import {Pool, Saver} from "./worker/Pool.ts";
import WORKER_POOL = Pool.WORKER_POOL;
import WORK_QUEUE = Pool.WORK_QUEUE;
import SAVER = Saver.SAVER;
import {Loader, LocalStorage, abbrN, doFullReload} from "./Utils.ts";
import hideLoader = Loader.hideLoader;
import hasLocalCopy = LocalStorage.hasLocalCopy;
import showLoader = Loader.showLoader;
import {State, Calculation} from "./State.ts";
import AxisValues = State.AxisValues;
import CALC_RESULT = Calculation.CALC_RESULT;
import SLIDERS_STATE = State.SLIDERS_STATE;
import Limits = State.Limits;
import TOTALS = State.TOTALS;
import CalculationResult = Calculation.CalculationResult;
import Downloads from "./component/Downloads.ts";
import renderDownloads = Downloads.renderDownloads;
import Slider from "./component/Slider.ts";
import addSliderEvents = Slider.addSliderEvents;
import renderControls = Slider.renderControls;
import AxisSelector, {getAxisValues} from "./component/AxisSelector.ts";
import setAxisValues = AxisSelector.setAxisValues;
import narrow = Slider.narrow;
import Table from "./component/Table.ts";
import renderTable = Table.renderTable;
import {KEY} from "./data/mapping/key.ts";
import getAxisValue = AxisSelector.getAxisValue;
import {COLOR} from "./data/mapping/color.ts";

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
                        SAVER.add(loadMessage);
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
                        document.addEventListener(EventName.SAVE_TO_DATABASE, () => SAVER.saveAll(), false);
                    }
                    render(new AxisValues());
                } else {
                    return WORKER_POOL.takeNext(loadMessage.from);
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
                    fillCells(CALC_RESULT.finalResult);
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
    let loadCounter:number = 0;
    let calcCounter:number = 0;

    for (let i:number = 0; i < PARTS; i++) {
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
    if (!isInit && !SLIDERS_STATE.isNeedRecalculation(axis)) {
        return;
    }
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
    WORKER_POOL.notifyAll(new CalculationRequestMessage(isInit, axis, possibleValues, notSelectedDimensions));
}

function fillCells(result:CalculationResult):void {
    if (result.totalCompounds > 0 && result.totalTranches > 0) {
        TOTALS.setMax(Counter.COMPOUNDS, result.totalCompounds);
        TOTALS.setMax(Counter.TRANCHES, result.totalTranches);
    }
    fillCellsWithRowAndColumnSums(result);
    narrow(getAxisValue(Axis.X));
    document.dispatchEvent(new Event(EventName.CALCULATION_DONE));
}

function addColour(cell:HTMLElement, num:number):void {
    for (const color:string of COLOR.map.values()) {
        cell.classList.remove(color);
    }
    for (let i:number = 0; i < COLOR.limits.length; i++) {
        if (num > COLOR.limits[i] && num < COLOR.limits[i + 1]) {
            cell.classList.add(COLOR.map.get(COLOR.limits[i]));
            break;
        }
    }
}

function fillCellsWithRowAndColumnSums(results:CalculationResult):void {
    const summaryMap:Map<string, number> = new Map();
    for (const [id, num] of results.cellCounts) {
        const columnId:string = `${id.substring(0, 1)}0`;
        const rowId:string = `0${id.substring(1, 2)}`;
        for (const element:string of [columnId, rowId]) {
            const sum:number|undefined = summaryMap.get(element);
            if (sum === undefined) {
                summaryMap.set(element, num);
            } else {
                summaryMap.set(element, sum + num);
            }
        }
        const cell:HTMLElement = document.getElementById(id);
        cell.classList.add("not_zero");
        cell.setAttribute("num", num);
        cell.textContent = abbrN(num);
        addColour(cell, num);
    }
    for (const [id, sum] of summaryMap) {
        const cell:HTMLElement = document.getElementById(id);
        cell.classList.add("frame", "sum");
        cell.setAttribute("num", String(sum));
        cell.textContent = abbrN(sum);
    }
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
    text.setAttribute("id", `${name}_wrapper`);
    for (let i:number = 0; i < 2; i++) {
        const col:HTMLElement = document.createElement("div");
        col.setAttribute("class", `${name}_col`);
        col.setAttribute("id", `${name}_${i}`);
        text.appendChild(col);
    }
    return text;
}

function addAxisChangeListener():void {
    for (const axisSelector:HTMLElement of document.getElementsByClassName("axis_selector")) {
        axisSelector.addEventListener("change", () => render(getAxisValues()));
    }
}