import fs from "fs";

import { zipDirectory } from "./zip.mjs";
import { build } from "./build.mjs";
import { getBuildFolder } from "./paths.mjs";
import { targets } from "./targets.mjs";

for (const target of targets) {
  const buildFolder = getBuildFolder(target);
  if (fs.existsSync(buildFolder)) {
    fs.rmSync(buildFolder, { recursive: true });
  }
}

await build();

for (const target of targets) {
  const buildFolder = getBuildFolder(target);
  await zipDirectory(buildFolder, `${buildFolder}.zip`);
}
