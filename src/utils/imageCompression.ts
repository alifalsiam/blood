import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before uploading to save storage space.
 * Default settings compress it to a max width/height of 1920px and max size of 1MB.
 */
export const compressImage = async (file: File): Promise<File> => {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 1, // Compress to under 1MB
    maxWidthOrHeight: 1920, // Max width/height
    useWebWorker: true,
    fileType: 'image/webp' as any, // Optionally convert to webp for even better compression
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Create a new File object from the blob, keeping the original name but changing the extension to webp if converted
    const newFileName = file.name.replace(/\.[^/.]+$/, ".webp");
    return new File([compressedBlob], newFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    // Fallback to original file if compression fails
    return file;
  }
};
