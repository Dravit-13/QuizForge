import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-[90vh] flex items-center justify-center px-4">
      <div className="blob w-72 h-72 bg-brand-purple top-10 right-10" />
      <div className="blob w-56 h-56 bg-brand-pink bottom-10 left-10" />

      <div className="relative w-full max-w-md animate-bounce-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float inline-block">👋</div>
          <h1 className="font-heading font-black text-3xl text-white">Welcome back!</h1>
          <p className="text-gray-400 mt-1 font-body text-sm">Sign in and keep the quiz energy going</p>
        </div>

        <div className="card-glow p-8 rounded-3xl">
          {error && (
            <div className="badge-red w-full mb-5 py-3 px-4 rounded-xl justify-start text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email" required autoFocus
                value={form.email} onChange={set('email')}
                placeholder="you@college.edu"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password" required
                value={form.password} onChange={set('password')}
                placeholder="••••••••"
                className="input"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : '🚀 Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-body">
            No account?{' '}
            <Link to="/register" className="text-brand-purple font-bold hover:text-brand-pink transition">
              Sign up free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
