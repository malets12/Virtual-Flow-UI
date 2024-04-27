import {KEY} from "../data/mapping/key.ts";
import AxisSelector from "./AxisSelector.ts";
import {Constant} from "../Constant.ts";

namespace Table {
    import createAxisSelector = AxisSelector.createAxisSelector;
    import AxisValues = State.AxisValues;
    import Axis = Constant.Axis;

    export function renderTable(axis:AxisValues):HTMLElement {
        const x_axis:string = axis.x;
        const y_axis:string = axis.y;
        const select_x:HTMLElement = createAxisSelector(Axis.X, axis);
        const select_y:HTMLElement = createAxisSelector(Axis.Y, axis);
        //Create table
        const table:HTMLElement = document.createElement("table");
        table.setAttribute("id", "table");
        const tableHolder:DocumentFragment = document.createDocumentFragment();
        //Header X
        const first_line:HTMLElement = document.createElement("tr");
        const placeholder:HTMLElement = document.createElement("th");
        const x_axis_name:HTMLElement = document.createElement("th");
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
        const second_line:HTMLElement = document.createElement("tr");
        const y_axis_name:HTMLElement = document.createElement("th");
        y_axis_name.setAttribute("rowspan", get_axis_length(y_axis) + 2 + (KEY.dimensionsWithZero.has(y_axis) ? 1 : 0));
        y_axis_name.setAttribute("class", "cell");
        y_axis_name.setAttribute("id", "y_axis");
        y_axis_name.appendChild(select_y);
        second_line.appendChild(y_axis_name);
        tableHolder.appendChild(second_line);
        //Call tranches
        const y_map:ReadonlyMap<string, string> = KEY.map.get(y_axis);
        const x_map:ReadonlyMap<string, string> = KEY.map.get(x_axis);
        const y_keys:ReadonlyArray<string> = Array.from(y_map.keys());
        const x_keys:ReadonlyArray<string> = Array.from(x_map.keys());
        const y_length:number = KEY.dimensionsWithZero.has(y_axis)
            ? get_axis_length(y_axis) + 1 : get_axis_length(y_axis);
        const x_length:number = KEY.dimensionsWithZero.has(x_axis)
            ? get_axis_length(x_axis) + 1 : get_axis_length(x_axis);
        //Cells
        for (let i = 0; i < y_length + 1; i++) {
            const row:HTMLElement = document.createElement("tr");
            const rowHolder:DocumentFragment = document.createDocumentFragment();
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
        return table;
    }

    function get_axis_length(param):number {
        return KEY.map.get(param).size;
    }
}