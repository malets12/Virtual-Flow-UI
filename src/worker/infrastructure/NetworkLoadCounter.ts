import {AsyncCalculator, Calculator, Loader, Tranche} from "./Abstractions.ts";
import {Constant} from "../../Constant.ts";
import {Message} from "./Message.ts";

export default class NetworkLoadCounter extends AsyncCalculator implements Loader, Calculator {
    readonly JSONS:Array<Tranche>;
    readonly label:string;
    readonly source:Constant.Source;

    constructor(label:string) {
        super();
        this.JSONS = [];
        this.label = label;
    }

    async calculate(requestMessage:Message.CalculationRequestMessage):Promise<Message.CalculationDoneMessage> {
        return super.calculatePart(requestMessage).then(result => new Message.CalculationDoneMessage(this.label, result));
    }

    async load(loadMessage: Message.LoadRequestMessage): Promise<Message.LoadCompleteMessage> {
        return fetch(loadMessage.jsonUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json; charset=utf-8" }})
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                this.JSONS.push(JSON.parse(new TextDecoder().decode(arrayBuffer)));
                return new Message.LoadCompleteMessage(this.label, this.source, loadMessage.jsonUrl, arrayBuffer);
            }).catch(error => console.error(error));
    }
}