import {Constant} from "../Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {State} from "../State.ts";
import {Values} from "../Values.ts";

export namespace AxisSelector {
    export function createAxisSelector(axis: Constant.Axis, values: State.AxisValues): HTMLSelectElement {
        const select: HTMLSelectElement = document.createElement("select");
        select.setAttribute("id", `select_${axis}`);
        select.setAttribute("name", `select_${axis}`);
        select.setAttribute("class", "axis_selector");

        const options: DocumentFragment = document.createDocumentFragment();
        for (const dimension: string of KEY.map.keys()) {
            if (getComplementValue(values, axis) !== dimension) {
                const option: HTMLOptionElement = document.createElement("option");
                option.setAttribute("value", dimension);
                option.innerHTML = dimension;
                options.appendChild(option);
            }
        }
        select.appendChild(options);
        return select;
    }

    function getComplementValue(values: State.AxisValues, axis: Constant.Axis): string {
        switch (axis) {
            case Constant.Axis.X:
                return values.y;
            case Constant.Axis.Y:
                return values.x;
        }
    }

    export function getAxisValue(axis: Constant.Axis): string {
        const select: HTMLInputElement | null = <HTMLInputElement | null>document.getElementById(`select_${axis}`);
        return select !== null ? select.value : "";
    }

    export function getAxisValues(): State.AxisValues {
        return new State.AxisValues(getAxisValue(Constant.Axis.X), getAxisValue(Constant.Axis.Y));
    }

    export function setAxisValues(values: State.AxisValues): void {
        const selectX: HTMLInputElement | null = <HTMLInputElement | null>document.getElementById("select_x");
        if (selectX !== null) {
            selectX.value = values.x;
        }
        const selectY: HTMLInputElement | null = <HTMLInputElement | null>document.getElementById("select_y");
        if (selectY !== null) {
            selectY.value = values.y;
        }
    }

    export function addChangeListener(): void {
        for (const axisSelector: HTMLElement of document.getElementsByClassName("axis_selector")) {
            axisSelector.addEventListener("change", () => Values.render(AxisSelector.getAxisValues()));
        }
    }
}