import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/my-quizzes')
      .then(({ data }) => setQuizzes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 1800);
  };

  const deleteQuiz = async (id, title) => {
    if (!window.confirm(`Delete "${title}" and all its attempts?`)) return;
    try {
      await api.delete(`/quiz/${id}`);
      setQuizzes((qs) => qs.filter((q) => q._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const diffBadge = (d) => ({
    easy:   { cls: 'badge-green',  label: '🟢 Easy' },
    medium: { cls: 'badge-yellow', label: '🟡 Medium' },
    hard:   { cls: 'badge-red',    label: '🔴 Hard' },
  }[d] || { cls: 'badge-purple', label: '📝 Quiz' });

  return (
    <div className="bg-mesh min-h-screen">
      <div className="blob w-96 h-96 bg-brand-purple top-0 right-0" />
      <div className="blob w-72 h-72 bg-brand-pink bottom-20 left-0" />

      <div className="relative max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-heading font-black text-4xl text-white">My Quizzes 🎯</h1>
            <p className="text-gray-400 mt-1 font-body">
              Hey <span className="text-brand-purple font-bold">{user?.name}</span> — ready to quiz your class?
            </p>
          </div>
          <Link to="/create" className="btn-primary gap-2">✨ New Quiz</Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-[3px] border-brand-purple/30 border-t-brand-purple animate-spin" />
            <p className="text-gray-400 font-body">Loading your quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card-glow p-16 text-center rounded-3xl">
            <div className="text-5xl mb-4 animate-float inline-block">📋</div>
            <h2 className="font-heading font-bold text-xl mb-2 text-white">No quizzes yet!</h2>
            <p className="text-gray-400 mb-6 font-body">Create your first quiz and make your class sweat 😈</p>
            <Link to="/create" className="btn-primary px-8 py-3">✨ Create First Quiz</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => {
              const diff = diffBadge(q.difficulty);
              return (
                <div key={q._id} className="card-glow p-5 rounded-2xl flex flex-col gap-4 hover:-translate-y-1 transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-bold text-white text-base leading-tight line-clamp-2 flex-1">{q.title}</h3>
                    <span className={`${diff.cls} shrink-0`}>{diff.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 font-body">
                    <span>📝 {q.questions?.length || '?'} Qs</span>
                    {q.timeLimit > 0 && <span>⏱ {q.timeLimit}m</span>}
                    <span>👥 {q.attemptCount} attempt{q.attemptCount !== 1 ? 's' : ''}</span>
                  </div>

                  <button
                    onClick={() => copyCode(q.quizCode)}
                    className="flex items-center justify-between bg-dark-bg rounded-xl px-3 py-2.5 border border-dark-border hover:border-brand-purple/50 transition"
                  >
                    <span className="font-heading font-black tracking-[0.3em] text-brand-purple text-sm">{q.quizCode}</span>
                    <span className="text-xs text-gray-500">
                      {copiedCode === q.quizCode ? '✓ Copied!' : '📋 Copy'}
                    </span>
                  </button>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => navigate(`/results/${q._id}`)} className="btn-secondary flex-1 py-2 text-xs">📊 Results</button>
                    <button onClick={() => deleteQuiz(q._id, q.title)} className="px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-red-400 hover:bg-red-500/10 border border-dark-border transition">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
