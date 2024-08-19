import {Slider} from "../component/Slider.ts";
import {Constant} from "../data/Constant.ts";
import {KEY} from "../data/mapping/key.ts";
import {Model} from "../model/Model.ts";

export namespace State {
    export class Totals {
        private compounds: Model.Range = new Model.Range(0, 0);
        private tranches: Model.Range = new Model.Range(0, 0);

        static get(counter: Constant.Counter): Model.Range {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    return TOTALS.compounds;
                }
                case Constant.Counter.TRANCHES: {
                    return TOTALS.tranches;
                }
            }
        }

        static setMax(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    TOTALS.compounds = new Model.Range(TOTALS.compounds.min, value);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    TOTALS.tranches = new Model.Range(TOTALS.tranches.min, value);
                    break;
                }
            }
        }

        static setMin(counter: Constant.Counter, value: number): void {
            switch (counter) {
                case Constant.Counter.COMPOUNDS: {
                    TOTALS.compounds = new Model.Range(value, TOTALS.compounds.max);
                    break;
                }
                case Constant.Counter.TRANCHES: {
                    TOTALS.tranches = new Model.Range(value, TOTALS.tranches.max);
                    break;
                }
            }
        }
    }

    export class Snapshot {
        private map: ReadonlyMap<string, Model.Range> = new Map();
        private readonly initialAxisValues: Model.AxisValues = new Model.AxisValues();

        static current(): ReadonlyMap<string, Model.Range> {
            return SLIDERS_STATE.map;
        }

        static saveFull(): void {
            SLIDERS_STATE.map = Snapshot.currentState(SLIDERS_STATE.initialAxisValues, true);
        }

        static saveNew(axis: Model.AxisValues): void {
            SLIDERS_STATE.map = Snapshot.currentState(axis);
        }

        static isDefaultState(axis: Model.AxisValues): boolean {
            return Model.AxisValues.equals(axis, SLIDERS_STATE.initialAxisValues); //TODO add initial sliders state
        }

        static isNeedRecalculation(axisValues: Model.AxisValues): boolean {
            const current: ReadonlyMap<string, Model.Range> = Snapshot.currentState(axisValues);
            for (const [key, val]: [string, Model.Range] of SLIDERS_STATE.map) {
                const currentVal: Model.Range | undefined = current.get(key);
                if (currentVal?.min !== val.min || currentVal?.max !== val.max) {
                    return true;
                }
            }
            return false;
        }

        private static currentState(axisValues: Model.AxisValues, full: boolean = false): ReadonlyMap<string, Model.Range> {
            const snapshot: Map<string, Model.Range> = new Map();
            Array.from(KEY.map.keys())
                .filter(dimension => full ||
                    (dimension !== Model.AxisValues.getValue(axisValues, Constant.Axis.X) &&
                        dimension !== Model.AxisValues.getValue(axisValues, Constant.Axis.Y)))
                .forEach(dimension => snapshot.set(dimension, Model.Range.getValidated(Slider.getRange(dimension))));
            return snapshot;
        }
    }

    const TOTALS: Totals = new Totals();
    const SLIDERS_STATE: Snapshot = new Snapshot();
}