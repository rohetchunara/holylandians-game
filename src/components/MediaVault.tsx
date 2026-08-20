import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Heart, X, Trash2, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { MediaItem } from '../lib/types';

export default function MediaVault() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();

  useEffect(() => {
    loadItems();
    const channel = supabase
      .channel('media-vault')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media_items' },
        (payload) => {
          setItems((prev) => [payload.new as MediaItem, ...prev].filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'media_items' },
        (payload) => {
          setItems((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as MediaItem) : m)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'media_items' },
        (payload) => {
          setItems((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('media_items').select('*').order('created_at', { ascending: false });
    if (data) setItems(data as MediaItem[]);
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    const result = await upload(file);
    if (!result) return;

    await supabase.from('media_items').insert({
      profile_id: user.id,
      profile_name: user.name,
      url: result.url,
      type: result.type,
      caption: caption.trim() || null,
    });
    setCaption('');
  };

  const handleLike = async (item: MediaItem) => {
    await supabase.from('media_items').update({ likes: item.likes + 1 }).eq('id', item.id);
  };

  const handleDelete = async (item: MediaItem) => {
    if (item.profile_id !== user?.id && !user?.is_admin) return;
    await supabase.from('media_items').delete().eq('id', item.id);
    if (preview?.id === item.id) setPreview(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center">
          <ImagePlus className="w-5 h-5 text-cream" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-cream">Media Vault</h2>
          <p className="text-xs text-slate-500">Shared gallery of photos and clips</p>
        </div>
      </div>

      {/* upload bar */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)..."
          className="input-field flex-1"
        />
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          {uploading ? (
            <><div className="w-5 h-5 border-2 border-cream border-t-transparent rounded-full animate-spin" /> Uploading...</>
          ) : (
            <><ImagePlus className="w-5 h-5" /> Upload Media</>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <ImagePlus className="w-12 h-12 mb-3 opacity-40" />
          <p>No media yet. Upload the first photo or video!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-2xl overflow-hidden glass cursor-pointer animate-fade-in"
              onClick={() => setPreview(item)}
            >
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={item.url} alt={item.caption || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-xs text-cream font-medium truncate">{item.profile_name}</p>
                {item.caption && <p className="text-xs text-slate-300 truncate">{item.caption}</p>}
              </div>
              {item.type === 'video' && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full glass-strong flex items-center justify-center">
                  <Video className="w-4 h-4 text-cream" />
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full glass-strong">
                <Heart className="w-3 h-3 text-rose-400" />
                <span className="text-xs text-cream">{item.likes}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreview(null)}>
          <button className="absolute top-6 right-6 p-2 rounded-full glass-strong" onClick={() => setPreview(null)}>
            <X className="w-6 h-6 text-cream" />
          </button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {preview.type === 'video' ? (
              <video src={preview.url} controls autoPlay className="w-full max-h-[70vh] rounded-2xl" />
            ) : (
              <img src={preview.url} alt={preview.caption || ''} className="w-full max-h-[70vh] object-contain rounded-2xl" />
            )}
            <div className="mt-4 glass-strong rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-cream"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                >
                  {preview.profile_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-cream">{preview.profile_name}</p>
                  {preview.caption && <p className="text-xs text-slate-400">{preview.caption}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleLike(preview)} className="btn-ghost flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" /> {preview.likes}
                </button>
                {(preview.profile_id === user?.id || user?.is_admin) && (
                  <button onClick={() => handleDelete(preview)} className="btn-ghost text-rose-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
