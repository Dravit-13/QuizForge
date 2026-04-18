const router = require('express').Router();
const OpenAI = require('openai');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const { authenticate } = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { retrieveChunks, hasIndex } = require('../services/ragService');
const { withKeyRotation, getClient } = require('../services/nvidiaClient');

// Chunks to retrieve per difficulty level
const DIFFICULTY_CHUNKS = { easy: 15, medium: 20, hard: 25 };

// Difficulty instructions injected into the LLM prompt
const DIFFICULTY_PROMPT = {
  easy:   'Generate straightforward, factual questions. Answers should be directly stated in the text. Suitable for beginners.',
  medium: 'Generate moderately challenging questions that require understanding of concepts. Mix of recall and inference.',
  hard:   'Generate advanced, analytical questions requiring deep comprehension, inference, and synthesis across multiple parts of the text.',
};

// POST /api/create-quiz
router.post('/create-quiz', authenticate, async (req, res) => {
  try {
    const { title, description, questions, timeLimit } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!questions?.length) return res.status(400).json({ error: 'At least one question is required' });

    const quizCode = await generateUniqueCode();
    const quiz = await Quiz.create({
      title: title.trim(),
      description: description?.trim() || '',
      questions,
      timeLimit: Number(timeLimit) || 0,
      createdBy: req.user.id,
      quizCode,
    });
    res.status(201).json({ quizCode: quiz.quizCode, quizId: quiz._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quiz/:code  — public; correct answers are stripped
router.get('/quiz/:code', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      quizCode: req.params.code.toUpperCase(),
      isActive: true,
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found or no longer active' });

    const safe = quiz.toObject();
    safe.questions = safe.questions.map(({ correctAnswer, ...q }) => q);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/my-quizzes
router.get('/my-quizzes', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id })
      .select('title description quizCode timeLimit isActive createdAt')
      .sort('-createdAt');

    const withCounts = await Promise.all(
      quizzes.map(async (q) => {
        const attemptCount = await Attempt.countDocuments({ quizId: q._id });
        return { ...q.toObject(), attemptCount };
      })
    );
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quiz-results/:quizId
router.get('/quiz-results/:quizId', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.quizId,
      createdBy: req.user.id,
    }).select('title quizCode questions');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const attempts = await Attempt.find({ quizId: quiz._id })
      .select('userName score totalQuestions timeTaken createdAt')
      .sort('-createdAt');

    const scores = attempts.map((a) => a.score);
    const stats =
      attempts.length > 0
        ? {
            total: attempts.length,
            average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
            highest: Math.max(...scores),
            lowest: Math.min(...scores),
          }
        : { total: 0, average: 0, highest: 0, lowest: 0 };

    res.json({
      quiz: { title: quiz.title, quizCode: quiz.quizCode, totalQuestions: quiz.questions.length },
      stats,
      attempts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quiz/:quizId
router.delete('/quiz/:quizId', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.quizId,
      createdBy: req.user.id,
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    await Attempt.deleteMany({ quizId: req.params.quizId });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-questions
// Body (topic mode):    { topic, count, difficulty? }
// Body (RAG mode):      { ragId, source, count, difficulty, topic? }
// Body (fallback text): { text, source, count, difficulty? }   — used if ragId expired
router.post('/generate-questions', authenticate, async (req, res) => {
  try {
    const {
      topic,
      text,
      source,
      ragId,
      count = 5,
      difficulty = 'medium',
    } = req.body;

    if (!topic?.trim() && !text?.trim() && !ragId) {
      return res.status(400).json({ error: 'Provide a topic, ragId, or extracted text.' });
    }

    if (!process.env.NVIDIA_API_KEYS && !process.env.NVIDIA_API_KEY) {
      return res.status(503).json({ error: 'AI generation unavailable — no NVIDIA API keys configured.' });
    }

    const diffKey = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const diffNote = DIFFICULTY_PROMPT[diffKey];
    const sourceLabel = source || 'document';

    const JSON_FORMAT = `[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]`;

    const RULES = `Rules:
- correctAnswer is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
- Each question must have exactly 4 options
- Questions must be clear and unambiguous
- Return ONLY the JSON array — no markdown, no explanation, no code fences`;

    let prompt;

    // ── RAG path: retrieve semantically relevant chunks ──────────────────────
    if (ragId && hasIndex(ragId)) {
      const k = DIFFICULTY_CHUNKS[diffKey];
      const retrievalQuery = topic?.trim() || 'key concepts, definitions, important facts';
      const chunks = await retrieveChunks(ragId, retrievalQuery, k);

      const context = chunks
        .map((c, i) => `[Chunk ${i + 1}]\n${c}`)
        .join('\n\n');

      prompt = `You are a quiz generator. Generate exactly ${count} multiple-choice questions STRICTLY based on the retrieved context below. Do not use any outside knowledge — every question must be answerable from the provided chunks.

Difficulty: ${diffKey.toUpperCase()} — ${diffNote}

--- RETRIEVED CONTEXT (${chunks.length} chunks from ${sourceLabel}) ---
${context}
--- END CONTEXT ---

Return ONLY a valid JSON array in this format:
${JSON_FORMAT}

${RULES}`;

    // ── Fallback: plain text dump (ragId missing or expired) ─────────────────
    } else if (text?.trim()) {
      const MAX_CHARS = 8000;
      prompt = `You are a quiz generator. Generate exactly ${count} multiple-choice questions STRICTLY based on the following ${sourceLabel} content.

Difficulty: ${diffKey.toUpperCase()} — ${diffNote}

--- BEGIN TEXT ---
${text.slice(0, MAX_CHARS)}${text.length > MAX_CHARS ? '\n[... text truncated ...]' : ''}
--- END TEXT ---

Return ONLY a valid JSON array in this format:
${JSON_FORMAT}

${RULES}`;

    // ── Topic path ────────────────────────────────────────────────────────────
    } else {
      prompt = `Generate ${count} multiple-choice quiz questions about: "${topic.trim()}".

Difficulty: ${diffKey.toUpperCase()} — ${diffNote}

Return ONLY a valid JSON array in this format:
${JSON_FORMAT}

${RULES}`;
    }

    const response = await withKeyRotation((apiKey) =>
      getClient(apiKey).chat.completions.create({
        model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 3000,
      })
    );

    const raw = response.choices[0].message.content.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(500).json({ error: 'AI returned an unexpected format — please try again.' });
    }

    const questions = JSON.parse(match[0]);
    res.json({ questions, difficulty: diffKey, usedRag: !!(ragId && hasIndex(ragId)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
