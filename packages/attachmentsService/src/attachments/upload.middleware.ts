import multer from 'multer';

const ALLOWED_MIME_PATTERNS = [
  /^image\//,
  /^video\/mp4$/,
  /^video\/webm$/,
  /^audio\/mpeg$/,
  /^audio\/ogg$/,
  /^application\/pdf$/,
  /^text\/plain$/,
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MIME_PATTERNS.some(p => p.test(file.mimetype));
    if (!allowed) {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
      return;
    }
    cb(null, true);
  },
});
