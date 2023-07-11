import { readFileSync } from "fs";

export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param {object} target
 * @param {object[]} sources
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

/** @param {string} name */
async function readManifest(name) {
  const manifestFile = readFileSync(`./manifests/manifest_${name}.json`);
  return JSON.parse(manifestFile.toString());
}

/** @param {string} target */
export async function getManifestForTarget(target) {
  const baseManifest = await readManifest("base");
  const targetManifest = await readManifest(target);

  return mergeDeep({}, baseManifest, targetManifest);
}
