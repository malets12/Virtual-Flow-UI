export namespace LocalStorage {
    const LOCAL_COPY: string = "tranchesLocalCopy";

    export function markHasLocalCopy(): void {
        window.localStorage.setItem(LOCAL_COPY, "true");
    }

    export function hasLocalCopy(): boolean {
        return window.localStorage.getItem(LOCAL_COPY) === "true";
    }
}