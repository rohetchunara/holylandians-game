import { useEffect, useState, type FormEvent } from 'react';
import { Lock, ArrowRight, Plane } from 'lucide-react';
import { isAuthed, setAuthed } from '../lib/storage';

const GATE_PASSWORD = 'lado';

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // already authed in this browser session — skip the gate
  useEffect(() => {
    if (isAuthed()) onUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim().toLowerCase() === GATE_PASSWORD) {
      setAuthed();
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center p-6 relative overflow-hidden">
      {/* floating ambient planes */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <Plane className="absolute top-[15%] left-[10%] w-12 h-12 text-blue-400 animate-float" style={{ animationDelay: '0s' }} />
        <Plane className="absolute top-[60%] right-[12%] w-16 h-16 text-blue-500 animate-float" style={{ animationDelay: '2s', transform: 'scaleX(-1)' }} />
        <Plane className="absolute bottom-[20%] left-[20%] w-10 h-10 text-blue-300 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className={`glass-strong rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10 ${shake ? 'animate-[shake_0.5s]' : 'animate-slide-up'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl nav-gradient flex items-center justify-center mb-4 animate-pulse-glow">
            <Lock className="w-9 h-9 text-cream" />
          </div>
          <h1 className="text-3xl font-bold text-cream tracking-tight">HOLYLANDIANS</h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">Members Lounge — Private Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Access Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter the lounge password"
              className="input-field text-center text-lg tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-rose-400 text-sm text-center animate-fade-in">
              Incorrect password. Try again.
            </p>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            Enter Lounge
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Authorized members only. New here? You'll create a profile next.
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
