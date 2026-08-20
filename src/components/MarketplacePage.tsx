import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Plus, Tag, X, Trash2, BookOpen, DollarSign, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { useUploadMedia } from '../lib/hooks';
import { getTheme } from '../lib/colors';
import type { MarketplaceItem } from '../lib/types';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Worn'];
const CATEGORIES = ['Books', 'Notes', 'Electronics', 'Supplies', 'Other'];

export default function MarketplacePage() {
  const { user } = useUser();
  const theme = getTheme(user?.color_theme ?? 'blue');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSell, setShowSell] = useState(false);
  const [filter, setFilter] = useState('All');
  const [preview, setPreview] = useState<MarketplaceItem | null>(null);

  // sell form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState(50);
  const [condition, setCondition] = useState('Good');
  const [category, setCategory] = useState('Books');
  const [imageUrl, setImageUrl] = useState('');
  const [selling, setSelling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUploadMedia();

  useEffect(() => {
    loadItems();
    const channel = supabase.channel('marketplace')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_items' }, (payload) => {
        setItems((prev) => [payload.new as MarketplaceItem, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'marketplace_items' }, (payload) => {
        setItems((prev) => prev.map((i) => (i.id === payload.new.id ? (payload.new as MarketplaceItem) : i)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'marketplace_items' }, (payload) => {
        setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('marketplace_items').select('*').order('created_at', { ascending: false });
    if (data) setItems(data as MarketplaceItem[]);
    setLoading(false);
  };

  const handleSell = async () => {
    if (!user || !title.trim()) return;
    setSelling(true);
    await supabase.from('marketplace_items').insert({
      seller_id: user.id,
      seller_name: user.name,
      title: title.trim(),
      description: desc.trim() || null,
      price,
      condition,
      category,
      image_url: imageUrl.trim() || null,
    });
    setTitle('');
    setDesc('');
    setPrice(50);
    setCondition('Good');
    setCategory('Books');
    setImageUrl('');
    setShowSell(false);
    setSelling(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const result = await upload(file);
    if (result) setImageUrl(result.url);
  };

  const handleRequest = async (item: MarketplaceItem) => {
    await supabase.from('marketplace_items').update({ status: 'requested' }).eq('id', item.id);
    setPreview(null);
  };

  const handleDelete = async (item: MarketplaceItem) => {
    if (item.seller_id !== user?.id && !user?.is_admin) return;
    await supabase.from('marketplace_items').delete().eq('id', item.id);
    if (preview?.id === item.id) setPreview(null);
  };

  const filtered = filter === 'All' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
            <ShoppingBag className="w-5 h-5 text-cream" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cream text-glow">Marketplace</h2>
            <p className="text-xs text-slate-500">Buy and sell books with other students</p>
          </div>
        </div>
        <button onClick={() => setShowSell(!showSell)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Sell
        </button>
      </div>

      {/* sell form */}
      {showSell && (
        <div className="glow-card rounded-2xl p-5 mb-6 space-y-3 animate-slide-up">
          <h3 className="text-sm font-bold text-cream">List an Item</h3>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Item title (e.g. Class 12 Physics Textbook)" className="input-field" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (condition, edition, notes...)" rows={2} className="input-field resize-none" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price (pts)</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
                className="input-field" min={0} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field">
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-ghost flex items-center gap-2 text-sm">
              {uploading ? 'Uploading...' : <><Plus className="w-4 h-4" /> Photo</>}
            </button>
            {imageUrl && <img src={imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />}
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste image URL" className="input-field flex-1" />
          </div>
          <button onClick={handleSell} disabled={!title.trim() || selling} className="btn-primary w-full">
            {selling ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
      )}

      {/* filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['All', ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat ? 'nav-gradient text-cream' : 'glass text-slate-400 hover:text-cream'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <ShoppingBag className="w-12 h-12 mb-3 opacity-40" />
          <p>No items for sale. Be the first to list!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="glow-card glow-card-hover rounded-2xl overflow-hidden animate-fade-in">
              {item.image_url ? (
                <img src={item.image_url} alt="" onClick={() => setPreview(item)}
                  className="w-full h-40 object-cover cursor-pointer" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center bg-slate-800/40">
                  <BookOpen className="w-12 h-12 text-slate-600" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-cream font-bold text-sm">{item.title}</h3>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
                    <DollarSign className="w-3 h-3" /> {item.price}
                  </span>
                </div>
                {item.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{item.description}</p>}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">{item.condition}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 text-xs">{item.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">By {item.seller_name}</span>
                  {item.status === 'available' ? (
                    <button onClick={() => handleRequest(item)} className="btn-primary text-xs px-3 py-1.5">
                      Request
                    </button>
                  ) : item.status === 'requested' ? (
                    <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Requested
                    </span>
                  ) : (
                    <span className="text-xs text-rose-400 font-medium">Sold</span>
                  )}
                </div>
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
          <div className="max-w-lg w-full glow-card rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {preview.image_url && (
              <img src={preview.image_url} alt="" className="w-full max-h-64 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-cream">{preview.title}</h2>
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold">
                  <DollarSign className="w-4 h-4" /> {preview.price}
                </span>
              </div>
              {preview.description && <p className="text-sm text-slate-300 mb-4">{preview.description}</p>}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">{preview.condition}</span>
                <span className="px-2 py-1 rounded bg-slate-700/40 text-slate-400 text-xs">{preview.category}</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-cream"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                  {preview.seller_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-cream">{preview.seller_name}</p>
                  <p className="text-xs text-slate-500">Seller</p>
                </div>
              </div>
              <div className="flex gap-2">
                {preview.status === 'available' && (
                  <button onClick={() => handleRequest(preview)} className="btn-primary flex-1">Request to Buy</button>
                )}
                {(preview.seller_id === user?.id || user?.is_admin) && (
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
