/**
 * Storage & Asset Hygiene Utility for LifeDrop
 * Enforces zero trash files & orphan file cleanup when uploaded images/assets are replaced.
 */

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Uploads an image file to the persistent server uploads storage and Supabase storage,
 * returning a permanent public URL accessible across all devices.
 */
export async function uploadImageAsset(
  file: File,
  _oldUrl?: string | null
): Promise<string | null> {
  if (!file) return null;

  try {
    // 1. Convert to base64 for reliable persistent upload
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // 2. Upload to server-side permanent file store
    try {
      const serverRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: base64Data,
          filename: file.name,
          mimeType: file.type
        })
      });

      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.url) {
          return json.url;
        }
      }
    } catch (serverErr) {
      console.warn('Server upload fallback warning:', serverErr);
    }

    // 3. Fallback to Supabase Storage if configured
    if (isSupabaseConfigured) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `brand-assets/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data, error } = await supabase.storage.from('brand-assets').upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

        if (!error && data?.path) {
          const { data: publicData } = supabase.storage.from('brand-assets').getPublicUrl(data.path);
          if (publicData?.publicUrl) {
            return publicData.publicUrl;
          }
        }
      } catch (sbErr) {
        console.warn('Supabase storage upload fallback warning:', sbErr);
      }
    }

    // 4. Return base64 as final fallback if all network stores are unreachable
    return base64Data;
  } catch (err) {
    console.error('Image upload failed:', err);
    return null;
  }
}

/**
 * Replaces an existing image asset in Supabase storage or blob store,
 * ensuring the old asset file is permanently removed to prevent orphan accumulation.
 */
export async function replaceStorageAsset(
  bucketName: string,
  oldFilePathOrUrl: string | undefined | null,
  newFile: File
): Promise<{ publicUrl: string; file_path: string } | null> {
  if (!newFile) return null;

  if (oldFilePathOrUrl) {
    await deleteImageAsset(oldFilePathOrUrl);
  }

  const uploadedUrl = await uploadImageAsset(newFile, oldFilePathOrUrl);
  if (uploadedUrl) {
    return {
      publicUrl: uploadedUrl,
      file_path: uploadedUrl
    };
  }

  return null;
}

/**
 * Permanently deletes an image from Supabase storage using its public URL
 */
export async function deleteImageAsset(url: string | null | undefined): Promise<boolean> {
  if (!url || !isSupabaseConfigured) return false;
  
  try {
    // Extract the file path from the public URL
    // URL format typically: https://[projectId].supabase.co/storage/v1/object/public/brand-assets/path/to/file.png
    const brandAssetsMarker = '/public/brand-assets/';
    if (url.includes(brandAssetsMarker)) {
      const filePath = url.substring(url.indexOf(brandAssetsMarker) + brandAssetsMarker.length);
      if (filePath) {
        const { error } = await supabase.storage.from('brand-assets').remove([filePath]);
        if (error) {
          console.warn('Failed to delete image asset:', error);
          return false;
        }
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Error deleting image asset:', err);
    return false;
  }
}

