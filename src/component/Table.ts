import State from "../State.ts";
import {Constant} from "../Constant.ts";
import AxisSelector from "./AxisSelector.ts";
import {KEY} from "../data/mapping/key.ts";

namespace Table {
    import AxisValues = State.AxisValues;
    import Axis = Constant.Axis;
    import createAxisSelector = AxisSelector.createAxisSelector;

    export function renderTable(axis:AxisValues):HTMLTableElement {
        const x_axis:string = axis.getValue(Axis.X);
        const y_axis:string = axis.getValue(Axis.Y);
        const select_x:HTMLSelectElement = createAxisSelector(Axis.X, axis);
        const select_y:HTMLSelectElement = createAxisSelector(Axis.Y, axis);
        //Create table
        const table:HTMLTableElement = document.createElement("table");
        table.setAttribute("id", "table");
        const tableHolder:DocumentFragment = document.createDocumentFragment();
        //Header X
        tableHolder.appendChild(createFirstLine(select_x, x_axis));
        //Header Y
        tableHolder.appendChild(createSecondLine(select_y, y_axis));
        //Call tranches
        const y_map:ReadonlyMap<string, string> = KEY.map.get(y_axis);
        const x_map:ReadonlyMap<string, string> = KEY.map.get(x_axis);
        const y_keys:ReadonlyArray<string> = Array.from(y_map.keys());
        const x_keys:ReadonlyArray<string> = Array.from(x_map.keys());
        const y_length:number = KEY.dimensionsWithZero.has(y_axis)
            ? getAxisRanges(y_axis) + 1 : getAxisRanges(y_axis);
        const x_length:number = KEY.dimensionsWithZero.has(x_axis)
            ? getAxisRanges(x_axis) + 1 : getAxisRanges(x_axis);
        //Cells
        for (let i:number = 0; i < y_length + 1; i++) {
            const row:HTMLTableRowElement = document.createElement("tr");
            const rowHolder:DocumentFragment = document.createDocumentFragment();
            row.setAttribute("class", "row");
            for (let k:number = 0; k < x_length + 1; k++) {
                const cell:HTMLTableCellElement = document.createElement("td");
                cell.style.height = `${641 / (getAxisRanges(y_axis) + 5)}px`;
                setClasses(cell, "cell unselected");
                if (i === 0 && k > 0) {
                    //First row
                    setClasses(cell, "axis cell frame unselected");
                    if (KEY.dimensionsWithZero.has(x_axis)) {
                        setId(cell, `${x_keys[k - 1]}1`);
                    } else {
                        setId(cell, `${x_keys[k]}1`);
                    }
                    if (k === x_length) {
                        setId(cell, "01");
                        setText(cell, "Row sums:");
                    } else if (KEY.dimensionsWithZero.has(x_axis) && (k === 1 || x_axis === "EnamineCC")) {
                        setText(cell, `${x_map.get(x_keys[k - 1])}`);
                    }
                    else if (KEY.dimensionsWithZero.has(x_axis)) {
                        setText(cell, `${x_map.get(x_keys[k - 2])} - ${x_map.get(x_keys[k - 1])}`);
                    }
                    else {
                        setText(cell, `${x_map.get(x_keys[k - 1])} - ${x_map.get(x_keys[k])}`);
                    }
                } else {
                    if (i > 0 && k === 0) {
                        //First column
                        setClasses(cell, "axis cell frame unselected");
                        if (KEY.dimensionsWithZero.has(y_axis)) {
                            setId(cell, `1${y_keys[i - 1]}`);
                        } else {
                            setId(cell, `1${y_keys[i]}`);
                        }
                        if (i === y_length) {
                            setId(cell, "10");
                            setText(cell, "Column sums:");
                        } else if (KEY.dimensionsWithZero.has(y_axis) && (i === 1 || y_axis === "EnamineCC")) {
                            setText(cell, `${y_map.get(y_keys[i - 1])}`);
                        } else if (KEY.dimensionsWithZero.has(y_axis)) {
                            setText(cell, `${y_map.get(y_keys[i - 2])} - ${y_map.get(y_keys[i - 1])}`);
                        } else {
                            setText(cell, `${y_map.get(y_keys[i - 1])} - ${y_map.get(y_keys[i])}`);
                        }
                    } else {
                        //First cell
                        if (i === 0 && k === 0) {
                            setClasses(cell, "cell frame unselected");
                        }
                        else {
                            //Last cell
                            if (i === y_length && k === x_length) {
                                setClasses(cell, "cell frame unselected");
                            }
                            else {
                                if (k === x_length) { //Rows sums
                                    if (KEY.dimensionsWithZero.has(y_axis)) {
                                        setId(cell, `0${y_keys[i - 1]}`);
                                    } else {
                                        setId(cell, `0${y_keys[i]}`);
                                    }
                                } else if (i === y_length) { //Column sums
                                    if (KEY.dimensionsWithZero.has(x_axis)) {
                                        setId(cell, `${x_keys[k - 1]}0`);
                                    } else {
                                        setId(cell, `${x_keys[k]}0`);
                                    }
                                } else {
                                    //Plain cell
                                    setClasses(cell, "cell unselected field");
                                    if (KEY.dimensionsWithZero.has(x_axis) && KEY.dimensionsWithZero.has(y_axis)) {
                                        setId(cell, `${x_keys[k - 1]}${y_keys[i - 1]}`);
                                    } else if (KEY.dimensionsWithZero.has(x_axis)) {
                                        setId(cell, `${x_keys[k - 1]}${y_keys[i]}`);
                                    } else if (KEY.dimensionsWithZero.has(y_axis)) {
                                        setId(cell, `${x_keys[k]}${y_keys[i - 1]}`);
                                    } else {
                                        setId(cell, `${x_keys[k]}${y_keys[i]}`);
                                    }
                                    cell.setAttribute("num", "0");
                                }
                                setText(cell, "0");
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

    function getAxisRanges(dimension:string):number {
        return KEY.map.get(dimension).size;
    }

    function setClasses(cell:HTMLTableCellElement, classes:string):void {
        cell.setAttribute("class", classes);
    }

    function setId(cell:HTMLTableCellElement, id:string):void {
        cell.setAttribute("id", id);
    }

    function setText(cell:HTMLTableCellElement, text:string):void {
        cell.innerText = text;
    }

    function createFirstLine(select_x:HTMLSelectElement, x_axis:string):HTMLTableRowElement {
        const first_line:HTMLTableRowElement = document.createElement("tr");
        const placeholder:HTMLTableCellElement = document.createElement("th");
        const x_axis_name:HTMLTableCellElement = document.createElement("th");
        placeholder.setAttribute("class", "cell");
        placeholder.setAttribute("id", "placeholder");
        x_axis_name.setAttribute("colspan", getAxisRanges(x_axis) + 1 + (KEY.dimensionsWithZero.has(x_axis) ? 1 : 0));
        x_axis_name.setAttribute("class", "cell");
        x_axis_name.setAttribute("id", "x_axis");
        x_axis_name.appendChild(select_x);
        first_line.appendChild(placeholder);
        first_line.appendChild(x_axis_name);
        return first_line;
    }

    function createSecondLine(select_y:HTMLSelectElement, y_axis:string):HTMLTableRowElement {
        const second_line:HTMLTableRowElement = document.createElement("tr");
        const y_axis_name:HTMLTableCellElement = document.createElement("th");
        y_axis_name.setAttribute("rowspan", getAxisRanges(y_axis) + 2 + (KEY.dimensionsWithZero.has(y_axis) ? 1 : 0));
        y_axis_name.setAttribute("class", "cell");
        y_axis_name.setAttribute("id", "y_axis");
        y_axis_name.appendChild(select_y);
        second_line.appendChild(y_axis_name);
        return second_line;
    }
}