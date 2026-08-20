import { useEffect, useState } from 'react';
import { Shield, Trash2, Ban, Check, MessageCircle, Users, X, BarChart3, Trophy, Star, Image, Globe, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import type { ChatMessage, Profile, FeedPost, MarketplaceItem, GameScore } from '../lib/types';

interface Props {
  onClose: () => void;
}

export default function AdminModal({ onClose }: Props) {
  const { user } = useUser();
  const [tab, setTab] = useState<'members' | 'messages' | 'feed' | 'marketplace' | 'analytics'>('members');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadData = async () => {
    const [profRes, msgRes, feedRes, marketRes, scoreRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('marketplace_items').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('game_scores').select('*').order('score', { ascending: false }).limit(50),
    ]);
    if (profRes.data) setProfiles(profRes.data as Profile[]);
    if (msgRes.data) setMessages(msgRes.data as ChatMessage[]);
    if (feedRes.data) setFeedPosts(feedRes.data as FeedPost[]);
    if (marketRes.data) setMarketItems(marketRes.data as MarketplaceItem[]);
    if (scoreRes.data) setScores(scoreRes.data as GameScore[]);
    setLoading(false);
  };

  const handleBan = async (profile: Profile) => {
    const newBanned = !profile.is_banned;
    await supabase.from('profiles').update({ is_banned: newBanned }).eq('id', profile.id);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_banned: newBanned } : p)));
    showToast(newBanned ? `${profile.name} banned` : `${profile.name} unbanned`);
  };

  const handlePromote = async (profile: Profile) => {
    if (profile.id === user?.id) {
      showToast("You can't change your own role");
      return;
    }
    const newAdmin = !profile.is_admin;
    await supabase.from('profiles').update({ is_admin: newAdmin }).eq('id', profile.id);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_admin: newAdmin } : p)));
    showToast(newAdmin ? `${profile.name} promoted to admin` : `${profile.name} demoted`);
  };

  const handleDeleteProfile = async (profile: Profile) => {
    if (profile.id === user?.id) {
      showToast("You can't remove yourself");
      return;
    }
    await supabase.from('profiles').delete().eq('id', profile.id);
    setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    showToast(`${profile.name} removed`);
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    await supabase.from('chat_messages').update({ deleted_by_admin: true, content: null, media_url: null }).eq('id', msg.id);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted_by_admin: true, content: null, media_url: null } : m)));
    showToast('Message removed');
  };

  const handleDeleteFeedPost = async (post: FeedPost) => {
    await supabase.from('feed_posts').delete().eq('id', post.id);
    setFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
    showToast('Post removed');
  };

  const handleDeleteMarketItem = async (item: MarketplaceItem) => {
    await supabase.from('marketplace_items').delete().eq('id', item.id);
    setMarketItems((prev) => prev.filter((i) => i.id !== item.id));
    showToast('Listing removed');
  };

  const tabs = [
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { id: 'feed' as const, label: 'Feed', icon: Globe },
    { id: 'marketplace' as const, label: 'Market', icon: ShoppingBag },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="glow-card rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-pop" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center glow-blue">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cream text-glow">Admin Control Panel</h2>
              <p className="text-xs text-slate-500">Full moderation access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-cream transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-blue-500/10 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id ? 'nav-gradient text-cream' : 'text-slate-400 hover:bg-slate-800/60'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="mx-5 mt-3 glass rounded-xl p-3 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" /> {toast}
          </div>
        )}

        {/* content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'members' ? (
            <div className="space-y-2">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-cream truncate">{p.name}</span>
                        {p.is_admin && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium">ADMIN</span>}
                        {p.is_banned && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-medium">BANNED</span>}
                      </div>
                      <span className="text-xs text-slate-500">{p.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleBan(p)} title={p.is_banned ? 'Unban' : 'Ban'}
                      className={`p-2 rounded-lg transition-colors ${p.is_banned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}>
                      <Ban className="w-4 h-4" />
                    </button>
                    <button onClick={() => handlePromote(p)} title={p.is_admin ? 'Demote' : 'Promote'}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <Shield className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteProfile(p)} title="Remove member"
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'messages' ? (
            <div className="space-y-2">
              {messages.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No messages.</p> : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-400">{msg.profile_name}</span>
                        <span className="text-[10px] text-slate-600">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      {msg.deleted_by_admin ? <span className="text-slate-500 italic text-sm">Removed</span> :
                        msg.media_url ? <span className="text-slate-400 text-sm">[media]</span> :
                        <p className="text-sm text-slate-300 truncate">{msg.content}</p>}
                    </div>
                    {!msg.deleted_by_admin && (
                      <button onClick={() => handleDeleteMessage(msg)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : tab === 'feed' ? (
            <div className="space-y-2">
              {feedPosts.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No feed posts.</p> : (
                feedPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-400">{post.profile_name}</span>
                        <span className="text-[10px] text-slate-600">{new Date(post.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 truncate">{post.content}</p>
                    </div>
                    <button onClick={() => handleDeleteFeedPost(post)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : tab === 'marketplace' ? (
            <div className="space-y-2">
              {marketItems.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No listings.</p> : (
                marketItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-cream truncate">{item.title}</span>
                        <span className="text-xs text-amber-400">{item.price} pts</span>
                      </div>
                      <span className="text-xs text-slate-500">By {item.seller_name} - {item.status}</span>
                    </div>
                    <button onClick={() => handleDeleteMarketItem(item)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glow-card rounded-2xl p-4 text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-cream">{profiles.length}</p>
                  <p className="text-xs text-slate-500">Total Members</p>
                </div>
                <div className="glow-card rounded-2xl p-4 text-center">
                  <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-cream">{messages.filter((m) => !m.deleted_by_admin).length}</p>
                  <p className="text-xs text-slate-500">Messages</p>
                </div>
                <div className="glow-card rounded-2xl p-4 text-center">
                  <Globe className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-cream">{feedPosts.length}</p>
                  <p className="text-xs text-slate-500">Feed Posts</p>
                </div>
                <div className="glow-card rounded-2xl p-4 text-center">
                  <ShoppingBag className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-cream">{marketItems.length}</p>
                  <p className="text-xs text-slate-500">Listings</p>
                </div>
              </div>

              <div className="glow-card rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cream mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Top Performers
                </h3>
                <div className="space-y-2">
                  {profiles.slice().sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm text-cream">{p.name}</span>
                      </div>
                      <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3 h-3" /> {p.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glow-card rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cream mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4 text-blue-400" /> Game Score Leaders
                </h3>
                <div className="space-y-2">
                  {scores.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-cream">{s.profile_name}</span>
                        <span className="text-xs text-slate-500 capitalize">{s.game.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
