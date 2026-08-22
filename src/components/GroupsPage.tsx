import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Lock, ArrowLeft, Send, ImagePlus, Reply, X, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { Group, GroupChatMessage } from '../lib/types';

export default function GroupsPage() {
  const { user } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPass, setNewPass] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinGroupId, setJoinGroupId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;
      const [{ data: groupsData }, { data: memberData }] = await Promise.all([
        supabase.from('groups').select('*').order('created_at', { ascending: false }),
        supabase.from('group_members').select('group_id').eq('profile_id', user.id),
      ]);
      if (groupsData) setGroups(groupsData as Group[]);
      if (memberData) setMyMemberships(new Set(memberData.map((m) => m.group_id)));
      setLoading(false);
    };
    loadGroups();

    const channel = supabase
      .channel('groups_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'groups' },
        (payload) => setGroups((prev) => [payload.new as Group, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setError('');
    const { data, error: insertError } = await supabase
      .from('groups')
      .insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        password: newPass.trim() || null,
        creator_id: user.id,
        creator_name: user.name,
      })
      .select('*')
      .maybeSingle();
    if (insertError || !data) { setError('Failed to create group.'); return; }
    const group = data as Group;
    await supabase.from('group_members').insert({ group_id: group.id, profile_id: user.id, profile_name: user.name });
    setMyMemberships((prev) => new Set(prev).add(group.id));
    setNewName(''); setNewDesc(''); setNewPass('');
    setShowCreate(false);
    setActiveGroup(group);
  };

  const handleJoin = async (group: Group) => {
    if (!user) return;
    if (group.password) {
      setJoinGroupId(group.id);
      return;
    }
    await joinGroup(group.id);
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    setError('');
    const group = groups.find((g) => g.id === groupId);
    if (group?.password && joinPass !== group.password) {
      setError('Incorrect group password.');
      return;
    }
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, profile_id: user.id, profile_name: user.name });
    if (memberError) { setError('Failed to join group.'); return; }
    setMyMemberships((prev) => new Set(prev).add(groupId));
    setJoinGroupId(null); setJoinPass('');
    setActiveGroup(group ?? null);
  };

  if (activeGroup) {
    return <GroupChat group={activeGroup} onBack={() => setActiveGroup(null)} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-cream">Groups</h2>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {showCreate && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Group name" className="input-field" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="input-field resize-none" />
          <input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Password (optional)" className="input-field" />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleCreate} className="btn-primary flex-1">Create Group</button>
          </div>
        </div>
      )}

      {joinGroupId && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
          <div className="flex items-center gap-2 text-amber-400">
            <Lock className="w-5 h-5" /><p className="text-sm font-medium">This group requires a password</p>
          </div>
          <input type="password" value={joinPass} onChange={(e) => { setJoinPass(e.target.value); setError(''); }} placeholder="Enter password" className="input-field" autoFocus />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setJoinGroupId(null); setJoinPass(''); setError(''); }} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => joinGroup(joinGroupId)} className="btn-primary flex-1">Join</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No groups yet. Create one to get started!</p>
        </div>
      ) : (
        groups.map((group) => {
          const isMember = myMemberships.has(group.id);
          return (
            <div key={group.id} className="glass-strong rounded-2xl p-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-cream">{group.name}</h3>
                    {group.password && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  {group.description && <p className="text-xs text-slate-400 mt-1">{group.description}</p>}
                  <p className="text-xs text-slate-500 mt-1">Created by {group.creator_name}</p>
                </div>
                {isMember ? (
                  <button onClick={() => setActiveGroup(group)} className="btn-primary px-3 py-1.5 text-sm">Open</button>
                ) : (
                  <button onClick={() => handleJoin(group)} className="btn-ghost px-3 py-1.5 text-sm">Join</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function GroupChat({ group, onBack }: { group: Group; onBack: () => void }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<GroupChatMessage | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { upload, uploading } = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = getTheme(user?.color_theme ?? 'blue');

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('group_chat_messages')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data as GroupChatMessage[]);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    };
    loadMessages();

    const channel = supabase
      .channel(`group_chat_${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as GroupChatMessage]);
          setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [group.id]);

  const handleSend = async () => {
    if (!user || (!content.trim() && !uploading)) return;
    setError('');
    const { error: insertError } = await supabase
      .from('group_chat_messages')
      .insert({
        group_id: group.id,
        profile_id: user.id,
        profile_name: user.name,
        content: content.trim() || null,
        reply_to: replyTo?.id ?? null,
      });
    if (insertError) { setError('Failed to send.'); return; }
    setContent(''); setReplyTo(null);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) { setError('Upload failed.'); return; }
    const isImage = file.type.startsWith('image/');
    await supabase.from('group_chat_messages').insert({
      group_id: group.id,
      profile_id: user.id,
      profile_name: user.name,
      media_url: result.url,
      media_type: isImage ? 'image' : 'video',
    });
  };

  const findReplyTo = (id: string | null) => messages.find((m) => m.id === id);

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      <div className="px-4 py-3 border-b border-blue-500/10 glass flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-cream">{group.name}</h2>
          {group.description && <p className="text-xs text-slate-500">{group.description}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                  {!isOwn && <p className="text-xs font-semibold mb-1" style={{ color: theme.to }}>{msg.profile_name}</p>}
                  {repliedTo && (
                    <div className={`text-xs mb-1 px-2 py-1 rounded-lg ${isOwn ? 'bg-cream/10' : 'bg-slate-800/60'} border-l-2 border-blue-400/50`}>
                      <p className="opacity-70 font-medium">{repliedTo.profile_name}</p>
                      <p className="opacity-60 truncate">{repliedTo.content || '[media]'}</p>
                    </div>
                  )}
                  {msg.deleted_by_admin ? (
                    <p className="text-sm italic opacity-50">[Deleted by admin]</p>
                  ) : (
                    <>
                      {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                      {msg.media_url && msg.media_type === 'image' && <img src={msg.media_url} alt="" className="mt-2 rounded-xl max-w-full max-h-60 object-cover" />}
                      {msg.media_url && msg.media_type === 'video' && <video src={msg.media_url} controls className="mt-2 rounded-xl max-w-full max-h-60" />}
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-[10px] ${isOwn ? 'text-cream/60' : 'text-slate-500'}`}>{formatTime(msg.created_at)}</p>
                    {!msg.deleted_by_admin && (
                      <button onClick={() => setReplyTo(msg)} className={`text-[10px] ${isOwn ? 'text-cream/60' : 'text-slate-500'} hover:text-blue-400 transition-colors`}>
                        <Reply className="w-3 h-3" />
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
          <button onClick={handleSend} disabled={!content.trim() && !uploading} className="btn-primary px-4 py-2.5">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
