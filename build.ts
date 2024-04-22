await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './out',
    minify: true
});
const indexFile = Bun.file("./src/index.html");
await Bun.write("./out/index.html", indexFile);