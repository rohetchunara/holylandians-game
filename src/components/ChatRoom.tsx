import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ImagePlus, Reply, Trash2, X, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { ChatMessage } from '../lib/types';

const PAGE_SIZE = 50;

export default function ChatRoom() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { upload, uploading } = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = getTheme(user?.color_theme ?? 'blue');

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE);
      if (data) setMessages(data as ChatMessage[]);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };
    loadMessages();

    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => prev.map((m) => m.id === (payload.new as ChatMessage).id ? payload.new as ChatMessage : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [scrollToBottom]);

  const handleSend = async () => {
    if (!user || (!content.trim() && !uploading) || sending) return;
    setSending(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        profile_id: user.id,
        profile_name: user.name,
        content: content.trim() || null,
        reply_to: replyTo?.id ?? null,
      })
      .select('*')
      .maybeSingle();
    setSending(false);
    if (insertError || !data) { setError('Failed to send message.'); return; }
    setContent('');
    setReplyTo(null);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) { setError('Upload failed.'); return; }
    const isImage = file.type.startsWith('image/');
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        profile_id: user.id,
        profile_name: user.name,
        media_url: result.url,
        media_type: isImage ? 'image' : 'video',
      });
    if (insertError) setError('Failed to send media.');
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!user?.is_admin) return;
    await supabase.from('chat_messages').update({ deleted_by_admin: true, content: null, media_url: null }).eq('id', msg.id);
  };

  const findReplyTo = (id: string | null) => messages.find((m) => m.id === id);

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      <div className="px-4 py-3 border-b border-blue-500/10 glass">
        <h2 className="text-lg font-bold text-cream flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" /> Main Chat Room
        </h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.profile_id === user?.id;
            const repliedTo = findReplyTo(msg.reply_to);
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 ${isOwn ? 'nav-gradient text-cream' : 'glass text-slate-200'}`}>
                  {!isOwn && (
                    <p className="text-xs font-semibold mb-1" style={{ color: theme.from === '#1e3a5f' ? '#5b9bd5' : theme.to }}>
                      {msg.profile_name}
                    </p>
                  )}
                  {repliedTo && (
                    <div className={`text-xs mb-1 px-2 py-1 rounded-lg ${isOwn ? 'bg-cream/10' : 'bg-slate-800/60'} border-l-2 border-blue-400/50`}>
                      <p className="opacity-70 font-medium">{repliedTo.profile_name}</p>
                      <p className="opacity-60 truncate">{repliedTo.content || '[media]'}</p>
                    </div>
                  )}
                  {msg.deleted_by_admin ? (
                    <p className="text-sm italic opacity-50">[Message deleted by admin]</p>
                  ) : (
                    <>
                      {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                      {msg.media_url && msg.media_type === 'image' && (
                        <img src={msg.media_url} alt="" className="mt-2 rounded-xl max-w-full max-h-60 object-cover" />
                      )}
                      {msg.media_url && msg.media_type === 'video' && (
                        <video src={msg.media_url} controls className="mt-2 rounded-xl max-w-full max-h-60" />
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-[10px] ${isOwn ? 'text-cream/60' : 'text-slate-500'}`}>{formatTime(msg.created_at)}</p>
                    {!msg.deleted_by_admin && (
                      <button onClick={() => setReplyTo(msg)} className={`text-[10px] ${isOwn ? 'text-cream/60' : 'text-slate-500'} hover:text-blue-400 transition-colors`}>
                        <Reply className="w-3 h-3" />
                      </button>
                    )}
                    {!msg.deleted_by_admin && user?.is_admin && !isOwn && (
                      <button onClick={() => handleDelete(msg)} className={`text-[10px] ${isOwn ? 'text-cream/60' : 'text-slate-500'} hover:text-rose-400 transition-colors`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 py-1 text-xs text-rose-400">{error}</p>}

      {replyTo && (
        <div className="px-4 py-2 glass border-t border-blue-500/10 flex items-center gap-2">
          <Reply className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-slate-400 flex-1 truncate">Replying to {replyTo.profile_name}: {replyTo.content || '[media]'}</p>
          <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-cream"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="px-4 py-3 glass-strong border-t border-blue-500/20 safe-bottom">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2.5 rounded-xl glass text-slate-400 hover:text-cream transition-colors">
            {uploading ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-5 h-5" />}
          </button>
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..." className="input-field flex-1" />
          <button onClick={handleSend} disabled={sending || (!content.trim() && !uploading)} className="btn-primary px-4 py-2.5">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
