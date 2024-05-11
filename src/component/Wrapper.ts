import {abbrN} from "../Utils.ts";
import State from "../State.ts";
import {Constant} from "../Constant.ts";


namespace Wrapper {
    import TOTALS = State.TOTALS;
    import Limits = State.Limits;
    import Counter = Constant.Counter;

    function createSumHolder(counter:Counter):HTMLDivElement {
        const existing:HTMLElement|undefined = <HTMLElement|undefined>document.getElementById(counter);
        if (existing !== undefined) {
            existing.remove();
        }
        const nodeHolder:DocumentFragment = document.createDocumentFragment();
        const pre:HTMLElement = document.createElement("b");
        const after:HTMLElement = document.createElement("b");
        const min:HTMLSpanElement = document.createElement("span");
        const max:HTMLSpanElement = document.createElement("span");
        pre.innerText = `${counter.charAt(0).toUpperCase()}${counter.slice(1)} selected: `;
        after.innerText = " from ";
        const state:Limits = TOTALS.get(counter);
        min.innerText = abbrN(state.min);
        max.innerText = abbrN(state.max);
        nodeHolder.append(pre, min, after, max);
        const node:HTMLDivElement = document.createElement("div");
        node.setAttribute("id", counter);
        node.appendChild(nodeHolder);
        return node;
    }

    export function addSumWrappers():void {
        document.getElementById("info_0").appendChild(createSumHolder(Counter.COMPOUNDS));
        document.getElementById("info_1").appendChild(createSumHolder(Counter.TRANCHES));
    }
}