import { useState, type FormEvent } from 'react';
import { Rocket, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { COLOR_THEMES } from '../lib/colors';
import type { Profile } from '../lib/types';

interface Props {
  onComplete: (user: Profile) => void;
}

export default function ProfileSetup({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState('blue');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const checkName = async (value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', value.trim())
      .maybeSingle();
    return !data;
  };

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    setChecking(true);
    const isUnique = await checkName(trimmed);
    setChecking(false);
    if (!isUnique) {
      setError('That name is already taken. Please choose another.');
      return;
    }
    setStep(1);
  };

  const handleFinish = async () => {
    setCreating(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert({
        name: name.trim(),
        color_theme: color,
        avatar_url: avatarUrl.trim() || null,
        points: 100,
      })
      .select('*')
      .maybeSingle();

    setCreating(false);

    if (insertError || !data) {
      setError('Could not create profile. That name may already be taken.');
      return;
    }

    onComplete(data as Profile);
  };

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center p-6">
      <div className="glass-strong rounded-3xl p-8 sm:p-10 w-full max-w-md animate-slide-up">
        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 nav-gradient' : i < step ? 'w-2 bg-blue-500' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <form onSubmit={handleNameSubmit} className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl nav-gradient flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-cream" />
              </div>
              <h2 className="text-2xl font-bold text-cream">Welcome aboard</h2>
              <p className="text-slate-400 text-sm mt-1">Pick your display name — anything you like.</p>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. SkyKnight, 🎮Gamer, anything!"
                className="input-field"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={checking} className="btn-primary w-full">
              {checking ? 'Checking availability...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-cream">Choose your color</h2>
              <p className="text-slate-400 text-sm mt-1">Your signature theme across the lounge.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setColor(theme.id)}
                  className={`relative rounded-2xl p-4 transition-all duration-200 ${
                    color === theme.id
                      ? 'ring-2 ring-blue-400 scale-105'
                      : 'ring-1 ring-slate-700 hover:ring-blue-500/50'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${theme.from}33, ${theme.to}33)` }}
                >
                  <div
                    className="w-full h-10 rounded-lg mb-2"
                    style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                  />
                  <span className="text-xs text-slate-300">{theme.name}</span>
                  {color === theme.id && (
                    <Check className="absolute top-2 right-2 w-4 h-4 text-blue-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-ghost flex-1">
                Back
              </button>
              <button onClick={() => setStep(2)} className="btn-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-cream">Avatar (optional)</h2>
              <p className="text-slate-400 text-sm mt-1">Paste an image URL, or skip for a default.</p>
            </div>

            <div className="flex justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar preview"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-blue-400/40"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl nav-gradient flex items-center justify-center text-3xl font-bold text-cream">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://image-url.png (optional)"
              className="input-field"
            />

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">
                Back
              </button>
              <button onClick={handleFinish} disabled={creating} className="btn-primary flex-1">
                {creating ? 'Creating profile...' : 'Enter Lounge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
