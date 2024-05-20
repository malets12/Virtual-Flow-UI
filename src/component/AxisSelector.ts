import {Constant} from "../Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {State} from "../State.ts";
import {Values} from "../Values.ts";

export namespace AxisSelector {
    import Axis = Constant.Axis;

    export function createAxisSelector(axis:Axis, values:State.AxisValues):HTMLSelectElement {
        const select:HTMLSelectElement = document.createElement("select");
        select.setAttribute("id", `select_${axis}`);
        select.setAttribute("name", `select_${axis}`);
        select.setAttribute("class", "axis_selector");

        const options:DocumentFragment = document.createDocumentFragment();
        for (const dimension:string of KEY.map.keys()) {
            if (values.getComplementValue(axis) !== dimension) {
                const option:HTMLOptionElement = document.createElement("option");
                option.setAttribute("value", dimension);
                option.innerHTML = dimension;
                options.appendChild(option);
            }
        }
        select.appendChild(options);
        return select;
    }

    export function getAxisValue(axis:Axis):string {
        const select:HTMLInputElement|null = <HTMLInputElement|null>document.getElementById(`select_${axis}`);
        return select !== null ? select.value : "";
    }

    export function getAxisValues():State.AxisValues {
        return new State.AxisValues(getAxisValue(Axis.X), getAxisValue(Axis.Y));
    }

    export function setAxisValues(values:State.AxisValues):void {
        const selectX:HTMLInputElement|null = <HTMLInputElement|null>document.getElementById("select_x");
        if (selectX !== null) {
            selectX.value = values.getValue(Axis.X);
        }
        const selectY:HTMLInputElement|null = <HTMLInputElement|null>document.getElementById("select_y");
        if (selectY !== null) {
            selectY.value = values.getValue(Axis.X);
        }
    }

    export function addChangeListener(): void {
        for (const axisSelector: HTMLElement of document.getElementsByClassName("axis_selector")) {
            axisSelector.addEventListener("change", () => Values.render(AxisSelector.getAxisValues()));
        }
    }
}