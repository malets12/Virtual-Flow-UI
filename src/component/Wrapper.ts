import {abbrN} from "../Utils.ts";
import State from "../State.ts";
import {Constant} from "../Constant.ts";


namespace Wrapper {
    import TOTALS = State.TOTALS;
    import Limits = State.Limits;
    import Counter = Constant.Counter;

    function addSum(counter:Counter, parentId:string):void {
        const existing:HTMLElement|undefined = document.getElementById(counter);
        if (existing !== undefined) {
            existing.remove();
        }
        const nodeHolder:DocumentFragment = document.createDocumentFragment();
        const pre:HTMLElement = document.createElement("b");
        const after:HTMLElement = document.createElement("b");
        const min:HTMLElement = document.createElement("span");
        const max:HTMLElement = document.createElement("span");
        pre.innerHTML = counter.charAt(0).toUpperCase() + counter.slice(1) + " selected: ";
        after.innerHTML = " from ";
        const state:Limits = TOTALS.get(counter);
        min.innerHTML = abbrN(state.min);
        max.innerHTML = abbrN(state.max);
        nodeHolder.append(pre, min, after, max);
        const node:HTMLElement = document.createElement("div");
        node.setAttribute("id", counter);
        node.appendChild(nodeHolder);
        document.getElementById(parentId).appendChild(node);
    }

    export function addSumWrappers():void {
        addSum(Counter.COMPOUNDS, "info_0");
        addSum(Counter.TRANCHES, "info_1");
    }
}