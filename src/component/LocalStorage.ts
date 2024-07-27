export namespace LocalStorage {
    const TRANCHES_LOCAL_COPY: string = "tranchesLocalCopy";
    const CALCULATED_SNAPSHOT: string = "calculatedSnapshot";
    const TRUE: string = "true";

    export function markHasTranchesLocalCopy(): void {
        //window.localStorage.setItem(TRANCHES_LOCAL_COPY, TRUE); //TODO revert
    }

    export function hasTranchesLocalCopy(): boolean {
        return window.localStorage.getItem(TRANCHES_LOCAL_COPY) === TRUE;
    }

    export function markHasPersistedInitial(): void {
        window.localStorage.setItem(CALCULATED_SNAPSHOT, TRUE);
    }

    export function hasPersistedInitial(): boolean {
        return window.localStorage.getItem(CALCULATED_SNAPSHOT) === TRUE;
    }
}