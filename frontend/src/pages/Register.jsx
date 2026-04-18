import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name',     label: 'Your Name',  type: 'text',     placeholder: 'John Doe',           icon: '🧑' },
    { key: 'email',    label: 'Email',       type: 'email',    placeholder: 'you@college.edu',    icon: '📧' },
    { key: 'password', label: 'Password',    type: 'password', placeholder: 'Min 6 characters',   icon: '🔒' },
  ];

  return (
    <div className="bg-mesh min-h-[90vh] flex items-center justify-center px-4">
      <div className="blob w-72 h-72 bg-brand-cyan top-10 left-10" />
      <div className="blob w-56 h-56 bg-brand-purple bottom-10 right-10" />

      <div className="relative w-full max-w-md animate-bounce-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float inline-block">🎓</div>
          <h1 className="font-heading font-black text-3xl text-white">Join QuizForge</h1>
          <p className="text-gray-400 mt-1 font-body text-sm">Free forever. No credit card. Just vibes.</p>
        </div>

        <div className="card-glow p-8 rounded-3xl">
          {error && (
            <div className="badge-red w-full mb-5 py-3 px-4 rounded-xl justify-start text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-heading font-bold text-gray-400 mb-2 uppercase tracking-wider">
                  {f.icon} {f.label}
                </label>
                <input
                  type={f.type} required
                  value={form[f.key]} onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="input"
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : '🚀 Create My Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-body">
            Already in?{' '}
            <Link to="/login" className="text-brand-purple font-bold hover:text-brand-pink transition">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
