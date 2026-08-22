import { useState, useEffect, useRef } from 'react';
import { Image, Heart, Plus, Trash2, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import type { MediaItem } from '../lib/types';

export default function MediaVault() {
  const { user } = useUser();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload } = useUploadMedia();

  useEffect(() => {
    const loadItems = async () => {
      const { data } = await supabase.from('media_items').select('*').order('created_at', { ascending: false }).limit(60);
      if (data) setItems(data as MediaItem[]);
      setLoading(false);
    };
    loadItems();

    const channel = supabase
      .channel('media_items')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_items' },
        (payload) => setItems((prev) => [payload.new as MediaItem, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'media_items' },
        (payload) => setItems((prev) => prev.map((i) => i.id === (payload.new as MediaItem).id ? payload.new as MediaItem : i)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'media_items' },
        (payload) => setItems((prev) => prev.filter((i) => i.id !== payload.old.id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    setUploading(true); setError('');
    const result = await upload(file);
    if (!result) { setError('Upload failed.'); setUploading(false); return; }
    const isImage = file.type.startsWith('image/');
    const { error: insertError } = await supabase
      .from('media_items')
      .insert({ profile_id: user.id, profile_name: user.name, url: result.url, type: isImage ? 'image' : 'video' });
    if (insertError) setError('Failed to save to vault.');
    setUploading(false);
  };

  const handleLike = async (item: MediaItem) => {
    await supabase.from('media_items').update({ likes: item.likes + 1 }).eq('id', item.id);
  };

  const handleDelete = async (item: MediaItem) => {
    if (!user?.is_admin && user?.id !== item.profile_id) return;
    await supabase.from('media_items').delete().eq('id', item.id);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-cream">Media Vault</h2>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
          {uploading ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
          Upload
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No media yet. Upload photos or videos to the vault!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="glass-strong rounded-2xl overflow-hidden animate-fade-in group">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.caption ?? ''} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-slate-900 flex items-center justify-center relative">
                  <video src={item.url} className="w-full h-full object-cover" />
                  <Film className="absolute w-8 h-8 text-cream/70" />
                </div>
              )}
              <div className="p-3">
                <p className="text-xs font-medium text-cream truncate">{item.profile_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-500">{formatTime(item.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleLike(item)} className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors">
                      <Heart className="w-3.5 h-3.5" /> <span className="text-[10px]">{item.likes}</span>
                    </button>
                    {(user?.is_admin || item.profile_id === user?.id) && (
                      <button onClick={() => handleDelete(item)} className="text-slate-500 hover:text-rose-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
