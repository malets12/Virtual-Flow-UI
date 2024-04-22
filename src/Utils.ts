import {Constant} from "./Constant.ts";
import LOCAL_COPY = Constant.LOCAL_COPY;

export function replaceAll(str: string, find: string, replace: string) {
    return str.replace(new RegExp(find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), replace);
}

export function objToStrMap<K, V>(obj: [K, V]): Map<K, V> {
    const result: Map<K, V> = new Map();
    for (const entry: [K, V] of Object.entries(obj)) {
        result.set(entry[0], entry[1])
    }
    return result;
}

export function abbrN(value:number):string {
    const asString = String(value);
    if (value >= 1000) {
        const suffixes: ReadonlyArray<string> = ["", "K", "M", "B", "T"];
        let suffixNum:number = Math.floor(asString.length / 3);
        let shortValue:number = parseFloat((suffixNum !== 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(3));
        if (shortValue < 1) {
            suffixNum--;
            shortValue = parseFloat((suffixNum !== 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(3));
        }
        return shortValue + suffixes[suffixNum];
    }
    return asString;
}

export function markHasLocalCopy():void {
    window.localStorage.setItem(LOCAL_COPY, "true");
}

export function doFullReload():void {
    window.localStorage.clear();
    location.reload();
}

export function showLoader():void {
    document.getElementById("loader").style.display = null;
}

export function hideLoader():void {
    document.getElementById("loader").style.display = "none";
}