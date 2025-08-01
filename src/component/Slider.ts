import {Calculation} from "../compute/Calculation.ts";
import {KEY} from "../data/mapping/key.ts";
import {DESCRIPTION} from "../data/mapping/description.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import {State} from "../compute/State.ts";
import {ValuesDrawer} from "../drawer/ValuesDrawer.ts";
import {AxisSelector} from "./AxisSelector.ts";
import {Wrapper} from "./Wrapper.ts";

export namespace Slider {
    export function renderControls(axisValues: Model.AxisValues): void {
        const column0: HTMLElement | null = document.getElementById("controls_0");
        const column1: HTMLElement | null = document.getElementById("controls_1");
        for (const dimension: string of KEY.map.keys()) {
            const datalist: HTMLDivElement = document.createElement("div");
            const listHolder: DocumentFragment = document.createDocumentFragment();
            const limits: ReadonlyMap<string, string> | undefined = KEY.map.get(dimension);
            if (limits === undefined) {
                continue;
            }
            const sliderValues: ReadonlyArray<string> = Array.from(limits.values());
            const length: number = sliderValues.length;
            datalist.setAttribute("class", "slider_label");
            datalist.setAttribute("id", `${dimension}_values`);
            for (let k: number = 0; k < length; k++) {
                const option: HTMLSpanElement = document.createElement("span");
                option.innerHTML = sliderValues[k];
                option.style.insetInlineStart = `${sliderNameToPoints(dimension)[k]}px`;
                if (k === 0 || k === length - 1) {
                    option.classList.add("highlighted");
                }
                listHolder.appendChild(option);
            }
            datalist.appendChild(listHolder);
            const label: HTMLLabelElement = document.createElement("label");
            label.setAttribute("class", "slider_name");
            label.setAttribute("id", dimension);
            //
            label.innerHTML = `${DESCRIPTION.map.get(dimension)}: <span>${sliderValues[0]} to ${sliderValues[length - 1]}</span>`;
            const container: HTMLDivElement = document.createElement("div");
            container.setAttribute("class", "slider");
            container.appendChild(label);
            const inputMin: HTMLInputElement = createRangeInput(`${dimension}_min`, 1, length);
            const inputMax: HTMLInputElement = createRangeInput(`${dimension}_max`, length, length);
            if (dimension === Model.AxisValues.getValue(axisValues, Constant.Axis.X) ||
                dimension === Model.AxisValues.getValue(axisValues, Constant.Axis.Y)) {
                for (const eventName: string of ["input", "change"]) {
                    inputMin.addEventListener(eventName, (evt: Event) => sliderEvent(inputMin, evt, true));
                    inputMax.addEventListener(eventName, (evt: Event) => sliderEvent(inputMax, evt, true));
                }
            } else {
                inputMin.addEventListener("mouseup", (evt: Event) => sliderEvent(inputMin, evt, true));
                inputMax.addEventListener("mouseup", (evt: Event) => sliderEvent(inputMax, evt, true));
                for (const ev: string of ["input", "change"]) {
                    inputMin.addEventListener(ev, (evt: Event) => sliderEvent(inputMin, evt, false));
                    inputMax.addEventListener(ev, (evt: Event) => sliderEvent(inputMax, evt, false));
                }
            }
            container.appendChild(inputMin);
            container.appendChild(inputMax);
            if (Constant.FIRST_COLUMN_SLIDERS.includes(dimension)) {
                column0?.appendChild(container);
            } else {
                column1?.appendChild(container);
            }
            document.getElementById(dimension).parentNode.appendChild(datalist);
        }
    }

