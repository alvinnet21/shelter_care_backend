import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const ImageUploader = ({ images, setImages, maxImages = 5 }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (images.length + acceptedFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  }, [images, maxImages, setImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic']
    },
    maxFiles: maxImages - images.length,
    multiple: true
  });

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-[#e51636] bg-[#e51636]/5'
            : 'border-[#e5e7eb] hover:border-[#e51636]/50'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={images.length >= maxImages} data-testid="image-upload-input" />
        <Upload className="h-12 w-12 text-[#9ca3af] mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-[#111827]">Drop images here...</p>
        ) : (
          <div>
            <p className="text-[#111827] font-medium mb-2">
              Drag & drop images here, or click to select
            </p>
            <p className="text-sm text-[#4b5563]">
              {images.length}/{maxImages} images • PNG, JPG, WEBP up to 10MB
            </p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-[#e5e7eb]"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`remove-image-${index}`}
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2 bg-[#e51636] text-white text-xs px-2 py-1 rounded">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
