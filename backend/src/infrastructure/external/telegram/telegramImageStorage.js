const https = require('https');
const path = require('path');
const fs = require('fs').promises;
const { randomUUID } = require('crypto');
const config = require('../../../config');
const logger = require('../../../shared/logger/winston.logger');
const imageProcessor = require('../../storage/ImageProcessor.service');

async function persistTelegramPropertyImages(propertyId, telegramImages) {
  return persistTelegramImages(propertyId, telegramImages, 'properties');
}

async function persistTelegramImages(entityId, telegramImages, folderName) {
  if (!Array.isArray(telegramImages) || telegramImages.length === 0) {
    return [];
  }

  const tempDir = path.join(config.upload.dir, 'temp');
  const outputDir = path.join(config.upload.dir, folderName, entityId.toString());
  const savedImages = [];

  for (const [index, image] of telegramImages.slice(0, config.upload.maxImagesPerProperty).entries()) {
    if (!image.filePath) continue;

    const tempFilename = `${randomUUID()}${path.extname(image.filePath) || '.jpg'}`;
    const tempPath = path.join(tempDir, tempFilename);

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await downloadTelegramFile(image.filePath, tempPath);

      const processed = await imageProcessor.processImage(tempPath, outputDir, tempFilename);
      savedImages.push({
        url: `/uploads/${folderName}/${entityId}/${processed.mainFilename}`,
        thumbnailUrl: `/uploads/${folderName}/${entityId}/${processed.thumbFilename}`,
        order: index,
      });
    } catch (error) {
      logger.error('Failed to persist Telegram image', {
        error: error.message,
        entityId,
        folderName,
        filePath: image.filePath,
      });
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  return savedImages;
}

function downloadTelegramFile(filePath, destinationPath) {
  const url = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Telegram file download failed with status ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          await fs.writeFile(destinationPath, Buffer.concat(chunks));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error('Telegram file download timed out'));
    });
  });
}

module.exports = {
  persistTelegramImages,
  persistTelegramPropertyImages,
};
