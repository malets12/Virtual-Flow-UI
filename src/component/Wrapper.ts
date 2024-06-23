import {State} from "../State.ts";
import {abbrN} from "../Utils.ts";
import {Constant} from "../Constant.ts";

export namespace Wrapper {

    export const INFO_ID: string = "info_wrapper";
    export const CONTROLS_ID: string = "controls_wrapper";

    export function addSumWrappers(): void {
        document.getElementById("info_0").appendChild(createSumHolder(Constant.Counter.COMPOUNDS));
        document.getElementById("info_1").appendChild(createSumHolder(Constant.Counter.TRANCHES));
    }

    export function createInfoWrapper(): HTMLDivElement {
        return createWrapperContainer("info");
    }

    export function createControlsWrapper(): HTMLDivElement {
        return createWrapperContainer("controls");
    }

    function createSumHolder(counter: Constant.Counter): HTMLDivElement {
        const existing: HTMLElement | null = document.getElementById(counter);
        if (existing !== null) {
            existing.remove();
        }
        const nodeHolder: DocumentFragment = document.createDocumentFragment();
        const pre: HTMLElement = document.createElement("b");
        const after: HTMLElement = document.createElement("b");
        const min: HTMLSpanElement = document.createElement("span");
        const max: HTMLSpanElement = document.createElement("span");
        pre.innerText = `${counter.charAt(0).toUpperCase()}${counter.slice(1)} selected: `;
        after.innerText = " from ";
        const state: State.Range = State.Totals.get(counter);
        min.innerText = abbrN(state.min);
        max.innerText = abbrN(state.max);
        nodeHolder.append(pre, min, after, max);
        const node: HTMLDivElement = document.createElement("div");
        node.setAttribute("id", counter);
        node.appendChild(nodeHolder);
        return node;
    }

    function createWrapperContainer(name: string): HTMLDivElement {
        const text: HTMLDivElement = document.createElement("div");
        text.setAttribute("id", `${name}_wrapper`);
        for (let i: number = 0; i < 2; i++) {
            const col: HTMLDivElement = document.createElement("div");
            col.setAttribute("class", `${name}_col`);
            col.setAttribute("id", `${name}_${i}`);
            text.appendChild(col);
        }
        return text;
    }
}