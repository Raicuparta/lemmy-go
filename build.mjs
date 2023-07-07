import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
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

const target = process.argv[2];
const manifest = `${__dirname}/manifests/manifest_${target}.json`;

const buildFolder = `${__dirname}/build/${target}`;
if (fs.existsSync(buildFolder)) {
  fs.rmSync(buildFolder, { recursive: true });
}
fs.cpSync(__dirname + "/src", buildFolder, { recursive: true });
fs.cpSync(manifest, buildFolder + "/manifest.json");

await zipDirectory(buildFolder, `${buildFolder}.zip`);
