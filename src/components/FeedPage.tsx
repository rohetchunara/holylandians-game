import { useState, useEffect, useRef } from 'react';
import { Globe, Heart, ImagePlus, Send, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { FeedPost } from '../lib/types';

export default function FeedPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const { upload, uploading } = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) setPosts(data as FeedPost[]);
      setLoading(false);
    };
    loadPosts();

    const channel = supabase
      .channel('feed_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        (payload) => setPosts((prev) => [payload.new as FeedPost, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
        (payload) => setPosts((prev) => prev.map((p) => p.id === (payload.new as FeedPost).id ? payload.new as FeedPost : p)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feed_posts' },
        (payload) => setPosts((prev) => prev.filter((p) => p.id !== payload.old.id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePost = async () => {
    if (!user || !content.trim() || posting) return;
    setPosting(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('feed_posts')
      .insert({ profile_id: user.id, profile_name: user.name, content: content.trim() })
      .select('*')
      .maybeSingle();
    setPosting(false);
    if (insertError || !data) { setError('Failed to post.'); return; }
    setContent('');
  };

  const handleMediaPost = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) { setError('Upload failed.'); return; }
    const isImage = file.type.startsWith('image/');
    const { error: insertError } = await supabase
      .from('feed_posts')
      .insert({ profile_id: user.id, profile_name: user.name, content: '', media_url: result.url, media_type: isImage ? 'image' : 'video' });
    if (insertError) setError('Failed to post media.');
  };

  const handleLike = async (post: FeedPost) => {
    if (!user) return;
    await supabase.from('feed_posts').update({ likes: post.likes + 1 }).eq('id', post.id);
  };

  const handleDelete = async (post: FeedPost) => {
    if (!user?.is_admin && user?.id !== post.profile_id) return;
    await supabase.from('feed_posts').delete().eq('id', post.id);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-cream">Community Feed</h2>
      </div>

      <div className="glass-strong rounded-2xl p-4 space-y-3">
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with the community..." rows={2} className="input-field resize-none" />
        <div className="flex items-center justify-between">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaPost} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost px-4 py-2 flex items-center gap-2 text-sm">
            {uploading ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            Media
          </button>
          <button onClick={handlePost} disabled={posting || !content.trim()} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
            <Send className="w-4 h-4" /> Post
          </button>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No posts yet. Be the first to share!</p>
        </div>
      ) : (
        posts.map((post) => {
          const isOwn = post.profile_id === user?.id;
          const theme = getTheme('blue');
          return (
            <div key={post.id} className="glass-strong rounded-2xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-cream" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                    {post.profile_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cream">{post.profile_name}</p>
                    <p className="text-xs text-slate-500">{formatTime(post.created_at)}</p>
                  </div>
                </div>
                {(user?.is_admin || isOwn) && (
                  <button onClick={() => handleDelete(post)} className="text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {post.content && <p className="text-sm text-slate-200 whitespace-pre-wrap break-words mb-3">{post.content}</p>}
              {post.media_url && post.media_type === 'image' && (
                <img src={post.media_url} alt="" className="rounded-xl max-w-full max-h-80 object-cover mb-3" />
              )}
              {post.media_url && post.media_type === 'video' && (
                <video src={post.media_url} controls className="rounded-xl max-w-full max-h-80 mb-3" />
              )}
              <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-400 transition-colors">
                <Heart className="w-4 h-4" /> {post.likes}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
