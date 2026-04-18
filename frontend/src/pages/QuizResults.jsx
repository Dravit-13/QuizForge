import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card-glow p-4 rounded-2xl text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-heading font-black text-2xl ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-body">{label}</div>
    </div>
  );
}

export default function QuizResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/quiz-results/${quizId}`)
      .then(({ data }) => setData(data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [quizId, navigate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-10 h-10 rounded-full border-[3px] border-brand-purple/30 border-t-brand-purple animate-spin" />
      <p className="text-gray-400 font-body">Loading results...</p>
    </div>
  );
  if (!data) return null;

  const { quiz, stats, attempts } = data;
  const avgPct = Math.round((stats.average / quiz.totalQuestions) * 100);

  return (
    <div className="bg-mesh min-h-screen">
      <div className="blob w-80 h-80 bg-brand-purple top-0 right-0" />
      <div className="blob w-64 h-64 bg-brand-cyan bottom-0 left-0" />

      <div className="relative max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition font-body group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
        </button>

        {/* Header */}
        <div className="card-glow p-6 rounded-3xl mb-6">
          <h1 className="font-heading font-black text-3xl text-white mb-1">{quiz.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="badge-purple">
              <span className="font-mono tracking-widest">{quiz.quizCode}</span>
            </div>
            <span className="text-gray-500 text-sm font-body">{quiz.totalQuestions} questions</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon="👥" label="Total Attempts" value={stats.total}      color="text-brand-purple" />
          <StatCard icon="📊" label="Avg Score"       value={`${avgPct}%`}    color="text-brand-cyan"   />
          <StatCard icon="🏆" label="Highest"         value={`${stats.highest}/${quiz.totalQuestions}`} color="text-green-400" />
          <StatCard icon="📉" label="Lowest"          value={`${stats.lowest}/${quiz.totalQuestions}`}  color="text-red-400"  />
        </div>

        {/* Attempts list */}
        {attempts.length === 0 ? (
          <div className="card-glow p-16 text-center rounded-3xl">
            <div className="text-4xl mb-3 animate-float inline-block">🕐</div>
            <p className="text-gray-400 font-body">No attempts yet. Share the code to get started!</p>
          </div>
        ) : (
          <div className="card-glow rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 px-5 py-3 border-b border-dark-border text-xs text-gray-500 font-heading font-bold uppercase tracking-wider bg-dark-bg/50">
              <div className="col-span-2">Participant</div>
              <div>Score</div>
              <div>Result</div>
              <div>Date</div>
            </div>

            {attempts.map((a, i) => {
              const pct = Math.round((a.score / a.totalQuestions) * 100);
              const isLast = i === attempts.length - 1;
              const badgeCls = pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-red';
              return (
                <div
                  key={a._id}
                  className={`grid grid-cols-5 gap-2 px-5 py-4 text-sm font-body hover:bg-brand-purple/5 transition ${
                    !isLast ? 'border-b border-dark-border/50' : ''
                  }`}
                >
                  <div className="col-span-2 font-heading font-bold text-white truncate flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-xs text-white font-black shrink-0">
                      {a.userName?.[0]?.toUpperCase()}
                    </div>
                    {a.userName}
                  </div>
                  <div className="text-gray-300 self-center">
                    {a.score}/{a.totalQuestions}
                    {a.timeTaken > 0 && (
                      <span className="text-gray-600 text-xs ml-1">
                        ({Math.floor(a.timeTaken / 60)}m {a.timeTaken % 60}s)
                      </span>
                    )}
                  </div>
                  <div className="self-center">
                    <span className={badgeCls}>{pct}%</span>
                  </div>
                  <div className="text-gray-600 text-xs self-center">
                    {new Date(a.createdAt).toLocaleDateString()}
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
