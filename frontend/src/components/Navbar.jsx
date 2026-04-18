import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAuth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-dark-bg/80 border-b border-dark-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-base shadow-lg shadow-brand-purple/30 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <span className="font-heading font-black text-lg text-gradient">QuizForge</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 text-sm font-heading font-semibold">
          <Link
            to="/join"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              isActive('/join')
                ? 'bg-brand-purple/20 text-purple-300'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🔑 Join
          </Link>

          {isAuth ? (
            <>
              <Link
                to="/create"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive('/create')
                    ? 'bg-brand-purple/20 text-purple-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                ✨ Create
              </Link>
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive('/dashboard')
                    ? 'bg-brand-purple/20 text-purple-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📊 Dashboard
              </Link>
              <div className="w-px h-4 bg-dark-border mx-1" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-xs font-black text-white shadow">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-400 transition px-2 py-1 rounded-lg text-xs hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Sign Up Free 🚀
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
