import {Constant} from "../Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {State} from "../State.ts";
import {AxisSelector} from "./AxisSelector.ts";

export namespace Table {

    export const ID: string = "table";

    export function renderTable(axis: State.AxisValues): HTMLTableElement {
        const dimensionX: string = axis.getValue(Constant.Axis.X);
        const dimensionY: string = axis.getValue(Constant.Axis.Y);
        const select_x: HTMLSelectElement = AxisSelector.createAxisSelector(Constant.Axis.X, axis);
        const select_y: HTMLSelectElement = AxisSelector.createAxisSelector(Constant.Axis.Y, axis);
        //Create table
        const table: HTMLTableElement = document.createElement("table");
        table.setAttribute("id", ID);
        const tableHolder: DocumentFragment = document.createDocumentFragment();
        //Header X
        tableHolder.appendChild(createFirstLine(select_x, dimensionX));
        //Header Y
        tableHolder.appendChild(createSecondLine(select_y, dimensionY));
        //Call tranches
        const y_map: ReadonlyMap<string, string> | undefined = KEY.map.get(dimensionY);
        const x_map: ReadonlyMap<string, string> | undefined = KEY.map.get(dimensionX);
        if (y_map === undefined || x_map === undefined) {
            throw `One of the dimensions '${dimensionX}', '${dimensionY}' does not exist.`
        }
        const y_keys: ReadonlyArray<string> = Array.from(y_map.keys());
        const x_keys: ReadonlyArray<string> = Array.from(x_map.keys());
        const y_length: number = KEY.dimensionsWithZero.has(dimensionY)
            ? getAxisRanges(dimensionY) + 1 : getAxisRanges(dimensionY);
        const x_length: number = KEY.dimensionsWithZero.has(dimensionX)
            ? getAxisRanges(dimensionX) + 1 : getAxisRanges(dimensionX);
        //Cells
        for (let i: number = 0; i < y_length + 1; i++) {
            const row: HTMLTableRowElement = document.createElement("tr");
            const rowHolder: DocumentFragment = document.createDocumentFragment();
            row.setAttribute("class", "row");
            for (let k: number = 0; k < x_length + 1; k++) {
                const cell: HTMLTableCellElement = document.createElement("td");
                cell.style.height = `${641 / (getAxisRanges(dimensionY) + 5)}px`;
                setClasses(cell, "cell unselected");
                if (i === 0 && k > 0) {
                    //First row
                    setClasses(cell, "axis cell frame unselected");
                    if (KEY.dimensionsWithZero.has(dimensionX)) {
                        setId(cell, `${x_keys[k - 1]}1`);
                    } else {
                        setId(cell, `${x_keys[k]}1`);
                    }
                    if (k === x_length) {
                        setId(cell, "01");
                        setText(cell, "Row sums:");
                    } else if (KEY.dimensionsWithZero.has(dimensionX) && (k === 1 || dimensionX === "EnamineCC")) {
                        setText(cell, `${x_map?.get(x_keys[k - 1])}`);
                    } else if (KEY.dimensionsWithZero.has(dimensionX)) {
                        setText(cell, `${x_map?.get(x_keys[k - 2])} - ${x_map?.get(x_keys[k - 1])}`);
                    } else {
                        setText(cell, `${x_map?.get(x_keys[k - 1])} - ${x_map?.get(x_keys[k])}`);
                    }
                } else {
                    if (i > 0 && k === 0) {
                        //First column
                        setClasses(cell, "axis cell frame unselected");
                        if (KEY.dimensionsWithZero.has(dimensionY)) {
                            setId(cell, `1${y_keys[i - 1]}`);
                        } else {
                            setId(cell, `1${y_keys[i]}`);
                        }
                        if (i === y_length) {
                            setId(cell, "10");
                            setText(cell, "Column sums:");
                        } else if (KEY.dimensionsWithZero.has(dimensionY) && (i === 1 || dimensionY === "EnamineCC")) {
                            setText(cell, `${y_map?.get(y_keys[i - 1])}`);
                        } else if (KEY.dimensionsWithZero.has(dimensionY)) {
                            setText(cell, `${y_map?.get(y_keys[i - 2])} - ${y_map?.get(y_keys[i - 1])}`);
                        } else {
                            setText(cell, `${y_map?.get(y_keys[i - 1])} - ${y_map?.get(y_keys[i])}`);
                        }
                    } else {
                        //First cell
                        if (i === 0 && k === 0) {
                            setClasses(cell, "cell frame unselected");
                        } else {
                            //Last cell
                            if (i === y_length && k === x_length) {
                                setClasses(cell, "cell frame unselected");
                            } else {
                                if (k === x_length) { //Rows sums
                                    if (KEY.dimensionsWithZero.has(dimensionY)) {
                                        setId(cell, `0${y_keys[i - 1]}`);
                                    } else {
                                        setId(cell, `0${y_keys[i]}`);
                                    }
                                } else if (i === y_length) { //Column sums
                                    if (KEY.dimensionsWithZero.has(dimensionX)) {
                                        setId(cell, `${x_keys[k - 1]}0`);
                                    } else {
                                        setId(cell, `${x_keys[k]}0`);
                                    }
                                } else {
                                    //Plain cell
                                    setClasses(cell, "cell unselected field");
                                    if (KEY.dimensionsWithZero.has(dimensionX) && KEY.dimensionsWithZero.has(dimensionY)) {
                                        setId(cell, `${x_keys[k - 1]}${y_keys[i - 1]}`);
                                    } else if (KEY.dimensionsWithZero.has(dimensionX)) {
                                        setId(cell, `${x_keys[k - 1]}${y_keys[i]}`);
                                    } else if (KEY.dimensionsWithZero.has(dimensionY)) {
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

    function getAxisRanges(dimension: string): number {
        const map: ReadonlyMap<string, string> | undefined = KEY.map.get(dimension);
        return map !== undefined ? map.size : 0;
    }

    function setClasses(cell: HTMLTableCellElement, classes: string): void {
        cell.setAttribute("class", classes);
    }

    function setId(cell: HTMLTableCellElement, id: string): void {
        cell.setAttribute("id", id);
    }

    function setText(cell: HTMLTableCellElement, text: string): void {
        cell.innerText = text;
    }

    function createFirstLine(select_x: HTMLSelectElement, x_axis: string): HTMLTableRowElement {
        const first_line: HTMLTableRowElement = document.createElement("tr");
        const placeholder: HTMLTableCellElement = document.createElement("th");
        const x_axis_name: HTMLTableCellElement = document.createElement("th");
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

    function createSecondLine(select_y: HTMLSelectElement, y_axis: string): HTMLTableRowElement {
        const second_line: HTMLTableRowElement = document.createElement("tr");
        const y_axis_name: HTMLTableCellElement = document.createElement("th");
        y_axis_name.setAttribute("rowspan", getAxisRanges(y_axis) + 2 + (KEY.dimensionsWithZero.has(y_axis) ? 1 : 0));
        y_axis_name.setAttribute("class", "cell");
        y_axis_name.setAttribute("id", "y_axis");
        y_axis_name.appendChild(select_y);
        second_line.appendChild(y_axis_name);
        return second_line;
    }
}