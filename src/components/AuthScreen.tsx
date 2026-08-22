import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus, Mail, Lock, CircleAlert as AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (data.user) onAuthSuccess();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      onAuthSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[15%] left-[10%] w-40 h-40 rounded-full bg-blue-500/30 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-[20%] right-[15%] w-56 h-56 rounded-full bg-blue-600/20 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="glass-strong rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10 animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl nav-gradient flex items-center justify-center mb-4 animate-pulse-glow">
            {mode === 'login' ? <LogIn className="w-9 h-9 text-cream" /> : <UserPlus className="w-9 h-9 text-cream" />}
          </div>
          <h1 className="text-3xl font-bold text-cream tracking-tight">HOLYLANDIANS</h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">
            {mode === 'login' ? 'Welcome back — sign in to continue' : 'Create your account to join the lounge'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field pl-11" autoComplete="email" autoFocus />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="input-field pl-11"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? 'Please wait...' : (<>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight className="w-5 h-5" /></>)}
          </button>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-6 text-xs text-slate-500 justify-center">
          <ShieldCheck className="w-4 h-4" /><span>Your session stays signed in across visits.</span>
        </div>
      </div>
    </div>
  );
}
