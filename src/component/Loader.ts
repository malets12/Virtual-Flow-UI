export namespace Loader {
    const LOADER: string = "loader";

    export function showLoader(): void {
        document.getElementById(LOADER).style.display = "block"; //TODO check
    }

    export function hideLoader(): void {
        document.getElementById(LOADER).style.display = "none";
    }
}