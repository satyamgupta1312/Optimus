import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import showToast from '../utils/toast';

/**
 * Image Upload Component
 * Supports drag & drop, paste, and file selection
 */
const ImageUpload = ({ onImageSelect, currentImage = '', label = 'Upload Image', accept = 'image/*' }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = useCallback(async (file) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast.error('Image size must be less than 5MB');
            return;
        }

        setUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setPreview(result);
                setUploading(false);

                // Call parent callback AFTER reader completes
                if (onImageSelect) {
                    onImageSelect(file, result);
                }

                showToast.success('Image uploaded successfully');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            showToast.error('Failed to upload image');
            setUploading(false);
        }
    }, [onImageSelect]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0];
        handleFile(file);
    }, [handleFile]);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                handleFile(file);
                break;
            }
        }
    }, [handleFile]);

    const handleRemove = useCallback(() => {
        setPreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onImageSelect) {
            onImageSelect(null, '');
        }
    }, [onImageSelect]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Listen for paste events
    React.useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    return (
        <div className="w-full">
            <label className="block text-xs font-medium text-slate-600 mb-2">
                {label}
            </label>

            {preview ? (
                // Preview mode
                <div className="relative group">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-slate-200"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                        <button
                            onClick={handleClick}
                            className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                        >
                            Change
                        </button>
                        <button
                            onClick={handleRemove}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                            <X size={16} /> Remove
                        </button>
                    </div>
                </div>
            ) : (
                // Upload mode
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    className={`
            relative w-full h-48 border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center gap-3
            cursor-pointer transition-all duration-200
            ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
                        }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
                >
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                        {uploading ? (
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Upload size={28} className="text-slate-400" />
                        )}
                    </div>

                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">
                            {uploading ? 'Uploading...' : isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            PNG, JPG, GIF up to 5MB
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                            Tip: You can also paste (Cmd+V) an image
                        </p>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
};

export default ImageUpload;
