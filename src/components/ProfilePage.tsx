import { useState, useEffect } from 'react';
import { BadgeCheck, GraduationCap, BookOpen, Calendar, Award, CreditCard as Edit3, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import { getTheme, COLOR_THEMES } from '../lib/colors';
import type { GameScore } from '../lib/types';

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [gpa, setGpa] = useState(user?.gpa ?? '');
  const [grade, setGrade] = useState(user?.grade ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [colorTheme, setColorTheme] = useState(user?.color_theme ?? 'blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [scores, setScores] = useState<GameScore[]>([]);
  const { upload, uploading } = useUploadMedia();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('game_scores').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]).then(([f, fw, s]) => {
      setFollowers(f.count ?? 0);
      setFollowing(fw.count ?? 0);
      if (s.data) setScores(s.data as GameScore[]);
    });
  }, [user]);

  if (!user) return null;
  const theme = getTheme(user.color_theme);

  const handleSave = async () => {
    setSaving(true); setError('');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ bio: bio.trim() || null, gpa: gpa.trim() || null, grade: grade.trim() || null, avatar_url: avatarUrl || null, color_theme: colorTheme })
      .eq('id', user.id);
    setSaving(false);
    if (updateError) { setError('Failed to save.'); return; }
    await refreshUser();
    setEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const result = await upload(file);
    if (result) setAvatarUrl(result.url);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="glass-strong rounded-3xl p-6 animate-slide-up">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {avatarUrl || user.avatar_url ? (
              <img src={avatarUrl || user.avatar_url!} alt="" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-blue-400/40" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-cream" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            {user.verified && <BadgeCheck className="absolute -bottom-1 -right-1 w-7 h-7 text-blue-400 bg-slate-950 rounded-full p-0.5" />}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <h2 className="text-xl font-bold text-cream">{user.name}</h2>
            {user.verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
          </div>
          <p className="text-xs text-slate-500 mt-1">Joined {formatTime(user.created_at)}</p>
          {user.is_admin && <span className="mt-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">Admin</span>}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-3 rounded-xl glass">
            <p className="text-2xl font-bold text-amber-400">{user.points}</p>
            <p className="text-xs text-slate-500 mt-1">Points</p>
          </div>
          <div className="text-center p-3 rounded-xl glass">
            <p className="text-2xl font-bold text-blue-400">{followers}</p>
            <p className="text-xs text-slate-500 mt-1">Followers</p>
          </div>
          <div className="text-center p-3 rounded-xl glass">
            <p className="text-2xl font-bold text-blue-400">{following}</p>
            <p className="text-xs text-slate-500 mt-1">Following</p>
          </div>
        </div>

        {!editing ? (
          <>
            {user.bio && <p className="text-sm text-slate-300 mt-4 text-center">{user.bio}</p>}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {user.gpa && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">GPA: <span className="text-cream font-medium">{user.gpa}</span></span>
                </div>
              )}
              {user.grade && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Grade: <span className="text-cream font-medium">{user.grade}</span></span>
                </div>
              )}
              {user.student_status && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">{user.student_status === 'current' ? 'Current Student' : 'Ex-Student'}</span>
                </div>
              )}
            </div>
            <button onClick={() => setEditing(true)} className="btn-ghost w-full mt-4 flex items-center justify-center gap-2">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </>
        ) : (
          <div className="space-y-3 mt-4 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Avatar</label>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-xs text-slate-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-300" />
              {uploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="input-field resize-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">GPA</label>
                <input type="text" value={gpa} onChange={(e) => setGpa(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Grade</label>
                <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Color Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_THEMES.map((t) => (
                  <button key={t.id} onClick={() => setColorTheme(t.id)}
                    className={`rounded-lg p-2 transition-all ${colorTheme === t.id ? 'ring-2 ring-blue-400' : 'ring-1 ring-slate-700'}`}>
                    <div className="w-full h-6 rounded" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setBio(user.bio ?? ''); setGpa(user.gpa ?? ''); setGrade(user.grade ?? ''); }} className="btn-ghost flex-1 flex items-center justify-center gap-1">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {scores.length > 0 && (
        <div className="glass-strong rounded-2xl p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Game Scores
          </h3>
          <div className="space-y-2">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg glass">
                <span className="text-sm text-slate-200">{s.game}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-400">{s.score}</span>
                  <span className="text-xs text-slate-500">{formatTime(s.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user.verified && (
        <div className="glass-strong rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BadgeCheck className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-cream">Get Verified</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">Request a verified badge to unlock name changes and show you're a real member.</p>
          <button
            onClick={async () => {
              if (user.verification_requested) return;
              await supabase.from('verification_requests').insert({ profile_id: user.id, profile_name: user.name, status: 'pending' });
              await supabase.from('profiles').update({ verification_requested: true }).eq('id', user.id);
              await refreshUser();
            }}
            disabled={user.verification_requested}
            className={`btn-primary w-full ${user.verification_requested ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {user.verification_requested ? 'Request Sent' : 'Request Verification'}
          </button>
        </div>
      )}
    </div>
  );
}
