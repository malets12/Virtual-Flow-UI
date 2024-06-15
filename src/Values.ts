import {AxisSelector} from "./component/AxisSelector.ts";
import {Loader} from "./component/Loader.ts";
import {Slider} from "./component/Slider.ts";
import {Constant} from "./Constant.ts";
import {COLOR} from "./data/mapping/color.ts";
import {KEY} from "./data/mapping/key.ts";
import {Calculation, State} from "./State.ts";
import {abbrN} from "./Utils.ts";
import {Message} from "./worker/infrastructure/Message.ts";
import {Pool} from "./worker/Pool.ts";

export namespace Values {
    export async function render(axis: State.AxisValues, isInit: boolean = false): Promise<void> {
        if (!isInit && !State.SLIDERS_STATE.isNeedRecalculation(axis)) { //Check if other dimensions are in use
            return;
        }
        Loader.showLoader();
        State.SLIDERS_STATE.saveNew(axis);
        const notSelectedDimensions: ReadonlyArray<string> = Array.from(State.SLIDERS_STATE.map.keys());
        const possibleValues: Map<string, State.Range> = new Map();
        if (!isInit) {
            for (const dimension: string of notSelectedDimensions) {
                const limits: State.Range | undefined = State.SLIDERS_STATE.map.get(dimension);
                if (limits !== undefined) {
                    const isZeroDimension: boolean = KEY.dimensionsWithZero.has(dimension);
                    if (limits.min === limits.max && !isZeroDimension) {
                        throw "Illegal state: this limit is not allowed";
                    }
                    if (isZeroDimension) {
                        possibleValues.set(dimension, new State.Range(limits.min - 1, limits.max));
                    } else {
                        possibleValues.set(dimension, limits);
                    }
                }
            }
        }
        //Clear cell values
        for (const className: string of ["sum", "field"]) {
            for (const element: Element of document.getElementsByClassName(className)) {
                element.textContent = "0";
                element.setAttribute("num", "0");
            }
        }
        Pool.WORKER_POOL.notifyAll(new Message.CalculationRequest(isInit, axis, possibleValues, notSelectedDimensions))
            .catch(error => console.error(error));
    }

    export function fillCells(result: Calculation.CalculationResult): void {
        if (result.totalCompounds > 0 && result.totalTranches > 0) {
            State.TOTALS.setMax(Constant.Counter.COMPOUNDS, result.totalCompounds);
            State.TOTALS.setMax(Constant.Counter.TRANCHES, result.totalTranches);
        }
        fillCellsWithRowAndColumnSums(result);
        Slider.narrow(AxisSelector.getAxisValue(Constant.Axis.X));
        document.dispatchEvent(new Event(Constant.EventName.CALCULATION_DONE));
    }

    function fillCellsWithRowAndColumnSums(results: Calculation.CalculationResult): void {
        const summaryMap: Map<string, number> = new Map();
        for (const [id, num]: [string, number] of results.cellCounts) {
            const columnId: string = `${id.substring(0, 1)}$`;
            const rowId: string = `$${id.substring(1, 2)}`;
            for (const element: string of [columnId, rowId]) {
                const sum: number | undefined = summaryMap.get(element);
                if (sum === undefined) {
                    summaryMap.set(element, num);
                } else {
                    summaryMap.set(element, sum + num);
                }
            }
            const cell: HTMLElement | null = document.getElementById(id);
            if (cell !== null) {
                cell.classList.add("not_zero");
                cell.setAttribute("num", String(num));
                cell.textContent = abbrN(num);
                addColour(cell, num);
            }
        }
        for (const [id, sum]: [string, number] of summaryMap) {
            const cell: HTMLElement | null = document.getElementById(id);
            if (cell !== null) {
                cell.classList.add("frame", "sum");
                cell.setAttribute("num", String(sum));
                cell.textContent = abbrN(sum);
            }
        }
    }

    function addColour(cell: HTMLElement, num: number): void {
        for (const color: string of COLOR.map.values()) {
            cell.classList.remove(color);
        }
        for (let i: number = 0; i < COLOR.limits.length; i++) {
            const limit: number = COLOR.limits[i];
            if (num > limit && num < COLOR.limits[i + 1]) {
                const colorClass: string | undefined = COLOR.map.get(limit);
                if (colorClass !== undefined) {
                    cell.classList.add(colorClass);
                    break;
                }
            }
        }
    }
}