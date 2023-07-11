import watch from "node-watch";
import { build } from "./build.mjs";
import { __dirname } from "./paths.mjs";

console.log("Running first build...");
build(process.argv[2]);

watch(
  __dirname,
  {
    recursive: true,
    filter: (file) =>
      !/build/.test(file) && !/.git/.test(file) && !/ts-output/.test(file),
  },
  (event, file) => {
    console.log("file changed, rebuilding... " + file);
    build(process.argv[2]);
  }
);
