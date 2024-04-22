import {objToStrMap} from "../../Utils.ts";

class Order {
  readonly map: ReadonlyMap<string, number>;

  constructor() {
    const order = {
      "MW": 1,
      "SlogP": 2,
      "HBA": 3,
      "HBD": 4,
      "RotB": 5,
      "TPSA": 6,
      "MR": 7,
      "logS": 8,
      "AromProportion": 9,
      "FormCharge": 10,
      "PosCharge": 11,
      "NegCharge": 12,
      "Fsp3": 13,
      "ChiralCenter": 14,
      "DoubleBondIsomer": 15,
      "HalogenAC": 16,
      "SulfurAC": 17,
      "EnamineCC": 18
    };
    this.map = objToStrMap(order);
  }
}

export const ORDER = new Order();