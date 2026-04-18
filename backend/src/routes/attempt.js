const router = require('express').Router();
const Attempt = require('../models/Attempt');
const Quiz = require('../models/Quiz');
const { optionalAuth } = require('../middleware/auth');

// POST /api/submit-quiz
router.post('/submit-quiz', optionalAuth, async (req, res) => {
  try {
    const { quizCode, userName, answers, timeTaken } = req.body;
    if (!quizCode || !userName?.trim() || !answers) {
      return res.status(400).json({ error: 'quizCode, userName, and answers are required' });
    }

    const quiz = await Quiz.findOne({ quizCode: quizCode.toUpperCase(), isActive: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    let score = 0;
    const details = quiz.questions.map((q, i) => {
      const selected = answers[i] ?? -1;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        question: q.question,
        options: q.options,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    const attempt = await Attempt.create({
      quizId: quiz._id,
      userId: req.user?.id || null,
      userName: userName.trim(),
      answers,
      score,
      totalQuestions: quiz.questions.length,
      timeTaken: timeTaken || 0,
    });

    res.status(201).json({
      attemptId: attempt._id,
      score,
      totalQuestions: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      details,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
