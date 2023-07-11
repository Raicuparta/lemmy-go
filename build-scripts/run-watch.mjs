import watch from "node-watch";
import { build } from "./build.mjs";
import { __dirname } from "./paths.mjs";

async function safeBuild() {
  try {
    await build();
    console.log("Built successfully, I think.");
  } catch (error) {
    console.error(
      `Failed to build project. Will wait until files change to attempt rebuild. Error: ${error}`
    );
  }
}

console.log("Running first build...");
safeBuild();

watch(
  __dirname,
  {
    recursive: true,
    filter: (file) =>
      !/build/.test(file) && !/.git/.test(file) && !/ts-output/.test(file),
  },
  async (event, file) => {
    console.log("File changed, rebuilding... " + file);
    await safeBuild();
  }
);
