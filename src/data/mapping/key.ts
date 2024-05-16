class Key {
    readonly map: ReadonlyMap<string, ReadonlyMap<string, string>>;
    readonly dimensionsWithZero: ReadonlySet<string>;

    constructor() {
        const key: { [s: string]: { [l: string]: string } } = {
            "MW": {
                "0": "0",
                "A": "200",
                "B": "300",
                "C": "400",
                "D": "∞"
            },
            "SlogP": {
                "0": "-∞",
                "A": "0",
                "B": "2",
                "C": "3",
                "D": "4",
                "E": "5",
                "F": "∞"
            },
            "HBA": {
                "0": "0",
                "A": "2",
                "B": "4",
                "C": "7",
                "D": "10",
                "E": "∞"
            },
            "HBD": {
                "A": "0",
                "B": "2",
                "C": "4",
                "D": "5",
                "E": "∞"
            },
            "RotB": {
                "A": "0",
                "B": "2",
                "C": "4",
                "D": "7",
                "E": "10",
                "F": "∞"
            },
            "TPSA": {
                "0": "0",
                "A": "40",
                "B": "80",
                "C": "110",
                "D": "140",
                "E": "∞"
            },
            "MR": {
                "0": "0",
                "A": "40",
                "B": "80",
                "C": "130",
                "D": "∞"
            },
            "logS": {
                "0": "-∞",
                "A": "-6",
                "B": "-5",
                "C": "-4",
                "D": "-3",
                "E": "∞"
            },
            "AromProportion": {
                "A": "0",
                "B": "25",
                "C": "50",
                "D": "75",
                "E": "100"
            },
            "FormCharge": {
                "0": "-∞",
                "A": "-2",
                "B": "-1",
                "C": "0",
                "D": "1",
                "E": "∞"
            },
            "PosCharge": {
                "A": "0",
                "B": "1",
                "C": "∞"
            },
            "NegCharge": {
                "A": "0",
                "B": "1",
                "C": "∞"
            },
            "Fsp3": {
                "0": "0",
                "A": "20",
                "B": "40",
                "C": "60",
                "D": "80",
                "E": "100"
            },
            "ChiralCenter": {
                "A": "0",
                "B": "1",
                "C": "∞"
            },
            "DoubleBondIsomer": {
                "A": "0",
                "B": "∞"
            },
            "HalogenAC": {
                "A": "0",
                "B": "∞"
            },
            "SulfurAC": {
                "A": "0",
                "B": "∞"
            },
            "EnamineCC": {
                "A": "S",
                "B": "M"
            }
        }
        const result: Map<string, Map<string, string>> = new Map();
        const dimensionsWithZero: Set<string> = new Set();
        for (const [dimension, range]: [string, { [l: string]: string }] of Object.entries(key)) {
            const dimensionValues: Map<string, string> = new Map();
            for (const [letter, value]: [string, string] of Object.entries(range)) {
                if (value === "0") {
                    dimensionsWithZero.add(dimension);
                }
                dimensionValues.set(letter, value);
            }
            result.set(dimension, dimensionValues);
        }
        this.map = result;
        this.dimensionsWithZero = dimensionsWithZero;
    }
}

export const KEY: Key = new Key();