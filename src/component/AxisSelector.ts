import {Constant} from "../Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import State from "../State.ts";


namespace AxisSelector {
    import Axis = Constant.Axis;
    import AxisValues = State.AxisValues;

    export function createAxisSelector(axis:Axis, values:AxisValues):HTMLElement {
        const select:HTMLElement = document.createElement("select");
        select.setAttribute("id", `select_${axis}`);
        select.setAttribute("name", `select_${axis}`);
        select.setAttribute("class", "axis_selector");

        const options:DocumentFragment = document.createDocumentFragment();
        for (const dimension:string of KEY.map.keys()) {
            if (values.getComplementValue(axis) !== dimension) {
                const option:HTMLElement = document.createElement("option");
                option.setAttribute("value", dimension);
                option.innerHTML = dimension;
                options.appendChild(option);
            }
        }
        select.appendChild(options);
        return select;
    }

    export function getAxisValue(axis:Axis):string {
        return document.getElementById(`select_${axis}`).value;
    }

    export function getAxisValues():AxisValues {
        return new AxisValues(getAxisValue(Axis.X), getAxisValue(Axis.Y),
        );
    }

    export function setAxisValues(values:AxisValues):void {
        document.getElementById("select_x").value = values.getValue(Axis.X);
        document.getElementById("select_y").value = values.getValue(Axis.Y);
    }
}