import { useState, type FormEvent } from 'react';
import { Lock, CircleAlert as AlertCircle } from 'lucide-react';

interface Props {
  onUnlock: () => void;
}

const ACCESS_CODE = 'holylandians2026';

export default function PasswordGate({ onUnlock }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().toLowerCase() === ACCESS_CODE) {
      onUnlock();
    } else {
      setError('Incorrect access code.');
    }
  };

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center p-6">
      <div className="glass-strong rounded-3xl p-8 w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl nav-gradient flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-cream" />
          </div>
          <h1 className="text-2xl font-bold text-cream">Members Only</h1>
          <p className="text-slate-400 text-sm mt-1">Enter the access code to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="Access code" className="input-field text-center" autoFocus />
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm justify-center">
              <AlertCircle className="w-4 h-4" /><span>{error}</span>
            </div>
          )}
          <button type="submit" className="btn-primary w-full">Enter</button>
        </form>
      </div>
    </div>
  );
}