    function sliderEvent(input: HTMLElement, evt: Event, withNarrow: boolean): void {
        const labelNode: HTMLElement = input?.parentNode.querySelector(".slider_name");
        const dimension: string = labelNode.id;
        let range: Model.Range = getRange(dimension);
        if (Model.Range.isWithZeroLength(range)) {
            //Limit sliders
            const maxSlider: HTMLInputElement = getAxisMaxSlider(dimension);
            const minSlider: HTMLInputElement = getAxisMinSlider(dimension);
            if (!KEY.dimensionsWithZero.has(dimension)) {
                if (maxSlider.max === maxSlider.value) {
                    minSlider.value = String(parseInt(maxSlider.max) - 1);
                } else {
                    maxSlider.value = String(parseInt(minSlider.value) + 1);
                }
            }
            range = getRange(dimension);
        }
        if (Model.Range.isNotValid(range)) {
            range = Model.Range.getValidated(range);
            getAxisMinSlider(dimension).value = String(range.min);
            getAxisMaxSlider(dimension).value = String(range.max);
        }
        //Bold for selected
        const rangeNames: Element[] = Array.from(document.getElementById(`${dimension}_values`).children);
        for (const element: HTMLElement of rangeNames) {
            element.classList.remove("highlighted")
        }
        for (const element: HTMLElement of [rangeNames[range.min - 1], rangeNames[range.max - 1]]) {
            element.classList.add("highlighted")
        }
        //Render values above
        const limits: ReadonlyMap<string, string> | undefined = KEY.map.get(dimension);
        if (limits !== undefined) {
            const values: ReadonlyArray<string> = Array.from(limits.values());
            labelNode.innerHTML = `${DESCRIPTION.map.get(dimension)}: <span>${values[range.min - 1]} to ${values[range.max - 1]}</span>`;
        }
        if (withNarrow) {
            narrow(dimension);
        }
    }

    export function narrow(name: string, withForce: boolean = false): void {
        const axisValues: Model.AxisValues = AxisSelector.getAxisValues();
        const isAxis: boolean = name === Model.AxisValues.getValue(axisValues, Constant.Axis.X) || name === Model.AxisValues.getValue(axisValues, Constant.Axis.Y);
        let compoundsSum: number = 0
        let tranchesSum: number = 0;
        const lettersX: ReadonlyArray<string> = getAxisLetters(Model.AxisValues.getValue(axisValues, Constant.Axis.X));
        const lettersY: ReadonlyArray<string> = getAxisLetters(Model.AxisValues.getValue(axisValues, Constant.Axis.Y));
        const rangeX: Model.Range = getAxisSliderRange(Model.AxisValues.getValue(axisValues, Constant.Axis.X));
        const rangeY: Model.Range = getAxisSliderRange(Model.AxisValues.getValue(axisValues, Constant.Axis.Y));
        if (!Model.Range.isWithZeroLength(rangeX) && !Model.Range.isWithZeroLength(rangeY)) {
            const finalsX: Array<string> = [];
            const finalsY: Array<string> = [];
            for (let i: number = rangeX.min; i < rangeX.max; i++) {
                finalsX.push(lettersX[i]);
            }
            for (let i: number = rangeY.min; i < rangeY.max; i++) {
                finalsY.push(lettersY[i]);
            }
            if (isAxis) {
                for (const cell: HTMLElement of document.getElementsByClassName("inbox")) {
                    cell.classList.remove("inbox");
                }
            }
            //Calculate inbox
            for (const y_final: string of finalsY) {
                for (const x_final: string of finalsX) {
                    const cellId: string = `${x_final}${y_final}`;
                    const cell: HTMLElement | null = document.getElementById(cellId);
                    if ((isAxis || withForce) && cell !== null) {
                        cell.classList.add("inbox");
                    }
                    compoundsSum += parseInt(cell?.getAttribute("num"));
                    const linkedTranches: ReadonlyArray<string> | undefined =
                        Calculation.CALC_RESULT.getFinalResult()?.cellToTranches.get(cellId);
                    if (linkedTranches !== undefined) {
                        tranchesSum += linkedTranches.length;
                    }
                }
            }
            if (isAxis || withForce) {
                const cells: Map<string, HTMLElement> = new Map();
                for (const letterX: string of [...lettersX, "#", "$"]) {
                    for (const letterY: string of [...lettersY, "#", "$"]) {
                        const cell: HTMLElement | null = document.getElementById(`${letterX}${letterY}`);
                        if (cell !== null) {
                            cells.set(cell.id, cell);
                            cell.classList.remove("selected", "selectedRight", "selectedLeft", "selectedTop", "selectedBottom");
                            cell.classList.add("unselected");
                        }
                    }
                }
                for (let i: number = 0; i < lettersY.length; i++) {
                    highlightRange(cells.get(`${finalsX[finalsX.length - 1]}${lettersY[i]}`), "Right"); //Right vertical
                    highlightRange(cells.get(`${finalsX[0]}${lettersY[i]}`), "Left"); //Left vertical
                }
                for (let i: number = 0; i < lettersX.length; i++) {
                    highlightRange(cells.get(`${lettersX[i]}${finalsY[0]}`), "Top"); //Top horizontal
                    highlightRange(cells.get(`${lettersX[i]}${finalsY[finalsY.length - 1]}`), "Bottom"); //Bottom horizontal
                }
                for (const frame: string of ["#", "$"]) { //Borders
                    const borderCells: ReadonlyArray<HTMLElement | undefined> = [
                        cells.get(`${finalsX[finalsX.length - 1]}${frame}`),
                        cells.get(`${finalsX[0]}${frame}`),
                        cells.get(`${frame}${finalsY[0]}`),
                        cells.get(`${frame}${finalsY[finalsY.length - 1]}`)
                    ];
                    for (const cell: HTMLElement of borderCells) {
                        cell?.classList.remove("unselected");
                        cell?.classList.add("selected");
                    }
                    borderCells[0]?.classList.add("selectedRight");
                    borderCells[1]?.classList.add("selectedLeft");
                    borderCells[2]?.classList.add("selectedTop");
                    borderCells[3]?.classList.add("selectedBottom");
                }
            }
        }
        if (!isAxis) {
            ValuesDrawer.render(axisValues)
                .catch(error => console.error(error));
        }
        //Add sums
        State.Totals.setMin(Constant.Counter.COMPOUNDS, compoundsSum);
        State.Totals.setMin(Constant.Counter.TRANCHES, tranchesSum);
        Wrapper.addSumWrappers();
    }

