import fs from "fs";
import { execSync } from "child_process";

import { __dirname, getBuildFolder } from "./paths.mjs";

/**
 * @param {string} target
 */
export async function build(target) {
  execSync("tsc");

  // Copy main source files.
  const buildFolder = getBuildFolder(target);
  fs.cpSync(__dirname + "/src/static", buildFolder, { recursive: true });
  fs.cpSync(__dirname + "/ts-output", buildFolder, { recursive: true });

  // Copy manifest file for this target.
  const manifest = `${__dirname}/manifests/manifest_${target}.json`;
  fs.cpSync(manifest, buildFolder + "/manifest.json");

  // Replace target variable, for logic that depends on target.
  const backgroundJsFilePath = `${buildFolder}/background.js`;
  const backgroundJsFileText = fs.readFileSync(backgroundJsFilePath).toString();

  fs.writeFileSync(
    backgroundJsFilePath,
    backgroundJsFileText.replace(
      buildTargetDefinition("$BUILD_TARGET_UNSET$"),
      buildTargetDefinition(target)
    )
  );
}

/**
 * @param {string} target
 */
const buildTargetDefinition = (target) => `const buildTarget = "${target}";`;
