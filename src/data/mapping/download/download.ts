export const Download: [string, DownloadMethod] = {
    wget: new DownloadMethod("wget", ".sh",
        `#!/usr/bin/bash\nfull_tranches_script_archive=$1\nselected_tranches_script=$2\nregex=\"mkdir -pv <metatranch> && wget <library_root_url>\\/<metatranch>\\/<tranch>\\.tar -O <metatranch>\\/<tranch>\\.tar\"\ngrep -E \"^${regex}\" $full_tranches_script_archive > $selected_tranches_script`),
    PowerShell: new DownloadMethod("PowerShell", ".ps1",
        `Invoke-WebRequest <library_root_url>/<metatranch>/<tranch>.tar -OutFile <metatranch>/<tranch>.tar`),
    URLs: new DownloadMethod("URLs", ".txt",
        `<library_root_url>/<metatranch>/<tranch>.tar`)
}

class DownloadMethod {
    readonly tool: string;
    readonly extension: string;
    readonly template: string;

    constructor(tool: string, extension: string, template: string) {
        this.tool = tool;
        this.extension = extension;
        this.template = template;
    }
}

export const DownloadTemplateMapping = {
    root: "<library_root_url>",
    meta: "<metatranch>",
    tranch: "<tranch>"
}

export const DownloadURL: [string, string] = {
    root: "127.0.0.1",
    back: "https://virtual-flow.org/",
    description: "← Back to Virtual Flow"
}