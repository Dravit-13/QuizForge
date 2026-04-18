import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function JoinQuiz() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const join = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    setLoading(true);
    try {
      await api.get(`/quiz/${trimmed}`);
      navigate(`/quiz/${trimmed}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Quiz not found. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-[90vh] flex items-center justify-center px-4">
      <div className="blob w-80 h-80 bg-brand-yellow top-0 right-0 opacity-10" />
      <div className="blob w-64 h-64 bg-brand-purple bottom-0 left-0" />

      <div className="relative w-full max-w-sm animate-bounce-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float inline-block">🔑</div>
          <h1 className="font-heading font-black text-4xl text-white">Join a Quiz</h1>
          <p className="text-gray-400 mt-2 font-body text-sm">Enter the code from your host</p>
        </div>

        <form onSubmit={join} className="card-glow p-8 rounded-3xl">
          <div className="mb-6">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6));
                setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-4 py-5
                         text-center text-3xl font-heading font-black tracking-[0.5em]
                         focus:outline-none focus:border-brand-purple transition-all
                         placeholder:text-dark-muted placeholder:text-xl"
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                  i < code.length
                    ? 'bg-gradient-to-r from-brand-purple to-brand-pink'
                    : 'bg-dark-border'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="badge-red w-full mb-4 py-3 px-4 rounded-xl justify-start text-sm">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading || code.length < 6} className="btn-primary w-full py-3.5 text-base" title="Enter 6-character code">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding quiz...
              </span>
            ) : "🎯 Let's Go!"}
          </button>
        </form>
      </div>
    </div>
  );
}
