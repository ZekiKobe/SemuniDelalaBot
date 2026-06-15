const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessorService {
  async processImage(inputPath, outputDir, filename) {
    await fs.mkdir(outputDir, { recursive: true });

    const baseName = path.parse(filename).name;
    const mainPath = path.join(outputDir, `${baseName}.webp`);
    const thumbPath = path.join(outputDir, `${baseName}_thumb.webp`);

    await sharp(inputPath)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(mainPath);

    await sharp(inputPath)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    return {
      mainPath,
      thumbPath,
      mainFilename: `${baseName}.webp`,
      thumbFilename: `${baseName}_thumb.webp`,
    };
  }

  async deleteImages(urls) {
    for (const url of urls) {
      if (!url) continue;
      try {
        const filePath = path.join(process.cwd(), url.replace(/^\//, ''));
        await fs.unlink(filePath);
      } catch {
        // File may not exist
      }
    }
  }
}

module.exports = new ImageProcessorService();
