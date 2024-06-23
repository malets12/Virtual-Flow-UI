import {Calculation} from "../compute/Calculation.ts";
import {AxisSelector} from "../component/AxisSelector.ts";
import {Loader} from "../component/Loader.ts";
import {Slider} from "../component/Slider.ts";
import {Constant} from "../data/Constant.ts";
import {COLOR} from "../data/mapping/color.ts";
import {KEY} from "../data/mapping/key.ts";
import {Model} from "../model/Model.ts";
import {State} from "../compute/State.ts";
import {abbrN} from "../compute/Utils.ts";
import {Message} from "../worker/infrastructure/Message.ts";
import {Pool} from "../worker/Pool.ts";

export namespace ValuesDrawer {
    export async function render(axis: Model.AxisValues, isInit: boolean = false): Promise<void> {
        if (!isInit && !State.Snapshot.isNeedRecalculation(axis)) { //Check if other dimensions are in use
            return;
        }
        Loader.showLoader();
        State.Snapshot.saveNew(axis);
        const possibleValues: Map<string, Model.Range> = new Map();
        if (!isInit) {
            for (const [dimension, range]: [string, Model.Range] of State.Snapshot.current()) {
                const isZeroDimension: boolean = KEY.dimensionsWithZero.has(dimension);
                if (Model.Range.isWithZeroLength(range) && !isZeroDimension) {
                    throw "Illegal state: this limit is not allowed";
                }
                possibleValues.set(dimension, isZeroDimension ? new Model.Range(range.min - 1, range.max) : range);
            }
        }
        //Clear cell values
        for (const className: string of ["sum", "field"]) {
            for (const element: Element of document.getElementsByClassName(className)) {
                element.textContent = "0";
                element.setAttribute("num", "0");
            }
        }
        Calculation.CALC_RESULT.clearState();
        Pool.WORKER_POOL.notifyAll(new Message.CalculationRequest(isInit, axis, possibleValues, Array.from(State.Snapshot.current().keys())))
            .catch(error => console.error(error));
    }

    export function fillCells(result: Calculation.CalculationResult): void {
        if (result.totalCompounds > 0 && result.totalTranches > 0) {
            State.Totals.setMax(Constant.Counter.COMPOUNDS, result.totalCompounds);
            State.Totals.setMax(Constant.Counter.TRANCHES, result.totalTranches);
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
                summaryMap.set(element, sum === undefined ? num : sum + num);
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
        cell.classList.remove(...COLOR.values);
        for (let i: number = 0; i < COLOR.limits.length; i++) {
            if (num > COLOR.limits[i] && num < COLOR.limits[i + 1]) {
                cell.classList.add(COLOR.values[i]);
                break;
            }
        }
    }
}