import { useEffect, useRef, useState } from 'react';
import { Search, Send, ArrowLeft, ImagePlus, X, MessageCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, useAutoScroll } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { Profile, DirectMessage } from '../lib/types';

export default function DirectMessagesPage() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [activeChat, setActiveChat] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<DirectMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();
  const scrollRef = useAutoScroll(messages.length);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!activeChat || !user) return;
    loadMessages(activeChat.id);
    const channel = supabase.channel(`dm-${user.id}-${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as DirectMessage;
        if (
          (msg.sender_id === user.id && msg.recipient_id === activeChat.id) ||
          (msg.sender_id === activeChat.id && msg.recipient_id === user.id)
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, user]);

  const loadConversations = async () => {
    if (!user) return;
    // get all users I've messaged or who messaged me
    const { data: sent } = await supabase.from('direct_messages').select('recipient_id').eq('sender_id', user.id);
    const { data: received } = await supabase.from('direct_messages').select('sender_id').eq('recipient_id', user.id);
    const partnerIds = new Set<string>();
    (sent ?? []).forEach((d) => partnerIds.add((d as { recipient_id: string }).recipient_id));
    (received ?? []).forEach((d) => partnerIds.add((d as { sender_id: string }).sender_id));
    if (partnerIds.size > 0) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', Array.from(partnerIds));
      if (profs) setConversations(profs as Profile[]);
    }
    setLoading(false);
  };

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) return;
    const { data } = await supabase.from('profiles').select('*').ilike('name', `%${searchQuery.trim()}%`).neq('id', user.id).limit(10);
    if (data) setSearchResults(data as Profile[]);
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;
    const { data } = await supabase.from('direct_messages').select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data as DirectMessage[]);
  };

  const openChat = (profile: Profile) => {
    setActiveChat(profile);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!text.trim() || !user || !activeChat) return;
    const content = text.trim();
    setText('');
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      recipient_id: activeChat.id,
      content,
    });
    // add to conversations if not there
    if (!conversations.some((c) => c.id === activeChat.id)) {
      setConversations((prev) => [activeChat, ...prev]);
    }
  };

  const handleMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      recipient_id: activeChat.id,
      media_url: result.url,
      media_type: result.type,
    });
    if (!conversations.some((c) => c.id === activeChat.id)) {
      setConversations((prev) => [activeChat, ...prev]);
    }
  };

  // ===== CHAT VIEW =====
  if (activeChat) {
    return (
      <div className="flex flex-col h-screen lg:h-screen">
        <div className="glow-card border-b border-blue-500/20 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveChat(null)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {activeChat.avatar_url ? (
              <img src={activeChat.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-cream"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                {activeChat.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-cream">{activeChat.name}</h2>
              <p className="text-xs text-slate-500">Direct message</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageCircle className="w-12 h-12 mb-3 opacity-40" />
              <p>Say hello to {activeChat.name}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[75%]`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      isOwn ? 'bg-blue-500/20 border border-blue-500/30 rounded-tr-sm' : 'glass rounded-tl-sm'
                    }`}>
                      {msg.media_url ? (
                        msg.media_type === 'video' ? (
                          <video src={msg.media_url} controls className="rounded-xl max-w-full max-h-60" />
                        ) : (
                          <img src={msg.media_url} alt="" onClick={() => setPreviewMedia(msg)}
                            className="rounded-xl max-w-full max-h-60 cursor-pointer" />
                        )
                      ) : (
                        <p className="text-cream text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 mt-0.5 block px-1 text-center">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="glow-card border-t border-blue-500/20 px-4 sm:px-6 py-3 pb-5 lg:pb-3">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMedia} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="p-2.5 rounded-xl glass hover:bg-slate-800 transition-colors disabled:opacity-50">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5 text-blue-400" />
              )}
            </button>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..." className="input-field flex-1" />
            <button onClick={handleSend} disabled={!text.trim()} className="btn-primary px-4 py-2.5">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {previewMedia && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewMedia(null)}>
            <button className="absolute top-6 right-6 p-2 rounded-full glass-strong" onClick={() => setPreviewMedia(null)}>
              <X className="w-6 h-6 text-cream" />
            </button>
            {previewMedia.media_type === 'video' ? (
              <video src={previewMedia.media_url!} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" />
            ) : (
              <img src={previewMedia.media_url!} alt="" className="max-w-full max-h-[85vh] rounded-2xl" />
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
          <MessageCircle className="w-5 h-5 text-cream" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cream text-glow">Direct Messages</h2>
          <p className="text-xs text-slate-500">Search for friends and chat privately</p>
        </div>
      </div>

      {/* search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a friend by name..."
          className="input-field pl-12" autoFocus />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glow-card rounded-2xl p-2 z-20 animate-fade-in">
            {searchResults.map((p) => (
              <button key={p.id} onClick={() => openChat(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-left">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-cream"
                    style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-cream">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.points} pts</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 && searchResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <UserIcon className="w-12 h-12 mb-3 opacity-40" />
          <p>No conversations yet. Search for a friend above to start chatting!</p>
        </div>
      ) : (
        <>
          {conversations.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-cream mb-3">Recent Conversations</h3>
              <div className="space-y-2">
                {conversations.map((p) => (
                  <button key={p.id} onClick={() => openChat(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glow-card glow-card-hover text-left animate-fade-in">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-cream"
                        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-cream">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.points} pts</p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
