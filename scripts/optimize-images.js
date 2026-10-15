const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SOURCE_DIRS = [
  path.join(PUBLIC_DIR, 'assets/courses'),
  path.join(PUBLIC_DIR, 'assets/banners'),
];
const INSTRUCTOR_IMAGE = path.join(PUBLIC_DIR, 'assets/instructor.png');
const STANDARD_MAX_WIDTH = 1600;
const AVATAR_MAX_WIDTH = 800;
const WEBP_QUALITY = 80;

function findPngFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPngFiles(entryPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.png') ? [entryPath] : [];
  });
}

function maxWidthFor(filePath) {
  return /(?:instructor|avatar)/i.test(path.basename(filePath))
    ? AVATAR_MAX_WIDTH
    : STANDARD_MAX_WIDTH;
}

async function optimizeImage(sourcePath) {
  const outputPath = sourcePath.replace(/\.png$/i, '.webp');
  const maxWidth = maxWidthFor(sourcePath);
  const sourceBytes = fs.statSync(sourcePath).size;
  const metadata = await sharp(sourcePath).metadata();
  const output = await sharp(sourcePath)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  return {
    sourcePath,
    outputPath,
    sourceBytes,
    outputBytes: output.size,
    sourceWidth: metadata.width,
    outputWidth: output.width,
    outputHeight: output.height,
    maxWidth,
  };
}

async function main() {
  const sources = [...new Set([...SOURCE_DIRS.flatMap(findPngFiles), INSTRUCTOR_IMAGE])]
    .filter((sourcePath) => fs.existsSync(sourcePath))
    .sort();

  if (sources.length === 0) {
    console.log(
      'Nenhum PNG para otimizar; adicione fontes em public/assets/courses, public/assets/banners ou public/assets/instructor.png.',
    );
    return;
  }

  const results = await Promise.all(sources.map(optimizeImage));
  const originalBytes = results.reduce((total, result) => total + result.sourceBytes, 0);
  const webpBytes = results.reduce((total, result) => total + result.outputBytes, 0);
  const savedBytes = originalBytes - webpBytes;

  for (const result of results) {
    const source = path.relative(ROOT_DIR, result.sourcePath);
    const output = path.relative(ROOT_DIR, result.outputPath);
    console.log(
      `${source} (${result.sourceWidth}px) -> ${output} (${result.outputWidth}x${result.outputHeight}px, max ${result.maxWidth}px) ` +
        `${(result.sourceBytes / 1024).toFixed(0)} KB -> ${(result.outputBytes / 1024).toFixed(0)} KB`,
    );
  }

  console.log(
    `Total: ${results.length} imagens; ${(originalBytes / 1048576).toFixed(2)} MiB -> ` +
      `${(webpBytes / 1048576).toFixed(2)} MiB WebP; economia ${(savedBytes / 1048576).toFixed(2)} MiB.`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Falha ao otimizar imagens: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { findPngFiles, maxWidthFor, optimizeImage };
