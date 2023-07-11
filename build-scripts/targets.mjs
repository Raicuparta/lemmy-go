// Multiple copies of the build will be made, one for each target.
// Each target must have a manifest under the ./manifests directory.
// This target value will be passed to the builds, in the build-target.js file.
export const targets = ["chrome", "firefox"];

/**
 * @param {string} target
 */
export const buildTargetDefinition = (target) =>
  `const buildTarget = "${target}";`;
