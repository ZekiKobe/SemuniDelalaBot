const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const AppError = require('../../shared/errors/AppError');

const uploadDir = path.join(config.upload.dir, 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400, 'FILE_UPLOAD_ERROR'), false);
  }
};

const uploadImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxFileSize, files: 20 },
});

const uploadScreenshot = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxFileSize, files: 1 },
});

module.exports = { uploadImages, uploadScreenshot };
