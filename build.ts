const build = await Bun.build({
    entrypoints: [
        './src/index.ts',
        './src/worker/SaveToDbJsWorker.ts',
        './src/worker/FetchAndCountJsWorker.ts',
        './src/worker/LoadFromDbAndCountJsWorker.ts'
    ],
    outdir: './out',
    splitting: true,
    minify: true
});
const success = build.success;
for (const log of build.logs) {
    if (success) {
        console.log(log);
    } else {
        console.error(log);
    }
}

const indexFile = Bun.file("./src/index.html");
const stylesFile = Bun.file("./src/styles.css");
await Bun.write("./out/index.html", indexFile);
await Bun.write("./out/styles.css", stylesFile);