import {KEY} from "../data/mapping/key.ts";
import {DESCRIPTION} from "../data/mapping/description.ts";
import type {Axis} from "../State.ts";
import {Constant} from "../Constant.ts";
import Wrapper from "./Wrapper.ts";
import State from "../State.ts";
import AxisSelector from "./AxisSelector.ts";

namespace Slider {
    
    import FIRST_COLUMN_SLIDERS = Constant.FIRST_COLUMN_SLIDERS;
    import addSumWrappers = Wrapper.addSumWrappers;
    import TOTALS = State.TOTALS;
    import getAxisValue = AxisSelector.getAxisValue;
    import Limits = State.Limits;
    import Counter = Constant.Counter;
    
    export function renderControls():void {
        const column0:HTMLElement = document.getElementById("controls_0");
        const column1:HTMLElement = document.getElementById("controls_1");
        for (const key:string of KEY.map.keys()) {
            const datalist:HTMLElement = document.createElement("div");
            const listHolder:DocumentFragment = document.createDocumentFragment();
            const sliderValues:ReadonlyArray<string> = Array.from(KEY.map.get(key).values());
            const length:number = sliderValues.length;
            datalist.setAttribute("class", "slider_label");
            datalist.setAttribute("id", key + "_values");
            for (let k:number = 0; k < length; k++) {
                const option:HTMLElement = document.createElement("span");
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
            label.innerHTML = `${DESCRIPTION.map.get(key)}: <span>${sliderValues[0]} to ${sliderValues[length - 1]}</span>`;
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

    function sliderEvent(input, evt, withNarrow:boolean):void {
        const sliders = input.parentNode.querySelectorAll("input");
        const labelNode = input.parentNode.querySelector(".slider_name");
        const name:string = labelNode.id;
        let slider1:number = parseInt(sliders[0].value);
        let slider2:number = parseInt(sliders[1].value);
        if (slider1 === slider2) {
            //Limit sliders
            const max = document.getElementById(name + "_max");
            const min = document.getElementById(name + "_min");
            if(!KEY.dimensionsWithZero.has(name) && max.value === min.value) {
                if (max.max === max.value) min.value = max.max - 1;
                else max.value = min.value + 1;
            }
            slider1 = parseInt(sliders[0].value);
            slider2 = parseInt(sliders[1].value);
        }
        if (slider1 > slider2) {
            [slider2, slider1] = [slider1, slider2];
            sliders[0].value = String(slider1);
            sliders[1].value = String(slider2);
        }
        //Bold for selected
        const range_names = Array.from(document.getElementById(name + "_values").children);
        range_names.forEach(el => el.classList.remove("highlighted"));
        [range_names[slider1 - 1], range_names[slider2 - 1]].forEach(el => el.classList.add("highlighted"));
        //Render values above
        const values:ReadonlyArray<string> = Array.from(KEY.map.get(name).values());
        labelNode.innerHTML = `${DESCRIPTION.map.get(name)}: <span>${values[slider1 - 1]} to ${values[slider2 - 1]}</span>`;
        if (withNarrow) {
            narrow(name);
        }
    }

    export function narrow(name:string, withForce:boolean = false):void {
        const x:string = getAxisValue(Axis.X);
        const y:string = getAxisValue(Axis.Y);
        const isAxis:boolean = name === x || name === y;
        let compoundsSum:number = 0
        let tranchesSum:number = 0;
        const x_range:Array<string> = Array.from(KEY.map.get(x).keys());
        const y_range:Array<string> = Array.from(KEY.map.get(y).keys());
        //remove artificial limits
        if (!KEY.dimensionsWithZero.has(y)){
            y_range.shift();
        }
        if (!KEY.dimensionsWithZero.has(x)){
            x_range.shift();
        }
        const rangeX:Limits = new Limits(
            document.getElementById(x + "_min").value - 1,
            KEY.dimensionsWithZero.has(x)
                ? document.getElementById(x + "_max").value
                : document.getElementById(x + "_max").value - 1
        ).getValidated();
        const rangeY:Limits = new Limits(
            document.getElementById(y + "_min").value - 1,
            KEY.dimensionsWithZero.has(y)
                ? document.getElementById(y + "_max").value
                : document.getElementById(y + "_max").value - 1
        ).getValidated();
        if (rangeX.min !== rangeX.max && rangeY.min !== rangeY.max) {
            const x_finals:ReadonlyArray<string> = [];
            const y_finals:ReadonlyArray<string> = [];
            for (let i:number = rangeX.min; i < rangeX.max; i++) {
                x_finals.push(x_range[i]);
            }
            for (let i:number = rangeY.min; i < rangeY.max; i++) {
                y_finals.push(y_range[i]);
            }
            if (isAxis) {
                for (const cell:HTMLElement of document.getElementsByClassName("inbox")) {
                    cell.classList.remove("inbox");
                }
            }
            //Calculate inbox
            for (const y_final:string of y_finals) {
                for (const x_final:string of x_finals) {
                    const cell:HTMLElement = document.getElementById(x_final + y_final);
                    if (isAxis || withForce) cell.classList.add("inbox");
                    compoundsSum = compoundsSum + parseInt(cell.getAttribute("num"));
                    if (cellToTranches.has(x_final + y_final))
                        tranchesSum = tranchesSum + cellToTranches.get(x_final + y_final).length;
                }
            }
            if (isAxis || withForce) {
                const selection:HTMLCollection<HTMLElement> = document.getElementsByClassName("selected");
                if (selection.length > 0) {
                    for (const cell:HTMLElement of selection) {
                        cell.classList.remove("selected", "selectedRight", "selectedLeft", "selectedTop", "selectedBottom");
                        cell.classList.add("unselected");
                    }
                }
                for (let i:number = 0; i < y_range.length; i++) {
                    highlightRange(x_finals[x_finals.length - 1] + y_range[i], "Right"); //Right vertical
                    highlightRange(x_finals[0] + y_range[i], "Left"); //Left vertical
                }
                for (let i:number = 0; i < x_range.length; i++) {
                    highlightRange(x_range[i] + y_finals[0], "Top"); //Top horizontal
                    highlightRange(x_range[i] + y_finals[y_finals.length - 1], "Bottom"); //Bottom horizontal
                }
                for (let frame:number = 0; frame < 2; frame++) {
                    const cells:ReadonlyArray<HTMLElement> = [
                        document.getElementById(x_finals[x_finals.length - 1] + frame),
                        document.getElementById(x_finals[0] + frame),
                        document.getElementById(frame + y_finals[0]),
                        document.getElementById(frame + y_finals[y_finals.length - 1])
                    ];
                    for (const cell:HTMLElement of cells) {
                        cell.classList.remove("unselected");
                        cell.classList.add("selected");
                    }
                    cells[0].classList.add("selectedRight");
                    cells[1].classList.add("selectedLeft");
                    cells[2].classList.add("selectedTop");
                    cells[3].classList.add("selectedBottom");
                }
            }
        }
        if(!isAxis) {
            renderValues(x, y);
        }
        //Add sums
        TOTALS.setMin(Counter.COMPOUNDS, compoundsSum)
        TOTALS.setMin(Counter.TRANCHES, tranchesSum);
        addSumWrappers();
    }

    function createRangeInput(id:string, container:HTMLElement, value:number, max:number):void {
        const slider:HTMLElement = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("step", "1");
        slider.setAttribute("min", "1");
        slider.setAttribute("max", "" + max);
        slider.setAttribute("value", "" + value);
        slider.setAttribute("id", id);
        container.appendChild(slider);
    }

    function highlightRange(id:string, position:string):void {
        const cell:HTMLElement = document.getElementById(id);
        cell.classList.remove("unselected");
        cell.classList.add("selected", "selected" + position);
    }
}