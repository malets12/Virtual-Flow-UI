import {AxisSelector} from "./component/AxisSelector.ts";
import {Downloads} from "./component/Downloads.ts";
import {Slider} from "./component/Slider.ts";
import {Table} from "./component/Table.ts";
import {Constant} from "./Constant.ts";
import {COLOR} from "./data/mapping/color.ts";
import {KEY} from "./data/mapping/key.ts";
import {Calculation, State} from "./State.ts";
import {abbrN, doFullReload, Loader, LocalStorage} from "./Utils.ts";
import {Message} from "./worker/infrastructure/Message.ts";
import {Pool, Saver} from "./worker/Pool.ts";

(async (): Promise<void> => {
    //Functions for init
    const callback = async (msg: any): Promise<void> => {
        const message: Message.WorkerMessage | Message.LoadCompleteMessage | Message.CalculationDoneMessage = msg.data;
        switch (message.action) {
            case Constant.WorkerAction.LOAD: {
                const loadMessage: Message.LoadCompleteMessage = message as Message.LoadCompleteMessage;
                loadCounter++;
                switch (loadMessage.source) {
                    case Constant.Source.NETWORK: {
                        Saver.SAVER.add(loadMessage)
                            .then(() => console.log(`${loadMessage.from}: JSON from ${loadMessage.name} loaded.`));
                        break;
                    }
                    case Constant.Source.DATABASE: {
                        console.log(`${loadMessage.from}: JSON ${loadMessage.name} loaded from DB.`);
                        break;
                    }
                }
                if (loadCounter === Constant.PARTS) {
                    loadCounter = 0;
                    document.addEventListener(Constant.EventName.CALCULATION_DONE, () => Loader.hideLoader(), false);
                    if (loadMessage.source === Constant.Source.NETWORK) {
                        document.addEventListener(Constant.EventName.SAVE_TO_DATABASE, () => Saver.SAVER.saveAll(), false);
                    }
                    render(new State.AxisValues());
                } else {
                    return Pool.WORKER_POOL.takeNext(loadMessage.from);
                }
                break;
            }
            case Constant.WorkerAction.CALCULATE: {
                const calcMessage: Message.CalculationDoneMessage = message as Message.CalculationDoneMessage;
                calcCounter++;
                console.log(`${calcMessage.from}: calculation done.`);
                Calculation.CALC_RESULT.addResult(calcMessage.data);
                Calculation.CALC_RESULT.tryMerge();
                if (calcCounter === Constant.WORKER_COUNT && Calculation.CALC_RESULT.finalResult !== undefined) {
                    console.log("Full calculation done!");
                    fillCells(Calculation.CALC_RESULT.finalResult);
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
    const init:Array<Promise<void>> = [];
    for (let i: number = 0; i < Constant.PARTS; i++) {
        init.push(Pool.WORK_QUEUE.push(new Message.LoadRequestMessage(`tranche${i}.json`)));
    }
    Promise.all(init).then(() => Pool.WORKER_POOL.init(callback));
})();

function render(axis: State.AxisValues): void {
    removePrevious();
    const table: HTMLTableElement = Table.renderTable(axis);
    document.getElementById("container").appendChild(table);
    //Create containers for controls and info
    const info: HTMLDivElement = createSpecialContainer("info");
    table.after(info);
    info.after(createSpecialContainer("controls"));
    //Call functions
    AxisSelector.setAxisValues(axis)
    Slider.renderControls();
    Slider.addSliderEvents(axis);
    Downloads.renderDownloads();
    //TODO? render_collections_downloads();
    renderValues(axis, true);
    addAxisChangeListener();
    Slider.narrow("", true);
    if (!LocalStorage.hasLocalCopy()) {
        document.dispatchEvent(new Event(Constant.EventName.SAVE_TO_DATABASE));
    }
}

function renderValues(axis: State.AxisValues, isInit: boolean = false): void {
    //Check if other dimensions are in use
    if (!isInit && !State.SLIDERS_STATE.isNeedRecalculation(axis)) {
        return;
    }
    Loader.showLoader();
    State.SLIDERS_STATE.saveNew(axis);
    const notSelectedDimensions: ReadonlyArray<string> = Array.from(State.SLIDERS_STATE.map.keys());
    const possibleValues: Map<string, State.Limits> = new Map();
    if (!isInit) {
        for (const dimension: string of notSelectedDimensions) {
            const limits: State.Limits | undefined = State.SLIDERS_STATE.map.get(dimension);
            if (limits !== undefined) {
                const isZeroDimension: boolean = KEY.dimensionsWithZero.has(dimension);
                if (limits.min === limits.max && !isZeroDimension) {
                    throw "Illegal state: this limit is not allowed";
                }
                if (isZeroDimension) {
                    possibleValues.set(dimension, new State.Limits(limits.min - 1, limits.max));
                } else {
                    possibleValues.set(dimension, limits);
                }
            }
        }
    }
    //Clear cell values
    for (const className: string of ["sum", "field"]) {
        for (const element: Element of document.getElementsByClassName(className)) {
            element.textContent = "0";
            element.setAttribute("num", "0");
        }
    }
    Pool.WORKER_POOL.notifyAll(new Message.CalculationRequestMessage(isInit, axis, possibleValues, notSelectedDimensions));
}

function fillCells(result: Calculation.CalculationResult): void {
    if (result.totalCompounds > 0 && result.totalTranches > 0) {
        State.TOTALS.setMax(Constant.Counter.COMPOUNDS, result.totalCompounds);
        State.TOTALS.setMax(Constant.Counter.TRANCHES, result.totalTranches);
    }
    fillCellsWithRowAndColumnSums(result);
    Slider.narrow(AxisSelector.getAxisValue(Constant.Axis.X));
    document.dispatchEvent(new Event(Constant.EventName.CALCULATION_DONE));
}

function addColour(cell: HTMLElement, num: number): void {
    for (const color: string of COLOR.map.values()) {
        cell.classList.remove(color);
    }
    for (let i: number = 0; i < COLOR.limits.length; i++) {
        const limit: number = COLOR.limits[i];
        if (num > limit && num < COLOR.limits[i + 1]) {
            const colorClass: string | undefined = COLOR.map.get(limit);
            if (colorClass !== undefined) {
                cell.classList.add(colorClass);
            }
            break;
        }
    }
}

function fillCellsWithRowAndColumnSums(results: Calculation.CalculationResult): void {
    const summaryMap: Map<string, number> = new Map();
    for (const [id, num]: [string, number] of results.cellCounts) {
        const columnId: string = `${id.substring(0, 1)}0`;
        const rowId: string = `0${id.substring(1, 2)}`;
        for (const element: string of [columnId, rowId]) {
            const sum: number | undefined = summaryMap.get(element);
            if (sum === undefined) {
                summaryMap.set(element, num);
            } else {
                summaryMap.set(element, sum + num);
            }
        }
        const cell: HTMLElement | null = document.getElementById(id);
        if (cell !== null) {
            cell.classList.add("not_zero");
            cell.setAttribute("num", String(num));
            cell.textContent = abbrN(num);
            addColour(cell, num);
        }
    }
    for (const [id, sum]: [string, number] of summaryMap) {
        const cell: HTMLElement | null = document.getElementById(id);
        if (cell !== null) {
            cell.classList.add("frame", "sum");
            cell.setAttribute("num", String(sum));
            cell.textContent = abbrN(sum);
        }
    }
}

function removePrevious(): void {
    //Remove previous data
    ["table", "info_wrapper", "controls_wrapper", "download", "downloadC"]
        .map(id => document.getElementById(id))
        .filter(element => element !== null)
        .forEach(element => element.remove());
}

function createSpecialContainer(name: string): HTMLDivElement {
    const text: HTMLDivElement = document.createElement("div");
    text.setAttribute("id", `${name}_wrapper`);
    for (let i: number = 0; i < 2; i++) {
        const col: HTMLDivElement = document.createElement("div");
        col.setAttribute("class", `${name}_col`);
        col.setAttribute("id", `${name}_${i}`);
        text.appendChild(col);
    }
    return text;
}

function addAxisChangeListener(): void {
    for (const axisSelector: HTMLElement of document.getElementsByClassName("axis_selector")) {
        axisSelector.addEventListener("change", () => render(AxisSelector.getAxisValues()));
    }
}