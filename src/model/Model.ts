import {Constant} from "../data/Constant.ts";

export namespace Model {
    export class AxisValues {
        private readonly x: string;
        private readonly y: string;

        constructor(x: string = "MW", y: string = "SlogP") {
            if (x === y) {
                throw "Illegal state: same axis";
            }
            this.x = x;
            this.y = y;
        }

        static getValue(values: AxisValues, axis: Constant.Axis): string {
            switch (axis) {
                case Constant.Axis.X:
                    return values.x;
                case Constant.Axis.Y:
                    return values.y;
            }
        }

        static getComplementValue(values: AxisValues, axis: Constant.Axis): string {
            switch (axis) {
                case Constant.Axis.X:
                    return values.y;
                case Constant.Axis.Y:
                    return values.x;
            }
        }
    }

    export class Range {
        readonly min: number;
        readonly max: number;

        constructor(min: number, max: number) {
            this.min = min;
            this.max = max;
        }

        static matches(range: Range | undefined, int: number): boolean {
            return int >= range?.min && int < range?.max;
        }

        static isNotValid(range: Range): boolean {
            return range.min > range.max;
        }

        static getValidated(range: Range): Range {
            return Range.isNotValid(range) ? new Range(range.max, range.min) : range;
        }

        static isWithZeroLength(range: Range): boolean {
            return range.min === range.max;
        }
    }
}