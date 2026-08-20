import { useEffect, useRef, useState } from 'react';
import { Globe, Heart, Send, ImagePlus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { FeedPost } from '../lib/types';

export default function FeedPage() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [preview, setPreview] = useState<FeedPost | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, (payload) => {
        setPosts((prev) => [payload.new as FeedPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feed_posts' }, (payload) => {
        setPosts((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as FeedPost) : p)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feed_posts' }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setPosts(data as FeedPost[]);
    setLoading(false);
  };

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    await supabase.from('feed_posts').insert({
      profile_id: user.id,
      profile_name: user.name,
      content: text.trim(),
    });
    setText('');
    setPosting(false);
  };

  const handleMediaPost = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;
    await supabase.from('feed_posts').insert({
      profile_id: user.id,
      profile_name: user.name,
      content: text.trim() || 'Shared a photo',
      media_url: result.url,
      media_type: result.type,
    });
    setText('');
  };

  const handleLike = async (post: FeedPost) => {
    await supabase.from('feed_posts').update({ likes: post.likes + 1 }).eq('id', post.id);
  };

  const handleDelete = async (post: FeedPost) => {
    if (post.profile_id !== user?.id && !user?.is_admin) return;
    await supabase.from('feed_posts').delete().eq('id', post.id);
    if (preview?.id === post.id) setPreview(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
          <Globe className="w-5 h-5 text-cream" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cream text-glow">Community Feed</h2>
          <p className="text-xs text-slate-500">Public wall — everyone sees your posts</p>
        </div>
      </div>

      {/* composer */}
      <div className="glow-card rounded-2xl p-4 mb-6">
        <div className="flex gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-cream shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something with the community..."
            rows={2}
            className="input-field resize-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaPost} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-ghost flex items-center gap-2 text-sm">
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
            ) : (
              <><ImagePlus className="w-4 h-4" /> Photo</>
            )}
          </button>
          <button onClick={handlePost} disabled={!text.trim() || posting}
            className="btn-primary flex items-center gap-2 text-sm">
            <Send className="w-4 h-4" /> Post
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Globe className="w-12 h-12 mb-3 opacity-40" />
          <p>No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="glow-card glow-card-hover rounded-2xl p-4 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-cream"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                  {post.profile_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cream">{post.profile_name}</p>
                  <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>
                {(post.profile_id === user?.id || user?.is_admin) && (
                  <button onClick={() => handleDelete(post)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-cream text-sm mb-3 whitespace-pre-wrap break-words">{post.content}</p>

              {post.media_url && (
                post.media_type === 'video' ? (
                  <video src={post.media_url} controls className="w-full rounded-xl max-h-96 mb-3" />
                ) : (
                  <img src={post.media_url} alt="" onClick={() => setPreview(post)}
                    className="w-full rounded-xl max-h-96 object-cover mb-3 cursor-pointer" />
                )
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-blue-500/10">
                <button onClick={() => handleLike(post)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors text-sm">
                  <Heart className="w-4 h-4" /> {post.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreview(null)}>
          <button className="absolute top-6 right-6 p-2 rounded-full glass-strong" onClick={() => setPreview(null)}>
            <X className="w-6 h-6 text-cream" />
          </button>
          <img src={preview.media_url!} alt="" className="max-w-full max-h-[85vh] rounded-2xl" />
        </div>
      )}
    </div>
  );
}
