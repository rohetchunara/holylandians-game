import { useState } from 'react';
import { Shield, X, Lock } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function AdminModal({ onClose }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toLowerCase() === 'rohit') {
      setUnlocked(true);
      setError('');
    } else {
      setError('Incorrect admin code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-cream">Admin Access</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        {unlocked ? (
          <div className="space-y-3">
            <p className="text-sm text-green-400 text-center">Access granted! The admin panel is now available in the sidebar.</p>
            <button onClick={onClose} className="btn-primary w-full">Continue</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Lock className="w-4 h-4" /><span>Enter the admin access code</span>
            </div>
            <input type="password" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="Admin code" className="input-field text-center" autoFocus />
            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
            <button type="submit" className="btn-primary w-full">Unlock</button>
          </form>
        )}
      </div>
    </div>
  );
}