    function getAxisLetters(dimension: string): ReadonlyArray<string> {
        const limits: ReadonlyMap<string, string> | undefined = KEY.map.get(dimension);
        if (limits === undefined) {
            return [];
        }
        const letters: Array<string> = Array.from(limits.keys());
        if (!KEY.dimensionsWithZero.has(dimension)) {
            letters.shift(); //remove artificial limit
        }
        return letters;
    }

    function createRangeInput(id: string, value: number, max: number): HTMLInputElement {
        const slider: HTMLInputElement = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("step", "1");
        slider.setAttribute("min", "1");
        slider.setAttribute("max", String(max));
        slider.setAttribute("value", String(value));
        slider.setAttribute("id", id);
        return slider;
    }

    function highlightRange(cell: HTMLElement | undefined, position: string): void {
        cell?.classList.remove("unselected");
        cell?.classList.add("selected", `selected${position}`);
    }

    function getAxisSliderRange(dimension: string): Model.Range {
        return Model.Range.getValidated(new Model.Range(
            getRangeMin(dimension) - 1,
            getRangeMax(dimension) - (KEY.dimensionsWithZero.has(dimension) ? 0 : 1)
        ));
    }

    export function getRange(dimension: string): Model.Range {
        return new Model.Range(getRangeMin(dimension), getRangeMax(dimension));
    }

    function getRangeMin(dimension: string): number {
        return parseInt(getAxisMinSlider(dimension).value);
    }

    function getRangeMax(dimension: string): number {
        return parseInt(getAxisMaxSlider(dimension).value);
    }

    function getAxisMinSlider(dimension: string): HTMLInputElement {
        return <HTMLInputElement>document.getElementById(`${dimension}_min`);
    }

    function getAxisMaxSlider(dimension: string): HTMLInputElement {
        return <HTMLInputElement>document.getElementById(`${dimension}_max`);
    }

    function sliderNameToPoints(name: string): ReadonlyArray<number> {
        switch (name) {
            case "EnamineCC":
            case "SulfurAC":
            case "HalogenAC":
            case "DoubleBondIsomer":
                return [3, 442];
            case "ChiralCenter":
            case "NegCharge":
            case "PosCharge":
                return [3, 219, 435];
            case "MW":
                return [3, 101, 192, 283, 379];
            case "HBD":
                return [3, 108, 212, 317, 421];
            case "MR":
                return [3, 105, 202, 297, 393];
            case "AromProportion":
                return [3, 105, 202, 300, 394];
            case "HBA":
            case "RotB":
                return [3, 85, 168, 250, 330, 407];
            case "TPSA":
                return [3, 82, 158, 230, 299, 373];
            case "logS":
                return [0, 76, 154, 232, 309, 387];
            case "FormCharge":
                return [0, 76, 154, 232, 315, 396];
            case "Fsp3":
                return [3, 83, 158, 233, 309, 381];
            case "SlogP":
                return [0, 63, 130, 197, 265, 332, 400];
            default:
                throw `Illegal key '${name}'`;
        }
    }
}