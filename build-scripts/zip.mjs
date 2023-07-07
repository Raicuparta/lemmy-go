import archiver from "archiver";
import fs from "fs";

/**
 * @param {string} sourceDir
 * @param {string} outPath
 * @returns {Promise}
 */
export function zipDirectory(sourceDir, outPath) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve(1));
    archive.finalize();
  });
}
