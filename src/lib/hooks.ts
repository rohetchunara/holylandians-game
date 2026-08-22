import { useState, useCallback, useRef } from 'react';
import { supabase, MEDIA_BUCKET } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
}

export function useUploadMedia() {
  const [uploading, setUploading] = useState(false);
  const pathCounter = useRef(0);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${Date.now()}-${pathCounter.current++}.${ext}`;
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) return null;
      const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return { url: urlData.publicUrl, path };
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
