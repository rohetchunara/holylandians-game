import { useEffect, useState } from 'react';
import { Shield, Trash2, Ban, Check, MessageCircle, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import type { ChatMessage, Profile } from '../lib/types';

export default function AdminPanel() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
    const [msgRes, profRes] = await Promise.all([
      supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);
    if (msgRes.data) setMessages(msgRes.data as ChatMessage[]);
    if (profRes.data) setProfiles(profRes.data as Profile[]);
    setLoading(false);
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    await supabase.from('chat_messages').update({ deleted_by_admin: true, content: null, media_url: null }).eq('id', msg.id);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted_by_admin: true, content: null, media_url: null } : m)));
    showToast('Message removed');
  };

  const handleBan = async (profile: Profile) => {
    const newBanned = !profile.is_banned;
    await supabase.from('profiles').update({ is_banned: newBanned }).eq('id', profile.id);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_banned: newBanned } : p)));
    showToast(newBanned ? `${profile.name} banned` : `${profile.name} unbanned`);
  };

  const handlePromote = async (profile: Profile) => {
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

  if (!user?.is_admin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-500">
        <Shield className="w-12 h-12 mb-3 opacity-40" />
        <p>Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cream">Moderation Console</h2>
          <p className="text-xs text-slate-500">Manage messages and members</p>
        </div>
      </div>

      {toast && (
        <div className="glass rounded-xl p-3 mb-4 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* recent messages */}
          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="text-lg font-bold text-cream mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-400" /> Recent Messages
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No messages.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-400">{msg.profile_name}</span>
                        <span className="text-[10px] text-slate-600">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      {msg.deleted_by_admin ? (
                        <span className="text-slate-500 italic text-sm">Removed</span>
                      ) : msg.media_url ? (
                        <span className="text-slate-400 text-sm">[media]</span>
                      ) : (
                        <p className="text-sm text-slate-300 truncate">{msg.content}</p>
                      )}
                    </div>
                    {!msg.deleted_by_admin && (
                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* members */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-lg font-bold text-cream mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Members ({profiles.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg nav-gradient flex items-center justify-center text-sm font-bold text-cream shrink-0">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-cream truncate">{profile.name}</span>
                        {profile.is_admin && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium">ADMIN</span>
                        )}
                        {profile.is_banned && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-medium">BANNED</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{profile.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleBan(profile)}
                      title={profile.is_banned ? 'Unban' : 'Ban'}
                      className={`p-2 rounded-lg transition-colors ${profile.is_banned ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePromote(profile)}
                      title={profile.is_admin ? 'Demote' : 'Promote to admin'}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile)}
                      title="Remove member"
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4" />
            <span>Admin actions are immediate. Use with care.</span>
          </div>
        </>
      )}
    </div>
  );
}
