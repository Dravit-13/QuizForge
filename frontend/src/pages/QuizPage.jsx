import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ── Result screen ────────────────────────────────────── */
function ResultScreen({ result, userName, onRetry }) {
  const pct = result.percentage;
  const { medal, label, bg } =
    pct >= 80 ? { medal: '🏆', label: 'You crushed it!',    bg: 'from-yellow-500/20 to-yellow-600/5' }
    : pct >= 50 ? { medal: '👍', label: 'Not bad at all!',   bg: 'from-brand-purple/20 to-brand-pink/5' }
    :             { medal: '📚', label: 'Time to hit books!', bg: 'from-red-500/20 to-red-600/5' };

  return (
    <div className="bg-mesh min-h-screen">
      <div className="blob w-72 h-72 bg-brand-purple top-0 right-0" />
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Score hero */}
        <div className={`card-glow p-10 text-center mb-6 rounded-3xl bg-gradient-to-br ${bg}`}>
          <div className="text-6xl mb-3 animate-bounce-in inline-block">{medal}</div>
          <h2 className="font-heading font-black text-3xl text-white mb-1">Quiz Complete!</h2>
          <p className="text-gray-400 text-sm mb-6 font-body">{userName}'s results</p>
          <div className="text-7xl font-heading font-black text-gradient mb-2">{pct}%</div>
          <p className="text-gray-400 font-body">
            {result.score} / {result.totalQuestions} correct
          </p>
          <div className="badge-purple mt-4 mx-auto">{label}</div>
        </div>

        {/* Per-question breakdown */}
        <h3 className="font-heading font-bold text-white mb-4">Answer Review</h3>
        <div className="space-y-3 mb-6">
          {result.details.map((d, i) => (
            <div
              key={i}
              className={`card-glow p-5 rounded-2xl border ${
                d.isCorrect ? 'border-green-500/30' : 'border-red-500/30'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  d.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {d.isCorrect ? '✓' : '✗'}
                </span>
                <p className="font-body text-sm text-gray-200 leading-relaxed">{d.question}</p>
              </div>
              <div className="space-y-1.5 ml-9">
                {d.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body ${
                      oi === d.correctAnswer
                        ? 'bg-green-500/15 text-green-300 border border-green-500/20'
                        : oi === d.selectedAnswer && !d.isCorrect
                        ? 'bg-red-500/15 text-red-300 border border-red-500/20'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="font-bold w-4">{String.fromCharCode(65 + oi)}.</span>
                    <span className="flex-1">{opt}</span>
                    {oi === d.correctAnswer && <span className="font-bold text-green-400">✓</span>}
                    {oi === d.selectedAnswer && !d.isCorrect && <span className="font-bold text-red-400">✗</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onRetry} className="btn-secondary w-full py-3">
          🔑 Try Another Quiz
        </button>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */
export default function QuizPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(user?.name || '');
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const startedAt = useRef(null);

  useEffect(() => {
    api.get(`/quiz/${code}`)
      .then(({ data }) => { setQuiz(data); setAnswers(new Array(data.questions.length).fill(-1)); })
      .catch((err) => setLoadError(err.response?.data?.error || 'Quiz not found'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = useCallback(async () => {
    if (submitting || result) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await api.post('/submit-quiz', {
        quizCode: code,
        userName,
        answers,
        timeTaken: Math.round((Date.now() - startedAt.current) / 1000),
      });
      setResult(data);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Submission failed.');
      setSubmitting(false);
    }
  }, [answers, code, quiz, userName, submitting, result]);

  useEffect(() => {
    if (!started || !quiz?.timeLimit || quiz.timeLimit === 0) return;
    const total = quiz.timeLimit * 60;
    setTimeLeft(total);
    const id = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(id); handleSubmit(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-10 h-10 rounded-full border-[3px] border-brand-purple/30 border-t-brand-purple animate-spin" />
      <p className="text-gray-400 font-body">Loading quiz...</p>
    </div>
  );

  if (loadError) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="text-4xl">😕</div>
      <p className="text-red-400 font-body">{loadError}</p>
      <button onClick={() => navigate('/join')} className="btn-secondary">Try Another Code</button>
    </div>
  );

  if (result) return <ResultScreen result={result} userName={userName} onRetry={() => navigate('/join')} />;

  /* ── Pre-start screen ── */
  if (!started) {
    return (
      <div className="bg-mesh min-h-[90vh] flex items-center justify-center px-4">
        <div className="blob w-64 h-64 bg-brand-yellow top-0 right-0 opacity-10" />
        <div className="blob w-56 h-56 bg-brand-purple bottom-0 left-0" />

        <div className="relative w-full max-w-md animate-bounce-in">
          <div className="text-center mb-6">
            <div className="text-5xl animate-float inline-block mb-3">🎮</div>
            <h1 className="font-heading font-black text-3xl text-white">{quiz.title}</h1>
            {quiz.description && <p className="text-gray-400 text-sm mt-2 font-body">{quiz.description}</p>}
          </div>

          <div className="card-glow p-8 rounded-3xl">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-dark-bg rounded-xl p-3 text-center border border-dark-border">
                <div className="font-heading font-black text-2xl text-brand-purple">{quiz.questions.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Questions</div>
              </div>
              {quiz.timeLimit > 0 && (
                <div className="flex-1 bg-dark-bg rounded-xl p-3 text-center border border-dark-border">
                  <div className="font-heading font-black text-2xl text-brand-pink">{quiz.timeLimit}m</div>
                  <div className="text-xs text-gray-500 mt-0.5">Time Limit</div>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-heading font-bold text-gray-400 mb-2 uppercase tracking-wider">
                🧑 Your Name
              </label>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && userName.trim()) { startedAt.current = Date.now(); setStarted(true); } }}
                placeholder="Enter your name to begin"
                className="input"
                autoFocus
              />
            </div>
            <button
              onClick={() => { startedAt.current = Date.now(); setStarted(true); }}
              disabled={!userName.trim()}
              className="btn-primary w-full py-3.5 text-base"
            >
              🚀 Start Quiz!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz screen ── */
  const q = quiz.questions[current];
  const progress = ((current + 1) / quiz.questions.length) * 100;
  const answeredCount = answers.filter((a) => a !== -1).length;
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-mesh min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="font-body text-sm text-gray-400">
            <span className="font-heading font-bold text-white">{current + 1}</span>
            <span> / {quiz.questions.length}</span>
          </div>
          {timeLeft !== null && (
            <span className={`font-heading font-bold text-sm px-3 py-1.5 rounded-xl ${
              timeLeft < 60
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                : 'bg-dark-card border border-dark-border text-gray-300'
            }`}>
              ⏱ {fmt(timeLeft)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-dark-card rounded-full mb-6 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-pink transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card */}
        <div className="card-glow p-6 rounded-2xl mb-4 animate-slide-up">
          <p className="font-body text-base text-white leading-relaxed mb-6">{q.question}</p>

          <div className="space-y-3">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers((a) => a.map((v, i) => (i === current ? oi : v)))}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-body transition-all duration-150 flex items-center gap-3 ${
                  answers[current] === oi
                    ? 'border-brand-purple bg-brand-purple/15 text-white scale-[1.01]'
                    : 'border-dark-border bg-dark-bg/50 hover:border-brand-purple/40 hover:bg-brand-purple/5 text-gray-300'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-heading font-bold text-xs shrink-0 ${
                  answers[current] === oi
                    ? 'bg-brand-purple text-white'
                    : 'bg-dark-card text-gray-500 border border-dark-border'
                }`}>
                  {optionLabels[oi]}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        {submitError && <p className="text-red-400 text-sm mb-3 text-center font-body">{submitError}</p>}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setCurrent((c) => c - 1)} disabled={current === 0} className="btn-secondary flex-1 py-3 disabled:opacity-30">
            ← Prev
          </button>
          {current < quiz.questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="btn-primary flex-1 py-3">
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-heading font-bold text-sm text-white transition-all
                         bg-gradient-to-r from-green-500 to-emerald-600
                         hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/30
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : '🏁 Submit Quiz'}
            </button>
          )}
        </div>

        {/* Dot navigator */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-heading font-bold transition-all ${
                i === current
                  ? 'bg-gradient-to-br from-brand-purple to-brand-pink text-white scale-110'
                  : answers[i] !== -1
                  ? 'bg-brand-purple/25 text-purple-300 border border-brand-purple/30'
                  : 'bg-dark-card text-gray-500 border border-dark-border hover:border-brand-purple/40'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-3 font-body">
          {answeredCount} / {quiz.questions.length} answered
        </p>
      </div>
    </div>
  );
}
