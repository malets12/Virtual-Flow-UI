import {State} from "../State.ts";
import {abbrN} from "../Utils.ts";
import {Constant} from "../Constant.ts";

export namespace Wrapper {

    function createSumHolder(counter:Constant.Counter):HTMLDivElement {
        const existing:HTMLElement|null = document.getElementById(counter);
        if (existing !== null) {
            existing.remove();
        }
        const nodeHolder:DocumentFragment = document.createDocumentFragment();
        const pre:HTMLElement = document.createElement("b");
        const after:HTMLElement = document.createElement("b");
        const min:HTMLSpanElement = document.createElement("span");
        const max:HTMLSpanElement = document.createElement("span");
        pre.innerText = `${counter.charAt(0).toUpperCase()}${counter.slice(1)} selected: `;
        after.innerText = " from ";
        const state:State.Range = State.TOTALS.get(counter);
        min.innerText = abbrN(state.min);
        max.innerText = abbrN(state.max);
        nodeHolder.append(pre, min, after, max);
        const node:HTMLDivElement = document.createElement("div");
        node.setAttribute("id", counter);
        node.appendChild(nodeHolder);
        return node;
    }

    export function addSumWrappers():void {
        document.getElementById("info_0").appendChild(createSumHolder(Constant.Counter.COMPOUNDS));
        document.getElementById("info_1").appendChild(createSumHolder(Constant.Counter.TRANCHES));
    }
}