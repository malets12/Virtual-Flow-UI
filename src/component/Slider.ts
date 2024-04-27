import {KEY} from "../data/mapping/key.ts";
import {DESCRIPTION} from "../data/mapping/description.ts";
import type {Axis} from "../State.ts";
import {abbrN} from "../Utils.ts";
import {Constant} from "../Constant.ts";

namespace Slider {
    
    import FIRST_COLUMN_SLIDERS = Constant.FIRST_COLUMN_SLIDERS;

    function sliderNameToPoints(name:string):ReadonlyArray<number> {
        switch (name) {
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

    function createRangeInput(id, container, value:number, max:number):void {
        const slider:HTMLElement = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("step", "1");
        slider.setAttribute("min", "1");
        slider.setAttribute("max", "" + max);
        slider.setAttribute("value", "" + value);
        slider.setAttribute("id", id);
        container.appendChild(slider);
    }
    
    function renderControls():void {
        const column0:HTMLElement = document.getElementById("controls_0");
        const column1:HTMLElement = document.getElementById("controls_1");
        for (const key:ReadonlyArray<string> of Array.from(KEY.map.keys())) {
            const datalist:HTMLElement = document.createElement("div");
            const listHolder:DocumentFragment = document.createDocumentFragment();
            const sliderValues:ReadonlyArray<string> = Array.from(KEY.map.get(key).values());
            const length = sliderValues.length;
            datalist.setAttribute("class", "slider_label");
            datalist.setAttribute("id", key + "_values");
            for (const k:number = 0; k < length; k++) {
                const option = document.createElement("span");
                option.innerHTML = sliderValues[k];
                option.style.insetInlineStart = sliderNameToPoints(key)[k] + "px";
                if (k === 0 || k === length - 1) {
                    option.classList.add("highlighted");
                }
                listHolder.appendChild(option);
            }
            datalist.appendChild(listHolder);
            const label:HTMLElement = document.createElement("label");
            label.setAttribute("class", "slider_name");
            label.setAttribute("id", key);
            //
            label.innerHTML = DESCRIPTION.map.get(key) + ": <span>" + sliderValues[0] + " to " + sliderValues[length - 1] + "</span>";
            const container:HTMLElement = document.createElement("div");
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

    export function addSliderEvents(axis:Axis):void {
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
        label_node.innerHTML = DESCRIPTION.map.get(name) + ": <span>" + values[slider1 - 1] + " to " + values[slider2 - 1] + "</span>";
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
                    if (cellToTranches.has(x_final + y_final))
                        trs_sum = trs_sum + cellToTranches.get(x_final + y_final).length;
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
        const node:HTMLElement = document.createElement("div");
        node.setAttribute("id", name);
        node.appendChild(nodeHolder);
        document.getElementById(parentId).appendChild(node);
    }
}