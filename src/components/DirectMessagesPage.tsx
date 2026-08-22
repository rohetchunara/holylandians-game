import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Mail, MailOpen, ImagePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { Profile, DirectMessage } from '../lib/types';

export default function DirectMessagesPage() {
  const { user } = useUser();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [activeContact, setActiveContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { upload, uploading } = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = getTheme(user?.color_theme ?? 'blue');

  useEffect(() => {
    const loadContacts = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').neq('id', user.id).order('name');
      if (data) setContacts(data as Profile[]);
      setLoading(false);
    };
    loadContacts();
  }, [user]);

  useEffect(() => {
    if (!user || !activeContact) return;
    const loadMessages = async () => {
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase.from('direct_messages').select('*').eq('sender_id', user.id).eq('recipient_id', activeContact.id).order('created_at', { ascending: true }),
        supabase.from('direct_messages').select('*').eq('sender_id', activeContact.id).eq('recipient_id', user.id).order('created_at', { ascending: true }),
      ]);
      const all = [...(sent ?? []), ...(received ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(all as DirectMessage[]);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);

      await supabase.from('direct_messages').update({ read_at: new Date().toISOString() })
        .eq('sender_id', activeContact.id).eq('recipient_id', user.id).is('read_at', null);
    };
    loadMessages();

    const channel = supabase
      .channel(`dm_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.sender_id === activeContact.id && msg.recipient_id === user.id) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
            supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).is('read_at', null);
          }
          if (msg.sender_id === user.id && msg.recipient_id === activeContact.id) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeContact]);

  const handleSend = async () => {
    if (!user || !activeContact || !content.trim() || sending) return;
    setSending(true); setError('');
    const { error: insertError } = await supabase
      .from('direct_messages')
      .insert({ sender_id: user.id, recipient_id: activeContact.id, content: content.trim() });
    setSending(false);
    if (insertError) { setError('Failed to send.'); return; }
    setContent('');
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeContact) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) { setError('Upload failed.'); return; }
    const isImage = file.type.startsWith('image/');
    await supabase.from('direct_messages').insert({
      sender_id: user.id, recipient_id: activeContact.id,
      media_url: result.url, media_type: isImage ? 'image' : 'video',
    });
  };

  if (activeContact) {
    return (
      <div className="flex flex-col h-screen lg:h-screen">
        <div className="px-4 py-3 border-b border-blue-500/10 glass flex items-center gap-3">
          <button onClick={() => { setActiveContact(null); setMessages([]); }} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-cream text-sm" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
            {activeContact.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-cream">{activeContact.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 ${isOwn ? 'nav-gradient text-cream' : 'glass text-slate-200'}`}>
                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    {msg.media_url && msg.media_type === 'image' && <img src={msg.media_url} alt="" className="mt-2 rounded-xl max-w-full max-h-60 object-cover" />}
                    {msg.media_url && msg.media_type === 'video' && <video src={msg.media_url} controls className="mt-2 rounded-xl max-w-full max-h-60" />}
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-cream/60' : 'text-slate-500'}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 py-1 text-xs text-rose-400">{error}</p>}

        <div className="px-4 py-3 glass-strong border-t border-blue-500/20 safe-bottom">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2.5 rounded-xl glass text-slate-400 hover:text-cream transition-colors">
              {uploading ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..." className="input-field flex-1" />
            <button onClick={handleSend} disabled={sending || !content.trim()} className="btn-primary px-4 py-2.5">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Send className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-cream">Direct Messages</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No other members yet.</p>
        </div>
      ) : (
        contacts.map((contact) => (
          <button key={contact.id} onClick={() => setActiveContact(contact)}
            className="w-full glass-strong rounded-2xl p-4 flex items-center gap-3 hover:bg-slate-800/60 transition-colors animate-fade-in text-left">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-cream" style={{ background: `linear-gradient(135deg, ${getTheme(contact.color_theme).from}, ${getTheme(contact.color_theme).to})` }}>
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-cream">{contact.name}</p>
              <p className="text-xs text-slate-500">Tap to start chatting</p>
            </div>
            <MailOpen className="w-5 h-5 text-slate-500" />
          </button>
        ))
      )}
    </div>
  );
}
