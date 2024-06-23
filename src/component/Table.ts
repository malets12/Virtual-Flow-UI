import {Constant} from "../data/Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {Model} from "../model/Model.ts";
import {AxisSelector} from "./AxisSelector.ts";

export namespace Table {
    export const ID: string = "table";

    export function renderTable(axisValues: Model.AxisValues): HTMLTableElement {
        const dimensionSelectorX: HTMLSelectElement = AxisSelector.createAxisSelector(Constant.Axis.X, axisValues);
        const dimensionSelectorY: HTMLSelectElement = AxisSelector.createAxisSelector(Constant.Axis.Y, axisValues);
        //Create table
        const table: HTMLTableElement = document.createElement("table");
        table.setAttribute("id", ID);
        const tableHolder: DocumentFragment = document.createDocumentFragment();
        //Header X
        tableHolder.appendChild(createFirstLine(dimensionSelectorX, Model.AxisValues.getValue(axisValues, Constant.Axis.X)));
        //Header Y
        tableHolder.appendChild(createSecondLine(dimensionSelectorY, Model.AxisValues.getValue(axisValues, Constant.Axis.Y)));
        //Call tranches
        const mapY: ReadonlyMap<string, string> | undefined = KEY.map.get(Model.AxisValues.getValue(axisValues, Constant.Axis.Y));
        const mapX: ReadonlyMap<string, string> | undefined = KEY.map.get(Model.AxisValues.getValue(axisValues, Constant.Axis.X));
        if (mapY === undefined || mapX === undefined) {
            throw `One of the dimensions '${Model.AxisValues.getValue(axisValues, Constant.Axis.X)}', '${Model.AxisValues.getValue(axisValues, Constant.Axis.Y)}' does not exist.`
        }
        const hasZeroDimensionX: boolean = KEY.dimensionsWithZero.has(Model.AxisValues.getValue(axisValues, Constant.Axis.X));
        const hasZeroDimensionY: boolean = KEY.dimensionsWithZero.has(Model.AxisValues.getValue(axisValues, Constant.Axis.Y));
        const keysY: ReadonlyArray<string> = Array.from(mapY.keys());
        const keysX: ReadonlyArray<string> = Array.from(mapX.keys());
        const lengthY: number = getAxisRanges(Model.AxisValues.getValue(axisValues, Constant.Axis.Y)) + (hasZeroDimensionY ? 1 : 0);
        const lengthX: number = getAxisRanges(Model.AxisValues.getValue(axisValues, Constant.Axis.X)) + (hasZeroDimensionX ? 1 : 0);
        //Cells
        for (let iterY: number = 0; iterY <= lengthY; iterY++) {
            const row: HTMLTableRowElement = document.createElement("tr");
            const rowHolder: DocumentFragment = document.createDocumentFragment();
            row.setAttribute("class", "row");
            for (let iterX: number = 0; iterX <= lengthX; iterX++) {
                const cell: HTMLTableCellElement = document.createElement("td");
                cell.style.height = `${641 / (getAxisRanges(Model.AxisValues.getValue(axisValues, Constant.Axis.Y)) + 5)}px`;
                if (iterY === 0 && iterX > 0) {
                    //First row
                    setClasses(cell, "axis cell frame unselected");
                    if (hasZeroDimensionX) {
                        setId(cell, `${keysX[iterX - 1]}#`);
                    } else {
                        setId(cell, `${keysX[iterX]}#`);
                    }
                    if (iterX === lengthX) {
                        setId(cell, "$#");
                        setText(cell, "Row sums:");
                    } else if (hasZeroDimensionX && (iterX === 1 || Model.AxisValues.getValue(axisValues, Constant.Axis.X) === "EnamineCC")) {
                        setText(cell, `${mapX.get(keysX[iterX - 1])}`);
                    } else if (hasZeroDimensionX) {
                        setText(cell, `${mapX.get(keysX[iterX - 2])} - ${mapX.get(keysX[iterX - 1])}`);
                    } else {
                        setText(cell, `${mapX.get(keysX[iterX - 1])} - ${mapX.get(keysX[iterX])}`);
                    }
                } else {
                    if (iterY > 0 && iterX === 0) {
                        //First column
                        setClasses(cell, "axis cell frame unselected");
                        if (hasZeroDimensionY) {
                            setId(cell, `#${keysY[iterY - 1]}`);
                        } else {
                            setId(cell, `#${keysY[iterY]}`);
                        }
                        if (iterY === lengthY) {
                            setId(cell, "#$");
                            setText(cell, "Column sums:");
                        } else if (hasZeroDimensionY && (iterY === 1 || Model.AxisValues.getValue(axisValues, Constant.Axis.Y) === "EnamineCC")) {
                            setText(cell, `${mapY.get(keysY[iterY - 1])}`);
                        } else if (hasZeroDimensionY) {
                            setText(cell, `${mapY.get(keysY[iterY - 2])} - ${mapY.get(keysY[iterY - 1])}`);
                        } else {
                            setText(cell, `${mapY.get(keysY[iterY - 1])} - ${mapY.get(keysY[iterY])}`);
                        }
                    } else {
                        //First cell or last cell
                        if (iterY === 0 && iterX === 0 || iterY === lengthY && iterX === lengthX) {
                            setClasses(cell, "cell frame unselected");
                        } else {
                            if (iterX === lengthX) { //Rows sums
                                setClasses(cell, "cell unselected rowSums");
                                if (hasZeroDimensionY) {
                                    setId(cell, `$${keysY[iterY - 1]}`);
                                } else {
                                    setId(cell, `$${keysY[iterY]}`);
                                }
                            } else if (iterY === lengthY) { //Column sums
                                setClasses(cell, "cell unselected columnSums");
                                if (hasZeroDimensionX) {
                                    setId(cell, `${keysX[iterX - 1]}$`);
                                } else {
                                    setId(cell, `${keysX[iterX]}$`);
                                }
                            } else {
                                //Plain cell
                                setClasses(cell, "cell unselected field");
                                if (hasZeroDimensionX && hasZeroDimensionY) {
                                    setId(cell, `${keysX[iterX - 1]}${keysY[iterY - 1]}`);
                                } else if (hasZeroDimensionX) {
                                    setId(cell, `${keysX[iterX - 1]}${keysY[iterY]}`);
                                } else if (hasZeroDimensionY) {
                                    setId(cell, `${keysX[iterX]}${keysY[iterY - 1]}`);
                                } else {
                                    setId(cell, `${keysX[iterX]}${keysY[iterY]}`);
                                }
                                cell.setAttribute("num", "0");
                            }
                            setText(cell, "0");
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

    function createFirstLine(dimensionSelector: HTMLSelectElement, dimensionX: string): HTMLTableRowElement {
        const firstLine: HTMLTableRowElement = document.createElement("tr");
        const placeholder: HTMLTableCellElement = document.createElement("th");
        const header: HTMLTableCellElement = document.createElement("th");
        placeholder.setAttribute("class", "cell");
        placeholder.setAttribute("id", "placeholder");
        header.setAttribute("colspan", getAxisRanges(dimensionX) + 1 + (KEY.dimensionsWithZero.has(dimensionX) ? 1 : 0));
        header.setAttribute("class", "cell");
        header.setAttribute("id", "headerX");
        header.appendChild(dimensionSelector);
        firstLine.appendChild(placeholder);
        firstLine.appendChild(header);
        return firstLine;
    }

    function createSecondLine(dimensionSelector: HTMLSelectElement, dimensionY: string): HTMLTableRowElement {
        const secondLine: HTMLTableRowElement = document.createElement("tr");
        const header: HTMLTableCellElement = document.createElement("th");
        header.setAttribute("rowspan", getAxisRanges(dimensionY) + 2 + (KEY.dimensionsWithZero.has(dimensionY) ? 1 : 0));
        header.setAttribute("class", "cell");
        header.setAttribute("id", "headerY");
        header.appendChild(dimensionSelector);
        secondLine.appendChild(header);
        return secondLine;
    }
}