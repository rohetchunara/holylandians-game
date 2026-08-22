import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Tag, Trash2, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia, formatTime } from '../lib/hooks';
import type { MarketplaceItem } from '../lib/types';

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Furniture', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export default function MarketplacePage() {
  const { user } = useUser();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('Good');
  const [category, setCategory] = useState('Books');
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const { upload, uploading } = useUploadMedia();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadItems = async () => {
      const { data } = await supabase.from('marketplace_items').select('*').eq('status', 'available').order('created_at', { ascending: false });
      if (data) setItems(data as MarketplaceItem[]);
      setLoading(false);
    };
    loadItems();

    const channel = supabase
      .channel('marketplace_items')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_items' },
        (payload) => {
          const item = payload.new as MarketplaceItem;
          if (item.status === 'available') setItems((prev) => [item, ...prev]);
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'marketplace_items' },
        (payload) => setItems((prev) => prev.filter((i) => i.id !== payload.old.id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const result = await upload(file);
    if (result) setImageUrl(result.url);
  };

  const handleCreate = async () => {
    if (!user || !title.trim() || !price.trim() || posting) return;
    setPosting(true); setError('');
    const { error: insertError } = await supabase
      .from('marketplace_items')
      .insert({
        seller_id: user.id, seller_name: user.name,
        title: title.trim(), description: desc.trim() || null,
        price: parseFloat(price), condition, category,
        image_url: imageUrl || null, status: 'available',
      });
    setPosting(false);
    if (insertError) { setError('Failed to list item.'); return; }
    setTitle(''); setDesc(''); setPrice(''); setImageUrl('');
    setCondition('Good'); setCategory('Books');
    setShowCreate(false);
  };

  const handleDelete = async (item: MarketplaceItem) => {
    if (!user?.is_admin && user?.id !== item.seller_id) return;
    await supabase.from('marketplace_items').delete().eq('id', item.id);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-cream">Marketplace</h2>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> List Item
        </button>
      </div>

      {showCreate && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item title" className="input-field" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="input-field resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price ($)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field">
                {CONDITIONS.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
            {uploading ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            {imageUrl ? 'Image uploaded ✓' : 'Add image (optional)'}
          </button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={posting || !title.trim() || !price.trim()} className="btn-primary flex-1">
              {posting ? 'Listing...' : 'List for Sale'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No items for sale yet. List something!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.id} className="glass-strong rounded-2xl overflow-hidden animate-fade-in">
              {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-cream">{item.title}</h3>
                  {(user?.is_admin || item.seller_id === user?.id) && (
                    <button onClick={() => handleDelete(item)} className="text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">{item.condition} · {item.category}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-lg font-bold text-amber-400 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />{item.price}
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{item.seller_name}</p>
                    <p className="text-[10px] text-slate-600">{formatTime(item.created_at)}</p>
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
