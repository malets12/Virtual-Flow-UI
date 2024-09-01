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
        private map: ReadonlyMap<string, Model.Range>;
        private readonly defaultAxisValues: Model.AxisValues;
        private defaultSlidersValues: ReadonlyMap<string, Model.Range>;

        constructor() {
            this.map = new Map();
            this.defaultAxisValues = new Model.AxisValues();
            const dimensionDefaults: Map<string, Model.Range> = new Map();
            for (const [dimension, values]: [string, ReadonlyMap<string, string>] of KEY.map.entries()) {
                dimensionDefaults.set(dimension, new Model.Range(1, values.size));
            }
            this.defaultSlidersValues = dimensionDefaults;
        }

        static current(): ReadonlyMap<string, Model.Range> {
            return SLIDERS_STATE.map;
        }

        static getFull(): ReadonlyMap<string, Model.Range> {
            return Snapshot.currentState(SLIDERS_STATE.defaultAxisValues, true);
        }

        static saveNew(axis: Model.AxisValues): void {
            SLIDERS_STATE.map = Snapshot.currentState(axis);
        }

        static isDefaultState(axis: Model.AxisValues): boolean {
            return Model.AxisValues.equals(axis, SLIDERS_STATE.defaultAxisValues)
                && Snapshot.equals(SLIDERS_STATE.defaultSlidersValues, Snapshot.getFull());
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

        private static equals(state1: ReadonlyMap<string, Model.Range>, state2: ReadonlyMap<string, Model.Range>): boolean {
            for (const [dimension, range]: [string, Model.Range] of state1) {
                const otherRange: Model.Range | undefined = state2.get(dimension);
                if (otherRange === undefined || !Model.Range.equals(range, otherRange)) {
                    return false;
                }
            }
            return true;
        }
    }

    const TOTALS: Totals = new Totals();
    const SLIDERS_STATE: Snapshot = new Snapshot();
}