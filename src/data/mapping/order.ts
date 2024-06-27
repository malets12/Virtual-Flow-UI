import {objToStrMap} from "../../compute/Utils.ts";

class Order {
    readonly map: ReadonlyMap<string, number>;

    constructor() {
        const order: { [s: string]: number } = {
            "MW": 0,
            "SlogP": 1,
            "HBA": 2,
            "HBD": 3,
            "RotB": 4,
            "TPSA": 5,
            "MR": 6,
            "logS": 7,
            "AromProportion": 8,
            "FormCharge": 9,
            "PosCharge": 10,
            "NegCharge": 11,
            "Fsp3": 12,
            "ChiralCenter": 13,
            "DoubleBondIsomer": 14,
            "HalogenAC": 15,
            "SulfurAC": 16,
            "EnamineCC": 17
        };
        this.map = objToStrMap(order);
    }
}

export const ORDER: Order = new Order();