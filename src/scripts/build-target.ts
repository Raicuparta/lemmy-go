type BuildTarget = "$BUILD_TARGET_UNSET$" | "chrome" | "firefox";
export const buildTarget: BuildTarget = "$BUILD_TARGET_UNSET$";

if (buildTarget === "$BUILD_TARGET_UNSET$") {
  throw new Error("Build target has not been set. Set it.");
}
