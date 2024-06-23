import {Constant} from "../data/Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {ComponentDrawer} from "../drawer/ComponentDrawer.ts";
import {Model} from "../model/Model.ts";

export namespace AxisSelector {
    export function createAxisSelector(axis: Constant.Axis, axisValues: Model.AxisValues): HTMLSelectElement {
        const select: HTMLSelectElement = document.createElement("select");
        select.setAttribute("id", `select_${axis}`);
        select.setAttribute("name", `select_${axis}`);
        select.setAttribute("class", "axis_selector");

        const options: DocumentFragment = document.createDocumentFragment();
        for (const dimension: string of KEY.map.keys()) {
            if (Model.AxisValues.getComplementValue(axisValues, axis) === dimension) {
                continue;
            }
            const option: HTMLOptionElement = document.createElement("option");
            option.setAttribute("value", dimension);
            option.innerText = dimension;
            options.appendChild(option);
        }
        select.appendChild(options);
        select.value = Model.AxisValues.getValue(axisValues, axis);
        select.addEventListener("change", () => ComponentDrawer.draw(AxisSelector.getAxisValues()));
        return select;
    }

    export function getAxisValue(axis: Constant.Axis): string {
        return getSelector(axis).value;
    }

    export function getAxisValues(): Model.AxisValues {
        return new Model.AxisValues(getAxisValue(Constant.Axis.X), getAxisValue(Constant.Axis.Y));
    }

    function getSelector(axis: Constant.Axis): HTMLSelectElement {
        const selector: HTMLElement | null = document.getElementById(`select_${axis}`);
        if (selector instanceof HTMLSelectElement) {
            return selector;
        } else {
            throw `No selector for axis '${axis}' found`;
        }
    }
}