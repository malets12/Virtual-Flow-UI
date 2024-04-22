import {objToStrMap} from "../../Utils.ts";

class Description {
  readonly map: ReadonlyMap<string, string>;

  constructor() {
    const description = {
      "MW": "Molecular Weight",
      "SlogP": "Partition Coefficient (SlogP)",
      "HBA": "Hydrogen Bond Acceptors",
      "HBD": "Hydrogen Bond Donors",
      "RotB": "Rotatable Bonds",
      "TPSA": "Topological Polar Surface Area",
      "MR": "Molecular Refractivity",
      "logS": "Solubility Coefficient",
      "AromProportion": "Aromatic Proportion, %",
      "FormCharge": "Formal Charge",
      "PosCharge": "Positive Charge Count",
      "NegCharge": "Negative Charge Count",
      "Fsp3": "Fraction of sp<sup>3</sup> Carbon Atoms, %",
      "ChiralCenter": "Chiral Center Count",
      "DoubleBondIsomer": "Doublebond Stereoisomer Count",
      "HalogenAC": "Halogen Atom Count",
      "SulfurAC": "Sulfur Atom Count",
      "EnamineCC": "Enamine Compound Class"
    }
    this.map = objToStrMap(description);
  }
}
export const DESCRIPTION = new Description();