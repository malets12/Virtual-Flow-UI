import {AsyncCalculator, Calculator, Loader, Tranche} from "./Abstractions.ts";
import {Constant} from "../../Constant.ts";
import {Message} from "./Message.ts";
import Source = Constant.Source;
import CalculationRequestMessage = Message.CalculationRequestMessage;
import CalculationDoneMessage = Message.CalculationDoneMessage;
import LoadRequestMessage = Message.LoadRequestMessage;
import LoadCompleteMessage = Message.LoadCompleteMessage;

export default class NetworkLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS:Array<Tranche>;
    readonly label:string;
    readonly source:Source;

    constructor(label:string) {
        super();
        this.JSONS = [];
        this.label = label;
    }

    async calculate(requestMessage:CalculationRequestMessage):Promise<CalculationDoneMessage> {
        return super.calculatePart(requestMessage).then(result => new CalculationDoneMessage(this.label, result));
    }

    async load(loadMessage: LoadRequestMessage): Promise<LoadCompleteMessage> {
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