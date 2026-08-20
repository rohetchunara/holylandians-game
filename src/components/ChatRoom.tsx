import { useEffect, useRef, useState } from 'react';
import { Send, ImagePlus, Reply, X, Trash2, Shield, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, useAutoScroll } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { ChatMessage } from '../lib/types';

const MESSAGE_PAGE = 50;

export default function ChatRoom() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<ChatMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();
  const scrollRef = useAutoScroll(messages.length);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage].slice(-MESSAGE_PAGE * 2);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? (payload.new as ChatMessage) : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(MESSAGE_PAGE);
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);

    await supabase.from('chat_messages').insert({
      profile_id: user.id,
      profile_name: user.name,
      content,
      reply_to: replyId,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;

    await supabase.from('chat_messages').insert({
      profile_id: user.id,
      profile_name: user.name,
      media_url: result.url,
      media_type: result.type,
      content: null,
      reply_to: replyTo?.id ?? null,
    });
    setReplyTo(null);
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!user?.is_admin) return;
    await supabase.from('chat_messages').update({ deleted_by_admin: true, content: null, media_url: null }).eq('id', msg.id);
  };

  const findReply = (id: string | null) => messages.find((m) => m.id === id);

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      {/* header */}
      <div className="glass-strong border-b border-blue-500/10 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
              <Send className="w-5 h-5 text-cream" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-cream">Live Chat Room</h2>
              <p className="text-xs text-slate-500">Real-time lounge conversation</p>
            </div>
          </div>
          {user?.is_admin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium">
              <Shield className="w-4 h-4" />
              Moderator
            </div>
          )}
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Send className="w-12 h-12 mb-3 opacity-40" />
            <p>No messages yet. Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.profile_id === user?.id;
            const replied = findReply(msg.reply_to);
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-cream shrink-0"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                >
                  {msg.profile_name.charAt(0).toUpperCase()}
                </div>

                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs text-slate-500 mb-1 px-1">{msg.profile_name}</span>

                  <div
                    className={`group relative rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? 'bg-blue-500/20 border border-blue-500/30 rounded-tr-sm'
                        : 'glass rounded-tl-sm'
                    }`}
                  >
                    {replied && !replied.deleted_by_admin && (
                      <div className="mb-2 pl-2 border-l-2 border-blue-400/50 text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{replied.profile_name}: </span>
                        {replied.content || (replied.media_url ? '[media]' : '')}
                      </div>
                    )}

                    {msg.deleted_by_admin ? (
                      <span className="text-slate-500 italic text-sm">Message removed by moderator</span>
                    ) : msg.media_url ? (
                      msg.media_type === 'video' ? (
                        <video
                          src={msg.media_url}
                          controls
                          className="rounded-xl max-w-full max-h-60"
                        />
                      ) : (
                        <img
                          src={msg.media_url}
                          alt="shared"
                          onClick={() => setPreviewMedia(msg)}
                          className="rounded-xl max-w-full max-h-60 cursor-pointer"
                        />
                      )
                    ) : (
                      <p className="text-cream text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                    {msg.content && !msg.deleted_by_admin && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full glass-strong flex items-center justify-center hover:scale-110"
                      >
                        <Reply className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    )}

                    {user?.is_admin && !msg.deleted_by_admin && (
                      <button
                        onClick={() => handleDelete(msg)}
                        className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center hover:scale-110"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-600 mt-0.5 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* reply preview */}
      {replyTo && (
        <div className="px-4 sm:px-6 py-2 glass-strong border-t border-blue-500/10 flex items-center gap-2 animate-fade-in">
          <Reply className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-500">Replying to </span>
            <span className="text-xs font-medium text-cream">{replyTo.profile_name}</span>
            <p className="text-xs text-slate-400 truncate">
              {replyTo.content || (replyTo.media_url ? '[media]' : '')}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* input */}
      <div className="glass-strong border-t border-blue-500/10 px-4 sm:px-6 py-3 pb-5 lg:pb-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-2.5 rounded-xl glass hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5 text-blue-400" />
            )}
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="input-field flex-1"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="btn-primary px-4 py-2.5"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* media preview modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <button className="absolute top-6 right-6 p-2 rounded-full glass-strong" onClick={() => setPreviewMedia(null)}>
            <X className="w-6 h-6 text-cream" />
          </button>
          {previewMedia.media_type === 'video' ? (
            <video src={previewMedia.media_url!} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" />
          ) : (
            <img src={previewMedia.media_url!} alt="preview" className="max-w-full max-h-[85vh] rounded-2xl" />
          )}
        </div>
      )}
    </div>
  );
}
