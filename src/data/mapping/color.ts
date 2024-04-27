import {objToStrMap} from "../../Utils.ts";

class Color {
  readonly map:ReadonlyMap<string, string>;

  constructor() {
    const colors = {
      0: "grad0",
      100: "grad1",
      1000: "grad2",
      10000: "grad3",
      100000: "grad4",
      500000: "grad5",
      1000000: "grad6",
      5000000: "grad7",
      10000000: "grad8",
      20000000: "grad9",
      50000000: "grad10",
      100000000: "grad11",
      1000000000: "grad12",
      10000000000: "grad13",
      20000000000: "grad14",
      50000000000: "grad15"
    };
    this.map = objToStrMap(colors);
  }
}

export const COLOR = new Color();