import {EventName, WorkerAction} from "./worker/Enum.ts";
import {replaceAll, abbrN, showLoader, hideLoader, markHasLocalCopy, doFullReload} from "./Utils.ts";
import {KEY} from "./data/mapping/key.ts";
import {LOCAL_COPY, PARTS, FIRST_COLUMN_SLIDERS} from "./Constant.ts";
import {COLOR} from "./data/mapping/color.ts";
import {DESCRIPTION} from "./data/mapping/description.ts";
import {Download, DownloadTemplateMapping, DownloadURL} from "./data/mapping/download/download.ts";
import {ORDER} from "./data/mapping/order.ts";
import type {Axis, Limits} from "./State.ts";
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

const TOTALS_MAP:Map<string, number> = new Map();
const WORKER_POOL:Map<string, Worker> = new Map();
let TRANCHES_MAP = new Map();
let SLIDERS_SNAPSHOT:ReadonlyMap<string, Limits> = new Map();

(async (): Promise<void> => {
    //Functions for init
    const saveToDB = async ():Promise<void> => { //TODO refactor
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
                        console.log(`${loadMessage.from}: JSON from URL ${loadMessage.name} loaded.`);
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
                    render(new Axis());
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
                    mergeResults();
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
    function mergeResults():void {//TODO refactor field names
        const first:CalculationResult = calcResults.pop();
        const second:CalculationResult = calcResults.pop();
        second.final_map.forEach((val:number, key:string):void => {
            if (first.final_map.has(key)) {
                first.final_map.set(key, first.final_map.get(key) + val);
            }
            else {
                first.final_map.set(key, val);
            }
        });
        second.tranches_map.forEach((val, key): void => {
            if (first.tranches_map.has(key)){
                first.tranches_map.set(key, [...first.tranches_map.get(key), ...val]);
            }
            else{
                first.tranches_map.set(key, val);
            }
        });
        calcResults.push(new CalculationResult(
            first.final_map,
            first.tranches_map,
            first.total_tranches + second.total_tranches,
            first.total_cmpds + second.total_cmpds));
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

    for (let i = 0; i < workersCount; i++) {
        (loadFromDB ? newDatabaseLoader(callback, i) : newNetworkLoader(callback, i))
            .then(namedWorker => {
                WORKER_POOL.set(namedWorker.name, namedWorker.worker);
                worker.postMessage(workQueue.pop())
            });
    }
})();

function hasLocalCopy():boolean {
    return window.localStorage.getItem(LOCAL_COPY) === "true";
}

function render(axis:Axis):void {
    const x_axis:string = axis.x;
    const y_axis:string = axis.y;
    //Remove everything we do not like
    ["table", "info_wrapper", "controls_wrapper", "download", "downloadC"]
        .map(id => document.getElementById(id))
        .filter(element => element)
        .forEach(element => element.remove());
    //Form selects
    const selectXHolder = document.createDocumentFragment(), selectYHolder = document.createDocumentFragment();
    Array.from(KEY.map.keys()).forEach(param => {
        for (let i = 0; i < 2; i++) {
            const option = document.createElement("option");
            option.setAttribute("value", param);
            option.innerHTML = param;
            if (i === 0 && param !== y_axis) selectXHolder.appendChild(option);
            else if (i === 1 && param !== x_axis) selectYHolder.appendChild(option);
        }
    });
    const select_x = createAxisSelector("x"), select_y = createAxisSelector("y");
    select_x.appendChild(selectXHolder);
    select_y.appendChild(selectYHolder);
    //Create table
    const table = document.createElement("table");
    table.setAttribute("id", "table");
    const tableHolder = document.createDocumentFragment();
    //Header X
    const first_line = document.createElement("tr"), placeholder = document.createElement("th"),
        x_axis_name = document.createElement("th");
    placeholder.setAttribute("class", "cell");
    placeholder.setAttribute("id", "placeholder");
    x_axis_name.setAttribute("colspan", get_axis_length(x_axis) + 1 + (KEY.dimensionsWithZero.has(x_axis) ? 1 : 0));
    x_axis_name.setAttribute("class", "cell");
    x_axis_name.setAttribute("id", "x_axis");
    x_axis_name.appendChild(select_x);
    first_line.appendChild(placeholder);
    first_line.appendChild(x_axis_name);
    tableHolder.appendChild(first_line);
    //Header Y
    const second_line = document.createElement("tr"), y_axis_name = document.createElement("th");
    y_axis_name.setAttribute("rowspan", get_axis_length(y_axis) + 2 + (KEY.dimensionsWithZero.has(y_axis) ? 1 : 0));
    y_axis_name.setAttribute("class", "cell");
    y_axis_name.setAttribute("id", "y_axis");
    y_axis_name.appendChild(select_y);
    second_line.appendChild(y_axis_name);
    tableHolder.appendChild(second_line);
    //Call tranches
    const y_map = KEY.map.get(y_axis);
    const x_map = KEY.map.get(x_axis);
    const y_keys = Array.from(y_map.keys()), x_keys = Array.from(x_map.keys());
    const y_length = KEY.dimensionsWithZero.has(y_axis)
        ? get_axis_length(y_axis) + 1 : get_axis_length(y_axis);
    const x_length = KEY.dimensionsWithZero.has(x_axis)
        ? get_axis_length(x_axis) + 1 : get_axis_length(x_axis);
    //Cells
    for (let i = 0; i < y_length + 1; i++) {
        const row = document.createElement("tr"), rowHolder = document.createDocumentFragment();
        row.setAttribute("class", "row");
        for (let k = 0; k < x_length + 1; k++) {
            const cell = document.createElement("td");
            cell.style.height = 641 / (get_axis_length(y_axis) + 5) + "px";
            cell.setAttribute("class", "cell unselected");
            if (i === 0 && k > 0) {
                //First row
                cell.setAttribute("class", "axis cell frame unselected");
                if (KEY.dimensionsWithZero.has(x_axis)) cell.setAttribute("id", x_keys[k - 1] + "1");
                else cell.setAttribute("id", x_keys[k] + "1");
                if (k === x_length) {
                    cell.setAttribute("id", "01");
                    cell.innerHTML = "Row sums:";
                } else if (KEY.dimensionsWithZero.has(x_axis) && (k === 1 || x_axis === "EnamineCC")) cell.innerHTML = x_map.get(x_keys[k - 1]);
                else if (KEY.dimensionsWithZero.has(x_axis)) cell.innerHTML = x_map.get(x_keys[k - 2]) + " - " + x_map.get(x_keys[k - 1]);
                else cell.innerHTML = x_map.get(x_keys[k - 1]) + " - " + x_map.get(x_keys[k]);
            } else {
                if (i > 0 && k === 0) {
                    //First column
                    cell.setAttribute("class", "axis cell frame unselected");
                    if (KEY.dimensionsWithZero.has(y_axis)) cell.setAttribute("id", "1" + y_keys[i - 1]);
                    else cell.setAttribute("id", "1" + y_keys[i]);
                    if (i === y_length) {
                        cell.setAttribute("id", "10");
                        cell.innerHTML = "Column sums:";
                    } else if (KEY.dimensionsWithZero.has(y_axis) && (i === 1 || y_axis === "EnamineCC")) cell.innerHTML = y_map.get(y_keys[i - 1]);
                    else if (KEY.dimensionsWithZero.has(y_axis)) cell.innerHTML = y_map.get(y_keys[i - 2]) + " - " + y_map.get(y_keys[i - 1]);
                    else cell.innerHTML = y_map.get(y_keys[i - 1]) + " - " + y_map.get(y_keys[i]);
                } else {
                    //First cell
                    if (i === 0 && k === 0) cell.setAttribute("class", "cell frame unselected");
                    else {
                        //Last cell
                        if (i === y_length && k === x_length) cell.setAttribute("class", "cell frame unselected");
                        else {
                            if (k === x_length) { //Rows sums
                                if (KEY.dimensionsWithZero.has(y_axis)) cell.setAttribute("id", "0" + y_keys[i - 1]);
                                else cell.setAttribute("id", "0" + y_keys[i]);
                            } else if (i === y_length) { //Column sums
                                if (KEY.dimensionsWithZero.has(x_axis)) cell.setAttribute("id", x_keys[k - 1] + "0");
                                else cell.setAttribute("id", x_keys[k] + "0");
                            } else {
                                //Plain cell
                                cell.setAttribute("class", "cell unselected field");
                                if (KEY.dimensionsWithZero.has(x_axis) && KEY.dimensionsWithZero.has(y_axis)) cell.setAttribute("id", x_keys[k - 1] + y_keys[i - 1]);
                                else if (KEY.dimensionsWithZero.has(x_axis)) cell.setAttribute("id", x_keys[k - 1] + y_keys[i]);
                                else if (KEY.dimensionsWithZero.has(y_axis)) cell.setAttribute("id", x_keys[k] + y_keys[i - 1]);
                                else cell.setAttribute("id", x_keys[k] + y_keys[i]);
                                cell.setAttribute("num", "0");
                            }
                            cell.innerHTML = "0";
                        }
                    }
                }
            }
            rowHolder.appendChild(cell);
        }
        row.appendChild(rowHolder);
        tableHolder.appendChild(row)
    }
    table.appendChild(tableHolder);
    document.getElementById("container").appendChild(table);
    //Create containers for controls and info
    const info = createSpecialContainer("info");
    table.after(info);
    info.after(createSpecialContainer("controls"));
    //Call functions
    document.getElementById("select_x").value = axis.x;
    document.getElementById("select_y").value = axis.y;
    renderControls();
    addSliderEvents(axis);
    renderDownloads();
    //TODO render_collections_downloads();
    renderValues(axis, true);
    //Add change listener for axis change
    for (let axisSelector of document.getElementsByClassName("axis_selector")) {
        axisSelector.addEventListener("change", () =>
            render(document.getElementById("select_x").value, document.getElementById("select_y").value))
    }
    narrow(null, true);
    if (!hasLocalCopy()) {
        document.dispatchEvent(new Event(EventName.SAVE_TO_DATABASE));
    }
}

function createAxisSelector(axis) {
    const select = document.createElement("select");
    select.setAttribute("id", "select_" + axis);
    select.setAttribute("name", "select_" + axis);
    select.setAttribute("class", "axis_selector");
    return select;
}

function createSpecialContainer(name) {
    const text = document.createElement("div");
    text.setAttribute("id", name + "_wrapper");
    for (let i:number = 0; i < 2; i++) {
        const col = document.createElement("div");
        col.setAttribute("class", name + "_col");
        col.setAttribute("id", name + "_" + i);
        text.appendChild(col);
    }
    return text;
}

function makeSlidersSnapshot(axis:Axis, full:boolean):ReadonlyMap<string, Limits> {
    const snapshot:Map<string, Limits> = new Map();
    Array.from(KEY.map.keys())
        .filter(key => full || (key !== axis.x && key !== axis.y))
        .forEach(dimension => {
            let min = parseInt(document.getElementById(dimension + "_min").value),
                max = parseInt(document.getElementById(dimension + "_max").value);
            if (min > max) [min, max] = [max, min];
            snapshot.set(dimension, new Limits(min, max))
        });
    return snapshot;
}

function isNeedRecalculation(axis:Axis):boolean {
    const current_state:ReadonlyMap<string, Limits> = makeSlidersSnapshot(axis, false);
    for (let [key, val] of SLIDERS_SNAPSHOT) {
        const currentVal = current_state.get(key);
        if (currentVal.min !== val.min || currentVal.max !== val.max) {
            return true;
        }
    }
    return false;
}

function renderValues(axis:Axis, isInit:boolean): void {
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

function fillCells(results):void {
    if (results.total_cmpds > 0 && results.total_tranches > 0) {
        TOTALS_MAP.set("p_max_cmpds", results.total_cmpds);
        TOTALS_MAP.set("p_max_trs", results.total_tranches);
    }
    TRANCHES_MAP = results.tranches_map;
    const sum_map = new Map();
    results.final_map.forEach((num, final_key) => {
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
    const color_map = COLOR.map;
    const limits = Array.from(color_map.keys()), colors = Array.from(color_map.values());
    limits.push(Infinity);
    Array.from(document.getElementsByClassName("not_zero")).forEach(cell => {
        for (let color of colors) cell.classList.remove(color)
        const num = parseInt(cell.getAttribute("num"));
        for (let i = 0; i < limits.length; i++)
            if (num > limits[i] && num < limits[i + 1]) {
                cell.classList.add(color_map.get(limits[i]));
                break;
            }
    });
    narrow(document.getElementById("select_x").value);
    document.dispatchEvent(new Event(EventName.CALCULATION_DONE));
}

function renderControls():void {
    const dimensions = KEY.map;
    const keys = Array.from(dimensions.keys());
    const desc = DESCRIPTION.map;
    const column0 = document.getElementById("controls_0");
    const column1 = document.getElementById("controls_1");
    const magicNumbers: ReadonlyArray<number> = (key: string): ReadonlyArray<number> => {
        switch (key) {
            case "EnamineCC": case "SulfurAC": case "HalogenAC": case "DoubleBondIsomer": return [3, 442];
            case "ChiralCenter": case "NegCharge": case "PosCharge": return [3, 219, 435];
            case "MW": return [3, 101, 192, 283, 379];
            case "HBD": return [3, 108, 212, 317, 421];
            case "MR": return [3, 105, 202, 297, 393];
            case "AromProportion": return [3, 105, 202, 300, 394];
            case "HBA": case "RotB": return [3, 85, 168, 250, 330, 407];
            case "TPSA": return [3, 82, 158, 230, 299, 373];
            case "logS": return [0, 76, 154, 232, 309, 387];
            case "FormCharge": return [0, 76, 154, 232, 315, 396];
            case "Fsp3": return [3, 83, 158, 233, 309, 381];
            case "SlogP": return [0, 63, 130, 197, 265, 332, 400];
            default: throw "Illegal key '" + key + "' !";
        }
    }
    function createRangeInput(id, container, value, max) {
        const slider = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("step", "1");
        slider.setAttribute("min", "1");
        slider.setAttribute("max", "" + max);
        slider.setAttribute("value", "" + value);
        slider.setAttribute("id", id);
        container.appendChild(slider);
    }
    for (let key of keys) {
        const datalist = document.createElement("div"),
            listHolder = document.createDocumentFragment(),
            values = Array.from(dimensions.get(key).values()),
            length = values.length;
        datalist.setAttribute("class", "slider_label");
        datalist.setAttribute("id", key + "_values");
        for (let k = 0; k < length; k++) {
            const option = document.createElement("span");
            option.innerHTML = values[k];
            option.style.insetInlineStart = magicNumbers(key)[k] + "px";
            if (k === 0 || k === length - 1) {
                option.classList.add("highlighted");
            }
            listHolder.appendChild(option);
        }
        datalist.appendChild(listHolder);
        const label = document.createElement("label");
        label.setAttribute("class", "slider_name");
        label.setAttribute("id", key);
        //
        label.innerHTML = desc.get(key) + ": <span>" + values[0] + " to " + values[length - 1] + "</span>";
        const container = document.createElement("div");
        container.setAttribute("class", "slider");
        container.appendChild(label);
        createRangeInput(key + "_min", container, 1, length);
        createRangeInput(key + "_max", container, length, length);
        if (FIRST_COLUMN_SLIDERS.includes(key)) {
            column0.appendChild(container);
        } else {
            column1.appendChild(container);
        }
        document.getElementById(key).parentNode.appendChild(datalist);
    }
}

function addSliderEvents(axis:Axis):void {
    Array.from(document.getElementsByClassName("slider"))
        .filter(slider => slider.firstElementChild.id !== axis.x && slider.firstElementChild.id !== axis.y)
        .forEach(slider => Array.from(slider.querySelectorAll("input")).forEach(input => {
            ["mouseup"].forEach(ev => input.addEventListener(ev, (evt) => sliderEvent(input, evt, true)));
            ["input", "change"].forEach(ev => input.addEventListener(ev, (evt) => sliderEvent(input, evt, false)));
        }));
    [axis.x, axis.y].map(id => document.getElementById(id).parentNode)
        .forEach(slider => Array.from(slider.querySelectorAll("input")).forEach(input =>
            ["input", "change"].forEach(ev => input.addEventListener(ev, (evt) => sliderEvent(input, evt, true)))));
}

function sliderEvent(input, evt, withNarrow):void {
    const desc = DESCRIPTION.map;
    const sliders = input.parentNode.querySelectorAll("input");
    const label_node = input.parentNode.querySelector(".slider_name");
    const name = label_node.id;
    let slider1 = parseInt(sliders[0].value), slider2 = parseInt(sliders[1].value);
    if (slider1 === slider2) {
        //Limit sliders
        const max = document.getElementById(name + "_max"),
            min = document.getElementById(name + "_min");
        if(!KEY.dimensionsWithZero.has(name) && max.value === min.value) {
            if (max.max === max.value) min.value = max.max - 1;
            else max.value = min.value + 1;
        }
        slider1 = parseInt(sliders[0].value);
        slider2 = parseInt(sliders[1].value);
    }
    if (slider1 > slider2) {
        [slider2, slider1] = [slider1, slider2];
        sliders[0].value = slider1+"";
        sliders[1].value = slider2+"";
    }
    //Bold for selected
    const range_names = Array.from(document.getElementById(name + "_values").children);
    range_names.forEach(el => el.classList.remove("highlighted"));
    [range_names[slider1 - 1], range_names[slider2 - 1]].forEach(el => el.classList.add("highlighted"));
    //Render values above
    const values = Array.from(KEY.map.get(name).values());
    label_node.innerHTML = desc.get(name) + ": <span>" + values[slider1 - 1] + " to " + values[slider2 - 1] + "</span>";
    if(withNarrow) narrow(name);
}

function narrow(name, force) {
    const json_key = KEY.map;
    const x = document.getElementById("select_x").value,
        y = document.getElementById("select_y").value, isAxis = name === x || name === y;
    let cmpds_sum = 0, trs_sum = 0;
    const x_range = Array.from(json_key.get(x).keys());
    const y_range = Array.from(json_key.get(y).keys());
    //remove artificial limits
    if (!KEY.dimensionsWithZero.has(y)) y_range.shift();
    if (!KEY.dimensionsWithZero.has(x)) x_range.shift();
    const x_vals = {
        min: document.getElementById(x + "_min").value - 1,
        max: KEY.dimensionsWithZero.has(x)
            ? document.getElementById(x + "_max").value
            : document.getElementById(x + "_max").value - 1
    }
    const y_vals = {
        min: document.getElementById(y + "_min").value - 1,
        max: KEY.dimensionsWithZero.has(y)
            ? document.getElementById(y + "_max").value
            : document.getElementById(y + "_max").value - 1
    }
    function highlightRange(id, position) {
        const cell = document.getElementById(id);
        cell.classList.remove("unselected");
        cell.classList.add("selected", "selected" + position);
    }
    if (x_vals.min !== x_vals.max && y_vals.min !== y_vals.max) {
        if (x_vals.min > x_vals.max) {
            [x_vals.min, x_vals.max] = [x_vals.max, x_vals.min];
        }
        if (y_vals.min > y_vals.max) {
            [y_vals.min, y_vals.max] = [y_vals.max, y_vals.min];
        }
        const x_finals = [], y_finals = [];
        for (let i = x_vals.min; i < x_vals.max; i++) x_finals.push(x_range[i]);
        for (let i = y_vals.min; i < y_vals.max; i++) y_finals.push(y_range[i]);
        if (isAxis) Array.from(document.getElementsByClassName("inbox"))
            .forEach(cell => cell.classList.remove("inbox"));
        //Calculate inbox
        for (let y_final of y_finals) {
            for (let x_final of x_finals) {
                const cell = document.getElementById(x_final + y_final);
                if (isAxis || force) cell.classList.add("inbox");
                cmpds_sum = cmpds_sum + parseInt(cell.getAttribute("num"));
                if (TRANCHES_MAP.has(x_final + y_final))
                    trs_sum = trs_sum + TRANCHES_MAP.get(x_final + y_final).length;
            }
        }
        if (isAxis || force) {
            const selection = Array.from(document.getElementsByClassName("selected"));
            if (selection.length > 0) {
                selection.forEach(cell => {
                    cell.classList.remove("selected", "selectedRight", "selectedLeft", "selectedTop", "selectedBottom");
                    cell.classList.add("unselected");
                });
            }
            //Right vertical
            for (let i = 0; i < y_range.length; i++)
                highlightRange(x_finals[x_finals.length - 1] + y_range[i], "Right");
            //Left vertical
            for (let i = 0; i < y_range.length; i++)
                highlightRange(x_finals[0] + y_range[i], "Left");
            //Top horizontal
            for (let i = 0; i < x_range.length; i++)
                highlightRange(x_range[i] + y_finals[0], "Top");
            //Bottom horizontal
            for (let i = 0; i < x_range.length; i++)
                highlightRange(x_range[i] + y_finals[y_finals.length - 1], "Bottom");
            for (let frame = 0; frame < 2; frame++) {
                const cells = [document.getElementById(x_finals[x_finals.length - 1] + frame),
                    document.getElementById(x_finals[0] + frame),
                    document.getElementById(frame + y_finals[0]),
                    document.getElementById(frame + y_finals[y_finals.length - 1])];
                cells.forEach(cell => {
                    cell.classList.remove("unselected");
                    cell.classList.add("selected");
                });
                cells[0].classList.add("selectedRight");
                cells[1].classList.add("selectedLeft");
                cells[2].classList.add("selectedTop");
                cells[3].classList.add("selectedBottom");
            }
        }
    }
    if(!isAxis) renderValues(x, y, false);
    //Add sums
    TOTALS_MAP.set("min_cmpds", cmpds_sum);
    TOTALS_MAP.set("min_trs", trs_sum);
    add_sum("compounds", "cmpds", "info_0");
    add_sum("tranches", "trs", "info_1");
}

function add_sum(name, param, parentId):void {
    const existing = document.getElementById(name);
    if (existing) existing.remove();
    const nodeHolder = document.createDocumentFragment();
    const pre = document.createElement("b"), after = document.createElement("b"),
        min = document.createElement("span"), max = document.createElement("span");
    pre.innerHTML = name.charAt(0).toUpperCase() + name.slice(1) + " selected: ";
    after.innerHTML = " from ";
    min.innerHTML = abbrN(TOTALS_MAP.get("min_" + param));
    max.innerHTML = abbrN(TOTALS_MAP.get("p_max_" + param));
    nodeHolder.append(pre, min, after, max);
    const node = document.createElement("div");
    node.setAttribute("id", name);
    node.appendChild(nodeHolder);
    document.getElementById(parentId).appendChild(node);
}

function renderDownloads():void {
    const Dloads:HTMLElement = document.createElement("div");
    Dloads.setAttribute("id", "download");
    Dloads.setAttribute("class", "download");
    Dloads.innerHTML = "<b>Download method for tranches:</b>";
    const selector:HTMLElement = document.createElement("select");
    selector.setAttribute("id", "DMethod");
    selector.setAttribute("name", "DMetod");
    Object.keys(Download).forEach(name => {
        const option = document.createElement("option");
        option.setAttribute("value", name);
        option.innerHTML = name;
        selector.appendChild(option);
    });
    Dloads.appendChild(selector);
    const DButton:HTMLElement = document.createElement("button");
    DButton.setAttribute("class", "button");
    DButton.setAttribute("id", "DSubmit");
    DButton.innerHTML = "Download";
    Dloads.appendChild(DButton);
    document.getElementById("controls_wrapper").parentNode.appendChild(Dloads);
    document.getElementById("DSubmit").addEventListener("click", ():void => {
        const d_root = DownloadURL.root;
        //Find selected tranches
        const method:string = document.getElementById("DMethod").value;
        const str:string = Download[method].tool;
        const ext:string = Download[method].extension;
        switch (method) {
            case "wget": {
                const regexp = make_regexp();
                const result = replaceAll(replaceAll(replaceAll(str,
                            DownloadTemplateMapping.tranch, regexp[1]),
                        DownloadTemplateMapping.meta, regexp[0]),
                    DownloadTemplateMapping.root, replaceAll(d_root, ".", "\\."));
                createFile([result], "tranches" + ext);
                break;
            }
            default: {
                const s = [];
                findInbox().forEach(final => {
                    let f = replaceAll(str, DownloadTemplateMapping.tranch, final);
                    f = replaceAll(f, DownloadTemplateMapping.meta, final.substring(0, 2));
                    f = replaceAll(f, DownloadTemplateMapping.root, d_root);
                    s.push(f);
                });
                createFile(s, "tranches" + ext);
            }
        }
    });
}

//const COLLECTIONS = {"JSON_collections_keys": "collections_tmp.json", "JSON_collections": "collections.json"};
// function render_collections_downloads() {
//     const DloadC = document.createElement("div");
//     DloadC.setAttribute("id", "downloadC");
//     DloadC.setAttribute("class", "download");
//     DloadC.innerHTML = "<b>Collection-length file:</b>";
//     const DButton = document.createElement("button");
//     DButton.setAttribute("class", "button tooltip");
//     DButton.setAttribute("data-tooltip", "Still downloading data...");
//     DButton.setAttribute("id", "DCSubmit");
//     DButton.innerHTML = "Download";
//     DloadC.appendChild(DButton);
//     document.getElementById("download").parentNode.appendChild(DloadC);
//     document.getElementById("DCSubmit").addEventListener("click", () => {
//         if (Object.keys(COLLECTIONS).every(key => PARAMS_MAP.has(key))) {
//             const collections = PARAMS_MAP.get("JSON_collections");
//             const collections_keys = PARAMS_MAP.get("JSON_collections_keys");
//             const ext = PARAMS_MAP.get("JSON_Dloads_ext").get("URLs");
//             const s = [];
//             findInbox().forEach(final  => {
//                 collections_keys.get(final).forEach(key => {
//                     s.push(final + "_" + key + " " + collections.get(final + "_" + key));
//                 });
//             });
//             createFile(s, "collections" + ext);
//         } else console.log("Please try again later.");
//     });
// }

function createFile(arr, filename):void {
    arr.push("");//Add last line
    const file = new Blob([arr.join("\n")], {type: "text/plain"});
    const a = document.createElement("a"), url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function findInbox() {
    return Array.from(document.getElementsByClassName("inbox"))
        .map(cell => cell.id)
        .filter(id => TRANCHES_MAP.has(id))
        .map(id => TRANCHES_MAP.get(id))
        .reduce((arr1, arr2) => [...arr1, ...arr2]);
}

function make_regexp():[string, string] {
    const full_snapshot = makeSlidersSnapshot(null, null, true);
    const json_key:ReadonlyMap<string, ReadonlyMap<string, string>> = KEY.map;
    const json_order:ReadonlyMap<string, number> = ORDER.map;
    const result = [];
    json_order.forEach(() => result.push([]));
    full_snapshot.forEach((value, key) => {
        const keys = Array.from(json_key.get(key).keys()),
            arr = result[json_order.get(key) - 1],
            min = value.min - 1, max = KEY.dimensionsWithZero.has(key) ? value.max : value.max - 1;
        if (!KEY.dimensionsWithZero.has(key)) keys.shift();
        for (let i = min; i < max; i++) arr.push(keys[i]);
    });
    return ["[" + result[0].join("|") + "][" + result[1].join("|") + "]",
        "[" + result.map(arr => arr.join("|")).join("][") + "]"]; //metatranch, tranch
}

function get_axis_length(param):number {
    return KEY.map.get(param).size;
}