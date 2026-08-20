import { useEffect, useState } from 'react';
import { User, Star, Trophy, Calendar, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { COLOR_THEMES, getTheme } from '../lib/colors';
import type { GameScore } from '../lib/types';

export default function ProfilePage() {
  const { user, setUser, refreshUser } = useUser();
  const [scores, setScores] = useState<GameScore[]>([]);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar_url ?? '');
  const [editColor, setEditColor] = useState(user?.color_theme ?? 'blue');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState('');

  const theme = getTheme(editColor);

  useEffect(() => {
    if (!user) return;
    setEditName(user.name);
    setEditAvatar(user.avatar_url ?? '');
    setEditColor(user.color_theme);
    loadScores();
  }, [user]);

  const loadScores = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .eq('profile_id', user.id)
      .order('score', { ascending: false })
      .limit(10);
    if (data) setScores(data as GameScore[]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setNameError('');

    if (editName.trim() !== user.name) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', editName.trim())
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        setNameError('That name is already taken.');
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: editName.trim(),
        avatar_url: editAvatar.trim() || null,
        color_theme: editColor,
      })
      .eq('id', user.id)
      .select('*')
      .maybeSingle();

    setSaving(false);
    if (error || !data) {
      setNameError('Could not save. Try again.');
      return;
    }
    setUser(data as typeof user);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  const bestSky = scores.find((s) => s.game === 'sky_battle')?.score ?? 0;
  const bestTraitor = scores.filter((s) => s.game === 'traitor').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* hero card */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden animate-slide-up">
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
          style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
        />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {editAvatar ? (
            <img src={editAvatar} alt="" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/20" />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-cream"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-cream">{user.name}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium">
                <Star className="w-4 h-4" /> {user.points} pts
              </span>
              {user.is_admin && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
                  Moderator
                </span>
              )}
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700/40 text-slate-400 text-sm">
                <Calendar className="w-4 h-4" />
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Star} label="Points" value={user.points} color="amber" />
        <StatCard icon={Trophy} label="Sky Battle Best" value={bestSky} color="blue" />
        <StatCard icon={User} label="Traitor Games" value={bestTraitor} color="rose" />
        <StatCard icon={Trophy} label="Total Scores" value={scores.length} color="emerald" />
      </div>

      {/* edit form */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-cream mb-4">Edit Profile</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Display Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setNameError(''); }}
              className="input-field"
            />
            {nameError && <p className="text-rose-400 text-sm mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Avatar URL</label>
            <input
              type="text"
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2 font-medium">Color Theme</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEditColor(t.id)}
                  className={`rounded-xl p-2 transition-all ${editColor === t.id ? 'ring-2 ring-blue-400 scale-105' : 'ring-1 ring-slate-700'}`}
                >
                  <div className="w-full h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saved ? <><Check className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Changes'}</>}
          </button>
        </div>
      </div>

      {/* score history */}
      {scores.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-cream mb-4">Score History</h3>
          <div className="space-y-2">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-cream text-sm font-medium capitalize">
                    {s.game.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-amber-400 font-bold">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Star; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
  };
  return (
    <div className="glass rounded-2xl p-4 flex flex-col items-center text-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-2xl font-bold text-cream">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
