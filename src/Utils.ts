import {Downloads} from "./component/Downloads.ts";
import {Table} from "./component/Table.ts";
import {Wrapper} from "./component/Wrapper.ts";

export function replaceAll(str:string, find:string, replace:string) {
    return str.replace(new RegExp(find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), replace);
}

export function objToStrMap<V>(obj: { [s: string]: V }): Map<string, V> {
    const result:Map<string, V> = new Map();
    for (const entry:[string, V] of Object.entries(obj)) {
        result.set(entry[0], entry[1])
    }
    return result;
}

export function abbrN(value:number):string {
    const asString:string = String(value);
    if (value >= 1000) {
        const suffixes:ReadonlyArray<string> = ["", "K", "M", "B", "T"];
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

export function doFullReload():void {
    window.localStorage.clear();
    location.reload();
}

export function removePrevious(): void {
    //Remove previous data
    [Table.ID, Wrapper.INFO_ID, Wrapper.CONTROLS_ID, Downloads.ID, Downloads.COLLECTIONS_ID]
        .map(id => document.getElementById(id))
        .filter(element => element !== null)
        .forEach(element => element.remove());
}