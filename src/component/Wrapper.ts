namespace Wrapper {
    export function createSpecialContainer(name:string):HTMLElement {
        const text:HTMLElement = document.createElement("div");
        text.setAttribute("id", name + "_wrapper");
        for (let i:number = 0; i < 2; i++) {
            const col:HTMLElement = document.createElement("div");
            col.setAttribute("class", name + "_col");
            col.setAttribute("id", name + "_" + i);
            text.appendChild(col);
        }
        return text;
    }
}