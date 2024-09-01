import {Calculation} from "../compute/Calculation.ts";
import {Download, DownloadTemplateMapping, DownloadURL} from "../data/mapping/download/download.ts";
import {State} from "../compute/State.ts";
import {replaceAll} from "../compute/Utils.ts";
import {KEY} from "../data/mapping/key.ts";
import {ORDER} from "../data/mapping/order.ts";
import {Model} from "../model/Model.ts";

export namespace Downloads {
    export const ID: string = "download";
    export const COLLECTIONS_ID: string = "downloadC";

    export function renderDownloads(): void {
        const downloadsContainer: HTMLDivElement = document.createElement("div");
        downloadsContainer.setAttribute("id", ID);
        downloadsContainer.setAttribute("class", "download");
        downloadsContainer.innerHTML = "<b>Download method for tranches:</b>";
        const selector: HTMLSelectElement = document.createElement("select");
        selector.setAttribute("id", "DMethod");
        selector.setAttribute("name", "DMetod");
        for (const name: string of Object.keys(Download)) {
            const option: HTMLOptionElement = document.createElement("option");
            option.setAttribute("value", name);
            option.innerText = name;
            selector.appendChild(option);
        }
        downloadsContainer.appendChild(selector);
        const DButton: HTMLButtonElement = document.createElement("button");
        DButton.setAttribute("class", "button");
        DButton.setAttribute("id", "DSubmit");
        DButton.innerText = "Download";
        downloadsContainer.appendChild(DButton);
        document.getElementById("controls_wrapper").parentNode.appendChild(downloadsContainer);
        document.getElementById("DSubmit").addEventListener("click", (): void => {
            const d_root: string = DownloadURL.root;
            //Find selected tranches
            const methodSelector: HTMLInputElement = <HTMLInputElement>document.getElementById("DMethod");
            const method: string = methodSelector.value;
            const template: string = Download[method].template;
            const extension: string = Download[method].extension;
            switch (method) {
                case "wget": {
                    const regexp: [string, string] = makeRegexp();
                    const result: string = replaceAll(replaceAll(replaceAll(template,
                                DownloadTemplateMapping.tranch, regexp[1]),
                            DownloadTemplateMapping.meta, regexp[0]),
                        DownloadTemplateMapping.root, replaceAll(d_root, ".", "\\."));
                    createFile([result], `tranches${extension}`);
                    break;
                }
                default: {
                    const s: Array<string> = [];
                    for (const tranche: string of findInbox()) {
                        let f: string = replaceAll(template, DownloadTemplateMapping.tranch, tranche);
                        f = replaceAll(f, DownloadTemplateMapping.meta, tranche.substring(0, 2));
                        f = replaceAll(f, DownloadTemplateMapping.root, d_root);
                        s.push(f);
                    }
                    createFile(s, `tranches${extension}`);
                }
            }
        });
    }

    function createFile(arr: Array<string>, filename: string): void {
        arr.push(""); //Add last line
        const file: Blob = new Blob([arr.join("\n")], {type: "text/plain"});
        const a: HTMLAnchorElement = document.createElement("a");
        const url: string = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout((): void => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    function makeRegexp(): [string, string] {
        const result: Array<Array<string>> = [];
        ORDER.map.forEach(() => result.push([]));
        for (const [dimension, range]: [string, Model.Range] of State.Snapshot.getFull()) {
            const map: ReadonlyMap<string, string> | undefined = KEY.map.get(dimension);
            if (map === undefined) {
                continue;
            }
            const isZeroDimension: boolean = KEY.dimensionsWithZero.has(dimension);
            const keys: Array<string> = Array.from(map.keys());
            const arr: Array<string> = result[ORDER.map.get(dimension)];
            const min: number = range.min - 1;
            const max: number = isZeroDimension ? range.max : range.max - 1;
            if (!isZeroDimension) {
                keys.shift();
            }
            for (let i: number = min; i < max; i++) {
                arr.push(keys[i]);
            }
        }
        return [`[${result[0].join("|")}][${result[1].join("|")}]`,
            `[${result.map(arr => arr.join("|")).join("][")}]`]; //metatranch, tranch
    }

    function findInbox(): ReadonlyArray<string> | undefined {
        return Array.from(document.getElementsByClassName("inbox"))
            .map(cell => cell.id)
            .filter(id => Calculation.CALC_RESULT.getFinalResult()?.cellToTranches.has(id))
            .map(id => Calculation.CALC_RESULT.getFinalResult()?.cellToTranches.get(id))
            .reduce((arr1, arr2) => [...arr1, ...arr2]);
    }

//OLD CODE AS IS
//const COLLECTIONS = {"JSON_collections_keys": "collections_tmp.json", "JSON_collections": "collections.json"};
// function render_collections_downloads() {
//     const DloadC = document.createElement("div");
//     DloadC.setAttribute("id", COLLECTIONS_ID);
//     DloadC.setAttribute("class", "download");
//     DloadC.innerHTML = "<b>Collection-length file:</b>";
//     const DButton = document.createElement("button");
//     DButton.setAttribute("class", "button tooltip");
//     DButton.setAttribute("data-tooltip", "Still downloading data...");
//     DButton.setAttribute("id", "DCSubmit");
//     DButton.innerHTML = "Download";
//     DloadC.appendChild(DButton);
//     document.getElementById("download").parentNode.appendChild(DloadC);
//     document.getElementById("DCSubmit").addEventListener("click", () => {
//         if (Object.keys(COLLECTIONS).every(key => PARAMS_MAP.has(key))) {
//             const collections = PARAMS_MAP.get("JSON_collections");
//             const collections_keys = PARAMS_MAP.get("JSON_collections_keys");
//             const ext = PARAMS_MAP.get("JSON_Dloads_ext").get("URLs");
//             const s = [];
//             findInbox().forEach(final  => {
//                 collections_keys.get(final).forEach(key => {
//                     s.push(final + "_" + key + " " + collections.get(final + "_" + key));
//                 });
//             });
//             createFile(s, "collections" + ext);
//         } else console.log("Please try again later.");
//     });
// }
}