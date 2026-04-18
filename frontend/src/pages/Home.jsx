import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '🤖',
    color: 'from-brand-purple to-brand-pink',
    glow: 'shadow-brand-purple/30',
    title: 'AI-Powered Generation',
    desc: 'Drop a PDF, paste a YouTube link, or type a topic — NVIDIA AI builds your quiz instantly.',
  },
  {
    icon: '⚡',
    color: 'from-brand-yellow to-brand-pink',
    glow: 'shadow-yellow-500/30',
    title: 'Share in Seconds',
    desc: 'Every quiz gets a unique 6-character code. Share it anywhere — no account needed to play.',
  },
  {
    icon: '📊',
    color: 'from-brand-cyan to-brand-purple',
    glow: 'shadow-cyan-500/30',
    title: 'Live Analytics',
    desc: 'Track scores, see who aced it, and flex those stats. Your dashboard, your data.',
  },
];

const stats = [
  { value: '100%', label: 'Free to use' },
  { value: 'AI', label: 'Powered by NVIDIA' },
  { value: '∞', label: 'Quizzes you can create' },
];

export default function Home() {
  const { isAuth } = useAuth();

  return (
    <main className="bg-mesh min-h-screen overflow-hidden">

      {/* Blobs */}
      <div className="blob w-[500px] h-[500px] bg-brand-purple top-[-100px] left-[-150px]" />
      <div className="blob w-[400px] h-[400px] bg-brand-pink top-[200px] right-[-100px]" />
      <div className="blob w-[300px] h-[300px] bg-brand-cyan bottom-[0px] left-[30%]" />

      <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-20">

        {/* Hero */}
        <div className="text-center mb-20 animate-slide-up">
          <div className="badge-purple mb-6 mx-auto">
            <span>✨</span> Powered by NVIDIA NIM AI
          </div>

          <h1 className="font-heading font-black text-5xl sm:text-7xl leading-[1.05] mb-6">
            <span className="text-white">Quizzes that</span>
            <br />
            <span className="text-gradient">actually slap 🔥</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 font-body leading-relaxed">
            Upload your notes, paste a YouTube link, or just type a topic.
            AI generates quiz questions in seconds. Share the code. Let chaos begin.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to={isAuth ? '/create' : '/register'}
              className="btn-primary px-8 py-3.5 text-base animate-pulse-glow"
            >
              {isAuth ? '✨ Create a Quiz' : '🚀 Get Started Free'}
            </Link>
            <Link
              to="/join"
              className="btn-ghost px-8 py-3.5 text-base"
            >
              🔑 Join with Code
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-20">
          {stats.map((s) => (
            <div key={s.label} className="text-center card-glow p-4 rounded-2xl">
              <div className="font-heading font-black text-2xl text-gradient">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 font-body">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card-glow p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} shadow-lg ${f.glow} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="font-heading font-bold text-base mb-2 text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-body">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        {!isAuth && (
          <div className="mt-20 text-center card-glow p-10 rounded-3xl">
            <div className="text-4xl mb-4 animate-float inline-block">🎓</div>
            <h2 className="font-heading font-black text-3xl mb-3">
              Ready to <span className="text-gradient">quiz your class?</span>
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto font-body">
              Free forever. No credit card. Just pure quiz energy.
            </p>
            <Link to="/register" className="btn-primary px-10 py-3.5 text-base">
              Create Your First Quiz →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
