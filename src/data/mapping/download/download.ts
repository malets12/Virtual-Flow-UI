export const Download: { PowerShell: DownloadMethod; URLs: DownloadMethod; wget: DownloadMethod } = {
    wget: new DownloadMethod("wget", ".sh",
        `#!/usr/bin/bash\nfull_tranches_script_archive=$1\nselected_tranches_script=$2\nregex=\"mkdir -pv <metatranch> && wget <library_root_url>\\/<metatranch>\\/<tranch>\\.tar -O <metatranch>\\/<tranch>\\.tar\"\ngrep -E \"^${regex}\" $full_tranches_script_archive > $selected_tranches_script`),
    PowerShell: new DownloadMethod("PowerShell", ".ps1",
        `Invoke-WebRequest <library_root_url>/<metatranch>/<tranch>.tar -OutFile <metatranch>/<tranch>.tar`),
    URLs: new DownloadMethod("URLs", ".txt",
        `<library_root_url>/<metatranch>/<tranch>.tar`)
}

class DownloadMethod {
    private readonly _tool: string;
    private readonly _extension: string;
    private readonly _template: string;

    constructor(tool: string, extension: string, template: string) {
        this._tool = tool;
        this._extension = extension;
        this._template = template;
    }

    get tool(): string {
        return this._tool;
    }

    get extension(): string {
        return this._extension;
    }

    get template(): string {
        return this._template;
    }
}

export const DownloadTemplateMapping = {
    root: "<library_root_url>",
    meta: "<metatranch>",
    tranch: "<tranch>"
}

export const DownloadURL = {
    root: "127.0.0.1",
    back: "https://virtual-flow.org/",
    description: "← Back to Virtual Flow"
}