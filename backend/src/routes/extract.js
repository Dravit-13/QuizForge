const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { indexDocument } = require('../services/ragService');

const UPLOAD_DIR = path.join(os.tmpdir(), 'quiz-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type "${ext}". Allowed: PDF, TXT, DOCX`));
  },
});

function extractYouTubeId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function cleanup(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

// POST /api/extract-text
// Accepts: multipart with `file` field  OR  JSON/form body with `youtubeUrl`
router.post('/extract-text', authenticate, upload.single('file'), async (req, res) => {
  const tempPath = req.file?.path;
  try {
    let text = '';
    let source = '';

    /* ── File upload ── */
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      source = ext.replace('.', '').toUpperCase();

      if (ext === '.txt') {
        text = fs.readFileSync(tempPath, 'utf-8');

      } else if (ext === '.pdf') {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fs.readFileSync(tempPath));
        text = data.text;

      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: tempPath });
        text = result.value;
      }

      cleanup(tempPath);

    /* ── YouTube URL ── */
    } else if (req.body?.youtubeUrl) {
      source = 'YouTube';
      const videoId = extractYouTubeId(req.body.youtubeUrl.trim());
      if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL. Paste the full video URL.' });
      }

      // Dynamic import required — youtube-transcript is an ES Module (crashes with require() on Node 22)
      let YoutubeTranscript;
      try {
        ({ YoutubeTranscript } = await import('youtube-transcript'));
      } catch {
        return res.status(503).json({ error: 'YouTube transcript module failed to load.' });
      }

      let items;
      try {
        items = await YoutubeTranscript.fetchTranscript(videoId);
      } catch {
        return res.status(422).json({
          error: 'Could not fetch transcript. The video may have no captions, or captions may be disabled.',
        });
      }
      text = items.map((t) => t.text).join(' ');

    } else {
      return res.status(400).json({ error: 'Provide a file or a YouTube URL.' });
    }

    // Normalise whitespace
    text = text.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();

    if (text.length < 50) {
      return res.status(422).json({
        error: 'Extracted text is too short to generate a quiz. Try a different source.',
      });
    }

    // ── RAG: chunk + embed the document, store under a unique ragId ──────────
    const ragId = crypto.randomUUID();
    let chunkCount = 0;
    let ragReady = false;

    try {
      const result = await indexDocument(text, ragId);
      chunkCount = result.chunkCount;
      ragReady = true;
    } catch (ragErr) {
      // RAG indexing failure is non-fatal — fall back to plain text generation
      console.error('[RAG] Indexing failed:', ragErr.message);
    }

    res.json({ text, source, charCount: text.length, ragId: ragReady ? ragId : null, chunkCount });
  } catch (err) {
    cleanup(tempPath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
