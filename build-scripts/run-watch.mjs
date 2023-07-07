import watch from "node-watch";
import { build } from "./build.mjs";
import { __dirname } from "./paths.mjs";

watch(
  __dirname,
  {
    recursive: true,
    filter: (file) => !/build/.test(file) && !/.git/.test(file),
  },
  (event, file) => {
    console.log("file changed, rebuilding... " + file);
    build(process.argv[2]);
  }
);
