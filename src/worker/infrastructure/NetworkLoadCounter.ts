import {AsyncCalculator, Loader, Tranche} from "./Abstraction.ts";
import type {CalculationRequestMessage, LoadMessage} from "./Message.ts";
import {CalculationDoneMessage, LoadCompleteMessage} from "./Message.ts";
import {Constant} from "../../Constant.ts";
import Source = Constant.Source;

export default class NetworkLoadCounter extends AsyncCalculator implements Loader {
    readonly JSONS:Array<Tranche>;
    readonly label:string;
    readonly source:Source;

    constructor(label:string) {
        super();
        this.JSONS = [];
        this.label = label;
    }

    async calculate(requestMessage:CalculationRequestMessage):Promise<CalculationDoneMessage> {
        return super.calculatePart(request).then(result => new CalculationDoneMessage(this.label, result));
    }

    async load(loadMessage: LoadMessage): Promise<LoadCompleteMessage> {
        return fetch(loadMessage.jsonUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json; charset=utf-8" }})
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                this.JSONS.push(JSON.parse(new TextDecoder().decode(arrayBuffer)));
                return new LoadCompleteMessage(this.label, this.source, loadMessage.jsonUrl, arrayBuffer);
            })
            .catch(error => console.error(error));
    }
}