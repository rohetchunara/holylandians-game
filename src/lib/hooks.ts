import { useEffect, useRef, useState } from 'react';
import { supabase, MEDIA_BUCKET } from '../lib/supabase';

export function useUploadMedia() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<{ url: string; type: string } | null> => {
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;

      const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      setProgress(100);
      const type = file.type.startsWith('video') ? 'video' : 'image';
      return { url: pub.publicUrl, type };
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}

export function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dep]);
  return ref;
}
