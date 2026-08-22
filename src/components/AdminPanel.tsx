import { useState, useEffect } from 'react';
import { Shield, Trash2, BadgeCheck, Mail, Gift, Plus, Star, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { formatTime } from '../lib/hooks';
import type { Profile, VerificationRequest } from '../lib/types';

export default function AdminPanel() {
  const { user, refreshUser } = useUser();
  const [tab, setTab] = useState<'users' | 'verification' | 'rewards'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [{ data: profileData }, { data: verifData }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('verification_requests').select('*').order('created_at', { ascending: false }),
      ]);
      if (profileData) setProfiles(profileData as Profile[]);
      if (verifData) setVerifications(verifData as VerificationRequest[]);
      setLoading(false);
    };
    loadData();
  }, []);

  const toggleBan = async (p: Profile) => {
    await supabase.from('profiles').update({ is_banned: !p.is_banned }).eq('id', p.id);
    setProfiles((prev) => prev.map((u) => u.id === p.id ? { ...u, is_banned: !u.is_banned } : u));
  };

  const toggleAdmin = async (p: Profile) => {
    await supabase.from('profiles').update({ is_admin: !p.is_admin }).eq('id', p.id);
    setProfiles((prev) => prev.map((u) => u.id === p.id ? { ...u, is_admin: !u.is_admin } : u));
    if (p.id === user?.id) await refreshUser();
  };

  const toggleVerified = async (p: Profile) => {
    await supabase.from('profiles').update({ verified: !p.verified }).eq('id', p.id);
    setProfiles((prev) => prev.map((u) => u.id === p.id ? { ...u, verified: !u.verified } : u));
  };

  const approveVerification = async (req: VerificationRequest) => {
    await supabase.from('profiles').update({ verified: true, verification_requested: false }).eq('id', req.profile_id);
    await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', req.id);
    setVerifications((prev) => prev.filter((v) => v.id !== req.id));
    setProfiles((prev) => prev.map((u) => u.id === req.profile_id ? { ...u, verified: true, verification_requested: false } : u));
  };

  const rejectVerification = async (req: VerificationRequest) => {
    await supabase.from('profiles').update({ verification_requested: false }).eq('id', req.profile_id);
    await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', req.id);
    setVerifications((prev) => prev.filter((v) => v.id !== req.id));
    setProfiles((prev) => prev.map((u) => u.id === req.profile_id ? { ...u, verification_requested: false } : u));
  };

  const addPoints = async (p: Profile, amount: number) => {
    await supabase.from('profiles').update({ points: (p.points ?? 0) + amount }).eq('id', p.id);
    setProfiles((prev) => prev.map((u) => u.id === p.id ? { ...u, points: (u.points ?? 0) + amount } : u));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-cream">Admin Dashboard</h2>
      </div>

      <div className="flex gap-2">
        {(['users', 'verification', 'rewards'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'nav-gradient text-cream' : 'glass text-slate-400 hover:text-cream'}`}>
            {t === 'users' ? 'Users' : t === 'verification' ? `Verification (${verifications.length})` : 'Rewards'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="glass-strong rounded-2xl p-4 animate-fade-in">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-cream">{p.name}</p>
                        {p.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                        {p.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Admin</span>}
                        {p.is_banned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Banned</span>}
                      </div>
                      {p.email && <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-amber-400">{p.points ?? 0} pts</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={() => toggleBan(p)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${p.is_banned ? 'bg-green-500/20 text-green-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {p.is_banned ? 'Unban' : 'Ban'}
                  </button>
                  <button onClick={() => toggleAdmin(p)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${p.is_admin ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {p.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                  <button onClick={() => toggleVerified(p)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${p.verified ? 'bg-slate-700 text-slate-400' : 'bg-blue-500/20 text-blue-300'}`}>
                    <BadgeCheck className="w-3 h-3 inline mr-1" />{p.verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button onClick={() => addPoints(p, 100)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300">
                    +100 pts
                  </button>
                  <button onClick={() => addPoints(p, -100)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-400">
                    -100 pts
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'verification' && (
        verifications.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No pending verification requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {verifications.map((req) => (
              <div key={req.id} className="glass-strong rounded-2xl p-4 flex items-center justify-between animate-fade-in">
                <div>
                  <p className="text-sm font-bold text-cream">{req.profile_name}</p>
                  <p className="text-xs text-slate-500">Requested {formatTime(req.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveVerification(req)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-300">Approve</button>
                  <button onClick={() => rejectVerification(req)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'rewards' && <AdminRewards />}
    </div>
  );
}

function AdminRewards() {
  const [rewards, setRewards] = useState<{ id: string; name: string; cost: number; icon: string }[]>([]);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [icon] = useState('gift');

  useEffect(() => {
    supabase.from('rewards').select('*').order('cost', { ascending: true }).then(({ data }) => {
      if (data) setRewards(data);
    });
  }, []);

  const create = async () => {
    if (!name.trim() || !cost.trim()) return;
    const { data } = await supabase.from('rewards').insert({ name: name.trim(), description: '', cost: parseInt(cost), icon }).select('*').maybeSingle();
    if (data) { setRewards((prev) => [...prev, data]); setName(''); setCost(''); }
  };

  const remove = async (id: string) => {
    await supabase.from('rewards').delete().eq('id', id);
    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reward name" className="input-field flex-1 text-sm" />
          <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost" className="input-field w-24 text-sm" />
          <button onClick={create} className="btn-primary px-4 text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>
      {rewards.map((r) => (
        <div key={r.id} className="glass-strong rounded-2xl p-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-cream">{r.name}</span>
            <span className="text-xs text-amber-400 flex items-center gap-1"><Star className="w-3 h-3" />{r.cost}</span>
          </div>
          <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}
