import fs from "fs";
import { execSync } from "child_process";

import { targets, buildTargetDefinition } from "./targets.mjs";
import { __dirname, getBuildFolder } from "./paths.mjs";
import { getManifestForTarget } from "./manifests.mjs";

/**
 * @param {string} target
 */
async function buildTarget(target) {
  // Copy main source files.
  const buildFolder = getBuildFolder(target);
  fs.cpSync(__dirname + "/src/static", buildFolder, { recursive: true });
  fs.cpSync(__dirname + "/ts-output", buildFolder, { recursive: true });

  // Copy manifest file for this target.
  const manifest = await getManifestForTarget(target);
  fs.writeFileSync(
    buildFolder + "/manifest.json",
    JSON.stringify(manifest, null, 2)
  );

  // Replace target variable, for logic that depends on target.
  const buildTargetFilePath = `${buildFolder}/build-target.js`;
  const backgroundJsFileText = fs.readFileSync(buildTargetFilePath).toString();

  fs.writeFileSync(
    buildTargetFilePath,
    backgroundJsFileText.replace(
      buildTargetDefinition("$BUILD_TARGET_UNSET$"),
      buildTargetDefinition(target)
    )
  );
}

export async function build() {
  execSync("tsc");

  for (const target of targets) {
    buildTarget(target);
  }
}
