import { zipDirectory } from "./zip.mjs";
import { build } from "./build.mjs";
import { getBuildFolder } from "./paths.mjs";
import fs from "fs";

const target = process.argv[2];
const buildFolder = getBuildFolder(target);
if (fs.existsSync(buildFolder)) {
  fs.rmSync(buildFolder, { recursive: true });
}

await build(target);
await zipDirectory(buildFolder, `${buildFolder}.zip`);
