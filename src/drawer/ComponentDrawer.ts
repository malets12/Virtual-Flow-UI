import {Downloads} from "../component/Downloads.ts";
import {LocalStorage} from "../component/LocalStorage.ts";
import {Slider} from "../component/Slider.ts";
import {Table} from "../component/Table.ts";
import {Wrapper} from "../component/Wrapper.ts";
import {Constant} from "../data/Constant.ts";
import {Model} from "../model/Model.ts";
import {ValuesDrawer} from "./ValuesDrawer.ts";

export namespace ComponentDrawer {
    export function draw(axis: Model.AxisValues): void {
        removePrevious();
        const table: HTMLTableElement = Table.renderTable(axis);
        document.getElementById(Constant.ENTRY_ID).appendChild(table);
        //Create containers for controls and info
        const info: HTMLDivElement = Wrapper.createInfoWrapper();
        table.after(info);
        info.after(Wrapper.createControlsWrapper());
        //Call functions
        Slider.renderControls(axis);
        Downloads.renderDownloads();
        //TODO? render_collections_downloads();
        ValuesDrawer.render(axis, true)
            .then(() => Slider.narrow("", true))
            .catch(error => console.error(error));
        if (!LocalStorage.hasLocalCopy()) {
            document.dispatchEvent(new Event(Constant.EventName.SAVE_TO_DATABASE));
        }
    }

    function removePrevious(): void {
        //Remove previous data
        [Table.ID, Wrapper.INFO_ID, Wrapper.CONTROLS_ID, Downloads.ID, Downloads.COLLECTIONS_ID]
            .map(id => document.getElementById(id))
            .filter(element => element !== null)
            .forEach(element => element.remove());
    }
}