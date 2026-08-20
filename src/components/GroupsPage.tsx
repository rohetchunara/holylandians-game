import { useEffect, useRef, useState } from 'react';
import { Users, Plus, Lock, ArrowLeft, Send, ImagePlus, Gift, Heart, X, Trash2, Reply, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, useAutoScroll } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { Group, GroupMember, GroupChatMessage, GroupMediaItem, GroupReward } from '../lib/types';

type View = 'list' | 'group';

export default function GroupsPage() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [view, setView] = useState<View>('list');
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupTab, setGroupTab] = useState<'chat' | 'media' | 'rewards'>('chat');

  // create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // chat state
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupChatMessage | null>(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState<GroupChatMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();
  const scrollRef = useAutoScroll(messages.length);

  // media state
  const [mediaItems, setMediaItems] = useState<GroupMediaItem[]>([]);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaPreview, setMediaPreview] = useState<GroupMediaItem | null>(null);
  const mediaFileRef = useRef<HTMLInputElement>(null);

  // rewards state
  const [rewards, setRewards] = useState<GroupReward[]>([]);
  const [showCreateReward, setShowCreateReward] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCost, setRewardCost] = useState(100);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (data) setGroups(data as Group[]);
    if (user) {
      const { data: myMemberships } = await supabase.from('group_members').select('group_id').eq('profile_id', user.id);
      if (myMemberships) {
        const ids = myMemberships.map((m) => m.group_id);
        const mine = (data as Group[]).filter((g) => ids.includes(g.id));
        setMyGroups(mine);
      }
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase.from('groups').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      password: newPassword.trim() || null,
      creator_id: user.id,
      creator_name: user.name,
    }).select('*').maybeSingle();
    if (error || !data) return;
    const g = data as Group;
    await supabase.from('group_members').insert({
      group_id: g.id,
      profile_id: user.id,
      profile_name: user.name,
    });
    setNewName('');
    setNewDesc('');
    setNewPassword('');
    setShowCreate(false);
    await loadGroups();
    openGroup(g);
  };

  const handleJoin = async (group: Group) => {
    if (!user) return;
    setJoinError('');
    if (group.password) {
      if (joinPassword.trim() !== group.password) {
        setJoinError('Incorrect group password.');
        return;
      }
    }
    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      profile_id: user.id,
      profile_name: user.name,
    });
    if (error) {
      setJoinError('Already a member or could not join.');
      return;
    }
    setJoinPassword('');
    await loadGroups();
    openGroup(group);
  };

  const openGroup = async (group: Group) => {
    setActiveGroup(group);
    setView('group');
    setGroupTab('chat');
    await loadMembers(group.id);
    await loadChat(group.id);
    await loadMedia(group.id);
    await loadRewards(group.id);
  };

  const loadMembers = async (groupId: string) => {
    const { data } = await supabase.from('group_members').select('*').eq('group_id', groupId);
    if (data) setMembers(data as GroupMember[]);
  };

  const loadChat = async (groupId: string) => {
    setChatLoading(true);
    const { data } = await supabase.from('group_chat_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(100);
    if (data) setMessages(data as GroupChatMessage[]);
    setChatLoading(false);

    const channel = supabase.channel(`group-chat-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as GroupChatMessage];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_chat_messages' }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as GroupChatMessage) : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_chat_messages' }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const loadMedia = async (groupId: string) => {
    const { data } = await supabase.from('group_media_items').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setMediaItems(data as GroupMediaItem[]);
  };

  const loadRewards = async (groupId: string) => {
    const { data } = await supabase.from('group_rewards').select('*').eq('group_id', groupId).order('cost', { ascending: true });
    if (data) setRewards(data as GroupReward[]);
  };

  // chat handlers
  const handleSendChat = async () => {
    if (!chatText.trim() || !user || !activeGroup) return;
    const content = chatText.trim();
    setChatText('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from('group_chat_messages').insert({
      group_id: activeGroup.id,
      profile_id: user.id,
      profile_name: user.name,
      content,
      reply_to: replyId,
    });
  };

  const handleChatMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeGroup) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;
    await supabase.from('group_chat_messages').insert({
      group_id: activeGroup.id,
      profile_id: user.id,
      profile_name: user.name,
      media_url: result.url,
      media_type: result.type,
      content: null,
      reply_to: replyTo?.id ?? null,
    });
    setReplyTo(null);
  };

  const handleDeleteChat = async (msg: GroupChatMessage) => {
    if (!user?.is_admin && msg.profile_id !== user?.id) return;
    await supabase.from('group_chat_messages').update({ deleted_by_admin: true, content: null, media_url: null }).eq('id', msg.id);
  };

  // media handlers
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeGroup) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;
    await supabase.from('group_media_items').insert({
      group_id: activeGroup.id,
      profile_id: user.id,
      profile_name: user.name,
      url: result.url,
      type: result.type,
      caption: mediaCaption.trim() || null,
    });
    setMediaCaption('');
    await loadMedia(activeGroup.id);
  };

  const handleMediaLike = async (item: GroupMediaItem) => {
    await supabase.from('group_media_items').update({ likes: item.likes + 1 }).eq('id', item.id);
    await loadMedia(activeGroup!.id);
  };

  const handleMediaDelete = async (item: GroupMediaItem) => {
    if (item.profile_id !== user?.id && !user?.is_admin) return;
    await supabase.from('group_media_items').delete().eq('id', item.id);
    if (mediaPreview?.id === item.id) setMediaPreview(null);
    await loadMedia(activeGroup!.id);
  };

  // reward handlers
  const handleCreateReward = async () => {
    if (!user || !activeGroup || !rewardName.trim()) return;
    await supabase.from('group_rewards').insert({
      group_id: activeGroup.id,
      name: rewardName.trim(),
      description: rewardDesc.trim(),
      cost: rewardCost,
      icon: 'gift',
    });
    setRewardName('');
    setRewardDesc('');
    setRewardCost(100);
    setShowCreateReward(false);
    await loadRewards(activeGroup.id);
  };

  const findReply = (id: string | null) => messages.find((m) => m.id === id);

  // ===== GROUP VIEW =====
  if (view === 'group' && activeGroup) {
    return (
      <div className="flex flex-col h-screen lg:h-screen">
        {/* header */}
        <div className="glow-card border-b border-blue-500/20 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setView('list'); loadGroups(); }}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-cream">{activeGroup.name}</h2>
                <p className="text-xs text-slate-500">{members.length} members</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(['chat', 'media', 'rewards'] as const).map((tab) => (
                <button key={tab} onClick={() => setGroupTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    groupTab === tab ? 'nav-gradient text-cream' : 'text-slate-400 hover:bg-slate-800'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHAT TAB */}
        {groupTab === 'chat' && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Send className="w-12 h-12 mb-3 opacity-40" />
                  <p>No messages in this group yet.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.profile_id === user?.id;
                  const replied = findReply(msg.reply_to);
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-cream shrink-0"
                        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                        {msg.profile_name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-slate-500 mb-1 px-1">{msg.profile_name}</span>
                        <div className={`group relative rounded-2xl px-4 py-2.5 ${
                          isOwn ? 'bg-blue-500/20 border border-blue-500/30 rounded-tr-sm' : 'glass rounded-tl-sm'
                        }`}>
                          {replied && !replied.deleted_by_admin && (
                            <div className="mb-2 pl-2 border-l-2 border-blue-400/50 text-xs text-slate-400">
                              <span className="font-medium text-slate-300">{replied.profile_name}: </span>
                              {replied.content || '[media]'}
                            </div>
                          )}
                          {msg.deleted_by_admin ? (
                            <span className="text-slate-500 italic text-sm">Message removed</span>
                          ) : msg.media_url ? (
                            msg.media_type === 'video' ? (
                              <video src={msg.media_url} controls className="rounded-xl max-w-full max-h-60" />
                            ) : (
                              <img src={msg.media_url} alt="" onClick={() => setPreviewMedia(msg)}
                                className="rounded-xl max-w-full max-h-60 cursor-pointer" />
                            )
                          ) : (
                            <p className="text-cream text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          {msg.content && !msg.deleted_by_admin && (
                            <button onClick={() => setReplyTo(msg)}
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full glass-strong flex items-center justify-center">
                              <Reply className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                          )}
                          {(user?.is_admin || msg.profile_id === user?.id) && !msg.deleted_by_admin && (
                            <button onClick={() => handleDeleteChat(msg)}
                              className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
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

            {replyTo && (
              <div className="px-4 sm:px-6 py-2 glass-strong border-t border-blue-500/10 flex items-center gap-2 animate-fade-in">
                <Reply className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-500">Replying to </span>
                  <span className="text-xs font-medium text-cream">{replyTo.profile_name}</span>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 rounded-lg hover:bg-slate-800">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}

            <div className="glow-card border-t border-blue-500/20 px-4 sm:px-6 py-3 pb-5 lg:pb-3">
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleChatMedia} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="p-2.5 rounded-xl glass hover:bg-slate-800 transition-colors disabled:opacity-50">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-blue-400" />
                  )}
                </button>
                <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message..." className="input-field flex-1" />
                <button onClick={handleSendChat} disabled={!chatText.trim()} className="btn-primary px-4 py-2.5">
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
          </>
        )}

        {/* MEDIA TAB */}
        {groupTab === 'media' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="glass rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
              <input type="text" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Caption (optional)..." className="input-field flex-1" />
              <input ref={mediaFileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
              <button onClick={() => mediaFileRef.current?.click()} disabled={uploading}
                className="btn-primary flex items-center gap-2 justify-center">
                {uploading ? (
                  <><div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><ImagePlus className="w-5 h-5" /> Upload</>
                )}
              </button>
            </div>
            {mediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <ImagePlus className="w-12 h-12 mb-3 opacity-40" />
                <p>No media in this group yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mediaItems.map((item) => (
                  <div key={item.id} className="group relative aspect-square rounded-2xl overflow-hidden glass cursor-pointer"
                    onClick={() => setMediaPreview(item)}>
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full glass-strong">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span className="text-xs text-cream">{item.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mediaPreview && (
              <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fade-in" onClick={() => setMediaPreview(null)}>
                <button className="absolute top-6 right-6 p-2 rounded-full glass-strong" onClick={() => setMediaPreview(null)}>
                  <X className="w-6 h-6 text-cream" />
                </button>
                <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                  {mediaPreview.type === 'video' ? (
                    <video src={mediaPreview.url} controls autoPlay className="w-full max-h-[70vh] rounded-2xl" />
                  ) : (
                    <img src={mediaPreview.url} alt="" className="w-full max-h-[70vh] object-contain rounded-2xl" />
                  )}
                  <div className="mt-4 glow-card rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-cream">{mediaPreview.profile_name}</p>
                      {mediaPreview.caption && <p className="text-xs text-slate-400">{mediaPreview.caption}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleMediaLike(mediaPreview)} className="btn-ghost flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-rose-400" /> {mediaPreview.likes}
                      </button>
                      {(mediaPreview.profile_id === user?.id || user?.is_admin) && (
                        <button onClick={() => handleMediaDelete(mediaPreview)} className="btn-ghost text-rose-400 text-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {groupTab === 'rewards' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-cream">Group Rewards</h3>
              <button onClick={() => setShowCreateReward(!showCreateReward)} className="btn-ghost flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Add Reward
              </button>
            </div>
            {showCreateReward && (
              <div className="glow-card rounded-2xl p-4 mb-4 space-y-3">
                <input type="text" value={rewardName} onChange={(e) => setRewardName(e.target.value)}
                  placeholder="Reward name..." className="input-field" />
                <input type="text" value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)}
                  placeholder="Description..." className="input-field" />
                <div className="flex gap-3 items-center">
                  <label className="text-sm text-slate-300">Cost:</label>
                  <input type="number" value={rewardCost} onChange={(e) => setRewardCost(Number(e.target.value))}
                    className="input-field w-32" />
                  <button onClick={handleCreateReward} className="btn-primary flex-1">Create</button>
                </div>
              </div>
            )}
            {rewards.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No group rewards yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rewards.map((r) => (
                  <div key={r.id} className="glow-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Gift className="w-5 h-5 text-blue-400" />
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">{r.cost} pts</span>
                    </div>
                    <h4 className="text-cream font-bold text-sm">{r.name}</h4>
                    <p className="text-xs text-slate-400">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
            <Users className="w-5 h-5 text-cream" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cream text-glow">Study Groups</h2>
            <p className="text-xs text-slate-500">Create or join a class group</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {showCreate && (
        <div className="glow-card rounded-2xl p-5 mb-6 space-y-3 animate-slide-up">
          <h3 className="text-sm font-bold text-cream">Create New Group</h3>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name (e.g. Class 11 Science)" className="input-field" />
          <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)" className="input-field" />
          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password (optional, leave open for public)" className="input-field" />
          <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary w-full">Create Group</button>
        </div>
      )}

      {joinError && (
        <div className="glass rounded-xl p-3 mb-4 text-rose-400 text-sm">{joinError}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {myGroups.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-cream mb-3">My Groups</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {myGroups.map((g) => (
                  <button key={g.id} onClick={() => openGroup(g)}
                    className="glow-card glow-card-hover rounded-2xl p-4 text-left animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
                        <Users className="w-5 h-5 text-cream" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-cream font-bold text-sm truncate">{g.name}</h4>
                        <p className="text-xs text-slate-500 truncate">{g.description || 'No description'}</p>
                      </div>
                      {g.password && <Lock className="w-4 h-4 text-amber-400" />}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 className="text-sm font-bold text-cream mb-3">All Groups</h3>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p>No groups yet. Create the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((g) => {
                const isMember = myGroups.some((mg) => mg.id === g.id);
                return (
                  <div key={g.id} className="glow-card rounded-2xl p-4 animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
                        <Users className="w-5 h-5 text-cream" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-cream font-bold text-sm truncate">{g.name}</h4>
                        <p className="text-xs text-slate-500 truncate">{g.description || 'No description'}</p>
                      </div>
                      {g.password && <Lock className="w-4 h-4 text-amber-400" />}
                    </div>
                    {isMember ? (
                      <button onClick={() => openGroup(g)} className="btn-primary w-full text-sm">Open Group</button>
                    ) : (
                      <div className="space-y-2">
                        {g.password && (
                          <input type="text" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="Enter group password" className="input-field text-sm" />
                        )}
                        <button onClick={() => handleJoin(g)} className="btn-ghost w-full text-sm">Join Group</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
