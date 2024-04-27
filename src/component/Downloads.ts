import {Download, DownloadTemplateMapping, DownloadURL} from "../data/mapping/download/download.ts";
import {replaceAll} from "../Utils.ts";
import {KEY} from "../data/mapping/key.ts";
import {ORDER} from "../data/mapping/order.ts";

namespace Downloads {
    export function renderDownloads():void {
        const Dloads:HTMLElement = document.createElement("div");
        Dloads.setAttribute("id", "download");
        Dloads.setAttribute("class", "download");
        Dloads.innerHTML = "<b>Download method for tranches:</b>";
        const selector:HTMLElement = document.createElement("select");
        selector.setAttribute("id", "DMethod");
        selector.setAttribute("name", "DMetod");
        Object.keys(Download).forEach(name => {
            const option = document.createElement("option");
            option.setAttribute("value", name);
            option.innerHTML = name;
            selector.appendChild(option);
        });
        Dloads.appendChild(selector);
        const DButton:HTMLElement = document.createElement("button");
        DButton.setAttribute("class", "button");
        DButton.setAttribute("id", "DSubmit");
        DButton.innerHTML = "Download";
        Dloads.appendChild(DButton);
        document.getElementById("controls_wrapper").parentNode.appendChild(Dloads);
        document.getElementById("DSubmit").addEventListener("click", ():void => {
            const d_root = DownloadURL.root;
            //Find selected tranches
            const method:string = document.getElementById("DMethod").value;
            const str:string = Download[method].tool;
            const ext:string = Download[method].extension;
            switch (method) {
                case "wget": {
                    const regexp = make_regexp();
                    const result = replaceAll(replaceAll(replaceAll(str,
                                DownloadTemplateMapping.tranch, regexp[1]),
                            DownloadTemplateMapping.meta, regexp[0]),
                        DownloadTemplateMapping.root, replaceAll(d_root, ".", "\\."));
                    createFile([result], "tranches" + ext);
                    break;
                }
                default: {
                    const s = [];
                    findInbox().forEach(final => {
                        let f = replaceAll(str, DownloadTemplateMapping.tranch, final);
                        f = replaceAll(f, DownloadTemplateMapping.meta, final.substring(0, 2));
                        f = replaceAll(f, DownloadTemplateMapping.root, d_root);
                        s.push(f);
                    });
                    createFile(s, "tranches" + ext);
                }
            }
        });
    }

    function createFile(arr, filename):void {
        arr.push("");//Add last line
        const file = new Blob([arr.join("\n")], {type: "text/plain"});
        const a = document.createElement("a"), url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    function make_regexp():[string, string] {
        const full_snapshot = makeSlidersSnapshot(null, null, true);
        const json_key:ReadonlyMap<string, ReadonlyMap<string, string>> = KEY.map;
        const json_order:ReadonlyMap<string, number> = ORDER.map;
        const result = [];
        json_order.forEach(() => result.push([]));
        full_snapshot.forEach((value, key) => {
            const keys = Array.from(json_key.get(key).keys()),
                arr = result[json_order.get(key) - 1],
                min = value.min - 1, max = KEY.dimensionsWithZero.has(key) ? value.max : value.max - 1;
            if (!KEY.dimensionsWithZero.has(key)) keys.shift();
            for (let i = min; i < max; i++) arr.push(keys[i]);
        });
        return ["[" + result[0].join("|") + "][" + result[1].join("|") + "]",
            "[" + result.map(arr => arr.join("|")).join("][") + "]"]; //metatranch, tranch
    }

    //const COLLECTIONS = {"JSON_collections_keys": "collections_tmp.json", "JSON_collections": "collections.json"};
// function render_collections_downloads() {
//     const DloadC = document.createElement("div");
//     DloadC.setAttribute("id", "downloadC");
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