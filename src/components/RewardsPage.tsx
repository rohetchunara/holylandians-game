import { useEffect, useState } from 'react';
import { Gift, Star, Check, History, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import type { Reward, RewardRedemption } from '../lib/types';

const ICON_MAP: Record<string, string> = {
  crown: '👑',
  sparkles: '✨',
  'trending-up': '📈',
  palette: '🎨',
  zap: '⚡',
  rocket: '🚀',
  smile: '😄',
  plane: '✈️',
  gift: '🎁',
};

export default function RewardsPage() {
  const { user, refreshUser } = useUser();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRewards();
    loadRedemptions();
  }, []);

  const loadRewards = async () => {
    const { data } = await supabase.from('rewards').select('*').order('cost', { ascending: true });
    if (data) setRewards(data as Reward[]);
    setLoading(false);
  };

  const loadRedemptions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRedemptions(data as RewardRedemption[]);
  };

  const handleRedeem = async (reward: Reward) => {
    if (!user) return;
    if (user.points < reward.cost) {
      setError(`Not enough points. You need ${reward.cost - user.points} more.`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    setRedeeming(reward.id);
    setError('');

    const { error: redeemError } = await supabase.from('reward_redemptions').insert({
      profile_id: user.id,
      reward_name: reward.name,
      cost: reward.cost,
    });

    if (redeemError) {
      setError('Redemption failed. Try again.');
      setRedeeming(null);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: user.points - reward.cost })
      .eq('id', user.id);

    setRedeeming(null);
    if (updateError) {
      setError('Could not deduct points. Contact admin.');
      return;
    }

    setJustRedeemed(reward.id);
    setTimeout(() => setJustRedeemed(null), 3000);
    await refreshUser();
    await loadRedemptions();
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* points header */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Star className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Your Points Balance</p>
            <h2 className="text-4xl font-bold text-amber-400">{user.points}</h2>
            <p className="text-xs text-slate-500 mt-1">Earn more by chatting, uploading, and playing games!</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-3 mb-4 text-rose-400 text-sm flex items-center gap-2 animate-fade-in">
          <span>{error}</span>
        </div>
      )}

      {/* rewards grid */}
      <h3 className="text-lg font-bold text-cream mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-blue-400" /> Available Rewards
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {rewards.map((reward) => {
            const affordable = user.points >= reward.cost;
            const redeemed = justRedeemed === reward.id;
            return (
              <div
                key={reward.id}
                className={`glass rounded-2xl p-5 flex flex-col transition-all duration-200 ${
                  affordable ? 'hover:scale-[1.02] hover:border-blue-500/40' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl">
                    {ICON_MAP[reward.icon] ?? '🎁'}
                  </div>
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-bold">
                    <Star className="w-3 h-3" /> {reward.cost}
                  </span>
                </div>
                <h4 className="text-cream font-bold mb-1">{reward.name}</h4>
                <p className="text-sm text-slate-400 mb-4 flex-1">{reward.description}</p>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!affordable || redeeming === reward.id}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                    redeemed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : affordable
                      ? 'btn-primary'
                      : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {redeemed ? (
                    <span className="flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Redeemed!</span>
                  ) : redeeming === reward.id ? (
                    'Processing...'
                  ) : affordable ? (
                    'Redeem Now'
                  ) : (
                    `Need ${reward.cost - user.points} more`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* redemption history */}
      {redemptions.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-cream mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Redemption History
          </h3>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="text-cream text-sm font-medium">{r.reward_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 text-sm font-bold">-{r.cost} pts</span>
                  <span className="text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
