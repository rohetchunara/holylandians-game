import { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Star, Check, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { formatTime } from '../lib/hooks';
import type { Reward, RewardRedemption } from '../lib/types';

const ICONS: Record<string, string> = {
  gift: '🎁', star: '⭐', crown: '👑', trophy: '🏆', rocket: '🚀', bolt: '⚡', gem: '💎', fire: '🔥',
};

export default function RewardsPage() {
  const { user, refreshUser } = useUser();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [icon, setIcon] = useState('gift');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRewards = async () => {
      const [{ data: rewardsData }, { data: redemptionData }] = await Promise.all([
        supabase.from('rewards').select('*').order('cost', { ascending: true }),
        supabase.from('reward_redemptions').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      if (rewardsData) setRewards(rewardsData as Reward[]);
      if (redemptionData) setRedemptions(redemptionData as RewardRedemption[]);
      setLoading(false);
    };
    loadRewards();

    const channel = supabase
      .channel('rewards')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rewards' },
        (payload) => setRewards((prev) => [...prev, payload.new as Reward].sort((a, b) => a.cost - b.cost)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rewards' },
        (payload) => setRewards((prev) => prev.filter((r) => r.id !== payload.old.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reward_redemptions' },
        (payload) => setRedemptions((prev) => [payload.new as RewardRedemption, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!user?.is_admin || !name.trim() || !cost.trim()) return;
    setError('');
    const { error: insertError } = await supabase
      .from('rewards')
      .insert({ name: name.trim(), description: desc.trim(), cost: parseInt(cost), icon });
    if (insertError) { setError('Failed to create reward.'); return; }
    setName(''); setDesc(''); setCost(''); setIcon('gift');
    setShowCreate(false);
  };

  const handleRedeem = async (reward: Reward) => {
    if (!user || (user.points ?? 0) < reward.cost || redeeming) return;
    setRedeeming(true); setError('');
    const { error: redeemError } = await supabase
      .from('reward_redemptions')
      .insert({ profile_id: user.id, reward_name: reward.name, cost: reward.cost });
    if (redeemError) { setError('Failed to redeem.'); setRedeeming(false); return; }
    await supabase.from('profiles').update({ points: (user.points ?? 0) - reward.cost }).eq('id', user.id);
    await refreshUser();
    setRedeeming(false);
  };

  const handleDelete = async (reward: Reward) => {
    if (!user?.is_admin) return;
    await supabase.from('rewards').delete().eq('id', reward.id);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-cream">Rewards Store</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl glass text-amber-400 text-sm font-bold">{user?.points ?? 0} pts</div>
          {user?.is_admin && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-3 py-1.5 flex items-center gap-1 text-sm">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      {showCreate && user?.is_admin && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reward name" className="input-field" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="input-field resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cost (points)</label>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="100" className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Icon</label>
              <select value={icon} onChange={(e) => setIcon(e.target.value)} className="input-field">
                {Object.keys(ICONS).map((k) => <option key={k} value={k} className="bg-slate-900">{ICONS[k]} {k}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleCreate} className="btn-primary flex-1">Create Reward</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No rewards yet. {user?.is_admin ? 'Add some for the community!' : 'Check back soon!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rewards.map((reward) => {
            const canAfford = (user?.points ?? 0) >= reward.cost;
            return (
              <div key={reward.id} className="glass-strong rounded-2xl p-4 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{ICONS[reward.icon] ?? '🎁'}</div>
                  {user?.is_admin && (
                    <button onClick={() => handleDelete(reward)} className="text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-sm font-bold text-cream mt-2">{reward.name}</h3>
                {reward.description && <p className="text-xs text-slate-400 mt-1">{reward.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-lg font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-4 h-4" />{reward.cost}
                  </p>
                  <button onClick={() => handleRedeem(reward)} disabled={!canAfford || redeeming}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${canAfford ? 'btn-primary' : 'glass text-slate-500 cursor-not-allowed'}`}>
                    {canAfford ? <span className="flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> Redeem</span> : 'Not enough pts'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {redemptions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-400" /> Recent Redemptions
          </h3>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="glass rounded-xl px-4 py-2.5 flex items-center justify-between animate-fade-in">
                <span className="text-sm text-slate-200">{r.reward_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400">-{r.cost} pts</span>
                  <span className="text-xs text-slate-500">{formatTime(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
