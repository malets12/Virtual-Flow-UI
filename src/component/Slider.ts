import {KEY} from "../data/mapping/key.ts";
import {DESCRIPTION} from "../data/mapping/description.ts";
import {Constant} from "../Constant.ts";
import {Calculation, State} from "../State.ts";
import {AxisSelector} from "./AxisSelector.ts";
import {Wrapper} from "./Wrapper.ts";

export namespace Slider {

    export function renderControls():void {
        const column0:HTMLElement = document.getElementById("controls_0");
        const column1:HTMLElement = document.getElementById("controls_1");
        for (const dimension:string of KEY.map.keys()) {
            const datalist:HTMLDivElement = document.createElement("div");
            const listHolder:DocumentFragment = document.createDocumentFragment();
            const sliderValues:ReadonlyArray<string> = Array.from(KEY.map.get(dimension).values());
            const length:number = sliderValues.length;
            datalist.setAttribute("class", "slider_label");
            datalist.setAttribute("id", `${dimension}_values`);
            for (let k:number = 0; k < length; k++) {
                const option:HTMLSpanElement = document.createElement("span");
                option.innerHTML = sliderValues[k];
                option.style.insetInlineStart = `${Constant.sliderNameToPoints(dimension)[k]}px`;
                if (k === 0 || k === length - 1) {
                    option.classList.add("highlighted");
                }
                listHolder.appendChild(option);
            }
            datalist.appendChild(listHolder);
            const label:HTMLLabelElement = document.createElement("label");
            label.setAttribute("class", "slider_name");
            label.setAttribute("id", dimension);
            //
            label.innerHTML = `${DESCRIPTION.map.get(dimension)}: <span>${sliderValues[0]} to ${sliderValues[length - 1]}</span>`;
            const container:HTMLDivElement = document.createElement("div");
            container.setAttribute("class", "slider");
            container.appendChild(label);
            container.appendChild(createRangeInput(`${dimension}_min`, 1, length));
            container.appendChild(createRangeInput(`${dimension}_max`, length, length));
            if (Constant.FIRST_COLUMN_SLIDERS.includes(dimension)) {
                column0.appendChild(container);
            } else {
                column1.appendChild(container);
            }
            document.getElementById(dimension).parentNode.appendChild(datalist);
        }
    }

    export function addSliderEvents(axisValues:State.AxisValues):void {
        Array.from(document.getElementsByClassName("slider"))
            .filter(slider => slider.firstElementChild.id !== axisValues.getValue(Constant.Axis.X)
                && slider.firstElementChild.id !== axisValues.getValue(Constant.Axis.Y))
            .forEach(slider => Array.from(slider.querySelectorAll("input"))
                .forEach(input => {
                    ["mouseup"].forEach(ev => input.addEventListener(ev, (evt: Event) => sliderEvent(input, evt, true)));
                    ["input", "change"].forEach(ev => input.addEventListener(ev, (evt: Event) => sliderEvent(input, evt, false)));
                }));
        for (const dimension:string of [axisValues.getValue(Constant.Axis.X), axisValues.getValue(Constant.Axis.Y)]) {
            for (const slider:HTMLElement of [getAxisMinSlider(dimension), getAxisMaxSlider(dimension)]) {
                for (const eventName:string of ["input", "change"]) {
                    slider.addEventListener(eventName, (evt: Event) => sliderEvent(slider, evt, true));
                }
            }
        }
    }

    function sliderEvent(input:HTMLElement, evt:Event, withNarrow:boolean):void {
        const labelNode:HTMLElement = input.parentNode.querySelector(".slider_name");
        const dimension:string = labelNode.id;
        let range:State.Limits = getRange(dimension);
        if (range.areEqual()) {
            //Limit sliders
            const maxSlider:HTMLInputElement = getAxisMaxSlider(dimension);
            const minSlider:HTMLInputElement = getAxisMinSlider(dimension);
            if(!KEY.dimensionsWithZero.has(dimension)) {
                if (maxSlider.max === maxSlider.value) {
                    minSlider.value = String(parseInt(maxSlider.max) - 1);
                } else {
                    maxSlider.value = String(parseInt(minSlider.value) + 1);
                }
            }
            range = getRange(dimension);
        }
        if (range.isNotValid()) {
            range = range.getValidated();
            getAxisMinSlider(dimension).value = String(range.min);
            getAxisMaxSlider(dimension).value = String(range.max);
        }
        //Bold for selected
        const rangeNames:Element[] = Array.from(document.getElementById(`${dimension}_values`).children);
        for (const element:HTMLElement of rangeNames) {
            element.classList.remove("highlighted")
        }
        for (const element:HTMLElement of [rangeNames[range.min - 1], rangeNames[range.max - 1]]) {
            element.classList.add("highlighted")
        }
        //Render values above
        const values:ReadonlyArray<string> = Array.from(KEY.map.get(dimension).values());
        labelNode.innerHTML = `${DESCRIPTION.map.get(dimension)}: <span>${values[range.min - 1]} to ${values[range.max - 1]}</span>`;
        if (withNarrow) {
            narrow(dimension);
        }
    }

    export function narrow(name:string, withForce:boolean = false):void {
        const axisValues:State.AxisValues = AxisSelector.getAxisValues();
        const isAxis:boolean = name === axisValues.getValue(Constant.Axis.X) || name === axisValues.getValue(Constant.Axis.Y);
        let compoundsSum:number = 0
        let tranchesSum:number = 0;
        const lettersX:ReadonlyArray<string> = getAxisLetters(axisValues.getValue(Constant.Axis.X));
        const lettersY:ReadonlyArray<string> = getAxisLetters(axisValues.getValue(Constant.Axis.Y));
        const rangeX:State.Limits = getAxisSliderRange(axisValues.getValue(Constant.Axis.X));
        const rangeY:State.Limits = getAxisSliderRange(axisValues.getValue(Constant.Axis.Y));
        if (!rangeX.areEqual() && !rangeY.areEqual()) {
            const x_finals:Array<string> = [];
            const y_finals:Array<string> = [];
            for (let i:number = rangeX.min; i < rangeX.max; i++) {
                x_finals.push(lettersX[i]);
            }
            for (let i:number = rangeY.min; i < rangeY.max; i++) {
                y_finals.push(lettersY[i]);
            }
            if (isAxis) {
                for (const cell:HTMLElement of document.getElementsByClassName("inbox")) {
                    cell.classList.remove("inbox");
                }
            }
            //Calculate inbox
            for (const y_final:string of y_finals) {
                for (const x_final:string of x_finals) {
                    const cellId:string = `${x_final}${y_final}`;
                    const cell:HTMLElement = document.getElementById(cellId);
                    if (isAxis || withForce) {
                        cell.classList.add("inbox");
                    }
                    compoundsSum += parseInt(cell.getAttribute("num"));
                    const linkedTranches:ReadonlyArray<string>|undefined = Calculation.CALC_RESULT.finalResult?.cellToTranches.get(cellId);
                    if (linkedTranches !== undefined) {
                        tranchesSum += linkedTranches.length;
                    }
                }
            }
            if (isAxis || withForce) {
                const selection:HTMLCollection = document.getElementsByClassName("selected");
                if (selection.length > 0) {
                    for (const cell:HTMLElement of selection) {
                        cell.classList.remove("selected", "selectedRight", "selectedLeft", "selectedTop", "selectedBottom");
                        cell.classList.add("unselected");
                    }
                }
                for (let i:number = 0; i < lettersY.length; i++) {
                    highlightRange(`${x_finals[x_finals.length - 1]}${lettersY[i]}`, "Right"); //Right vertical
                    highlightRange(`${x_finals[0]}${lettersY[i]}`, "Left"); //Left vertical
                }
                for (let i:number = 0; i < lettersX.length; i++) {
                    highlightRange(`${lettersX[i]}${y_finals[0]}`, "Top"); //Top horizontal
                    highlightRange(`${lettersX[i]}${y_finals[y_finals.length - 1]}`, "Bottom"); //Bottom horizontal
                }
                for (let frame:number = 0; frame < 2; frame++) {
                    const cells:ReadonlyArray<HTMLElement> = [
                        document.getElementById(`${x_finals[x_finals.length - 1]}${frame}`),
                        document.getElementById(`${x_finals[0]}${frame}`),
                        document.getElementById(`${frame}${y_finals[0]}`),
                        document.getElementById(`${frame}${y_finals[y_finals.length - 1]}`)
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
            renderValues(axisValues);
        }
        //Add sums
        State.TOTALS.setMin(Constant.Counter.COMPOUNDS, compoundsSum)
        State.TOTALS.setMin(Constant.Counter.TRANCHES, tranchesSum);
        Wrapper.addSumWrappers();
    }

    function getAxisLetters(dimension:string):ReadonlyArray<string> {
        const letters:Array<string> = Array.from(KEY.map.get(dimension).keys());
        if (!KEY.dimensionsWithZero.has(dimension)) {
            letters.shift(); //remove artificial limit
        }
        return letters;
    }

    function createRangeInput(id:string, value:number, max:number):HTMLInputElement {
        const slider:HTMLInputElement = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("step", "1");
        slider.setAttribute("min", "1");
        slider.setAttribute("max", String(max));
        slider.setAttribute("value", String(value));
        slider.setAttribute("id", id);
        return slider;
    }

    function highlightRange(id:string, position:string):void {
        const cell:HTMLElement = document.getElementById(id);
        cell.classList.remove("unselected");
        cell.classList.add("selected", `selected${position}`);
    }

    function getAxisSliderRange(dimension:string):State.Limits {
        return new State.Limits(
            getRangeMin(dimension) - 1,
            KEY.dimensionsWithZero.has(dimension) ? getRangeMax(dimension) : getRangeMin(dimension) - 1
        ).getValidated();
    }

    export function getRange(dimension:string):State.Limits {
        return new State.Limits(getRangeMin(dimension), getRangeMax(dimension));
    }

    function getRangeMin(dimension:string):number {
        return parseInt(getAxisMinSlider(dimension).value);
    }

    function getRangeMax(dimension:string):number {
        return parseInt(getAxisMaxSlider(dimension).value);
    }

    function getAxisMinSlider(dimension:string):HTMLInputElement {
        return <HTMLInputElement>document.getElementById(`${dimension}_min`);
    }

    function getAxisMaxSlider(dimension:string):HTMLInputElement {
        return <HTMLInputElement>document.getElementById(`${dimension}_max`);
    }
}