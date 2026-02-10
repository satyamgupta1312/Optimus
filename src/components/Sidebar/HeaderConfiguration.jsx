import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Plus, Trash2, Loader2, Upload, X, CheckCircle } from 'lucide-react';
import { MultimediaService } from '../../services/MultimediaService';
import { GoogleSheetService } from '../../services/GoogleSheetService';
import ColorPickerInput from '../ColorPickerInput';
import toast from 'react-hot-toast';

const HeaderConfiguration = ({ headerWidgets, onUpdate }) => {
    const [expandedSection, setExpandedSection] = useState('primary'); // 'primary', 'secondary', or null
    const [uploadingMedia, setUploadingMedia] = useState(false); // Track Drive upload status

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const renderWidgetConfig = (key, label) => {
        const widget = headerWidgets[key];
        if (!widget) return null;

        const isEnabled = widget.enabled !== false;
        const isExpanded = expandedSection === key;

        const handleToggle = (e) => {
            e.stopPropagation();
            onUpdate(key, { enabled: !isEnabled });
        };

        const handleFieldChange = (field, value) => {
            onUpdate(key, { [field]: value });
        };

        return (
            <div className="border-b border-slate-200">
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSection(key)}
                >
                    <div className="flex items-center gap-2">
                        <Settings size={18} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">{label}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Toggle Switch in Header (Hidden for Primary) */}
                        {key !== 'primaryMasthead' && (
                            <div
                                onClick={handleToggle}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                                />
                            </div>
                        )}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>

                {/* Content */}
                {isExpanded && isEnabled && (
                    <div className="p-4 space-y-4 bg-slate-50 border-t border-slate-100">

                        {/* =========================================
                            PRIMARY MASTHEAD CONFIG
                           ========================================= */}
                        {key === 'primaryMasthead' && (
                            <>
                                <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded mb-4">
                                    The <strong>Background</strong> setting here applies to the entire App Header.
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">Slug Name</label>
                                        <input
                                            type="text"
                                            value={widget.slug_name || ''}
                                            onChange={(e) => handleFieldChange('slug_name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Master Key (Link)
                                        </label>
                                        <input
                                            type="text"
                                            value={widget.master_key || ''}
                                            onChange={(e) => handleFieldChange('master_key', e.target.value)}
                                            placeholder="Enter master key slug"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={widget.end_time ? widget.end_time.replace(' ', 'T') : ''}
                                        onChange={(e) => handleFieldChange('end_time', e.target.value.replace('T', ' '))}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Background Multimedia Editor */}
                                <div className="border-t border-slate-200 pt-4">
                                    <button
                                        onClick={() => {
                                            const currentExpanded = widget.showMultimediaEditor;
                                            handleFieldChange('showMultimediaEditor', !currentExpanded);
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all"
                                    >
                                        <span className="flex items-center gap-2 font-semibold text-slate-800">
                                            🎨 Configure Background Multimedia
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {widget.showMultimediaEditor ? '▲' : '▼'}
                                        </span>
                                    </button>

                                    {widget.showMultimediaEditor && (
                                        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                                            {/* Auto-generated Multimedia Slug */}
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <label className="text-xs font-medium text-blue-700 mb-1 block">
                                                    Multimedia Slug (Auto-generated)
                                                </label>
                                                <code className="text-sm font-mono text-blue-900">
                                                    {widget.slug_name ? `${widget.slug_name}_bg` : 'Enter Primary Masthead slug first'}
                                                </code>
                                            </div>

                                            {/* Multimedia Type */}
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                                                <select
                                                    value={widget.multimedia?.type || 'image'}
                                                    onChange={(e) => {
                                                        const multimedia = widget.multimedia || {};
                                                        handleFieldChange('multimedia', { ...multimedia, type: e.target.value });
                                                    }}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="image">📷 Image</option>
                                                    <option value="video">🎥 Video</option>
                                                    <option value="lottie">✨ Lottie</option>
                                                </select>
                                            </div>

                                            {/* Aspect Ratio */}
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Aspect Ratio</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={widget.multimedia?.aspect_ratio || '1'}
                                                    onChange={(e) => {
                                                        const multimedia = widget.multimedia || {};
                                                        handleFieldChange('multimedia', { ...multimedia, aspect_ratio: e.target.value });
                                                    }}
                                                    placeholder="1"
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Color Configuration Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Transition Color */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Transition Color</label>
                                                    <ColorPickerInput
                                                        color={widget.multimedia?.transition_color || '#FFFFFF'}
                                                        onChange={(color) => {
                                                            const multimedia = widget.multimedia || {};
                                                            handleFieldChange('multimedia', { ...multimedia, transition_color: color });
                                                        }}
                                                        placeholder="#FFFFFF"
                                                    />
                                                </div>

                                                {/* Accent Color */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Accent Color</label>
                                                    <ColorPickerInput
                                                        color={widget.multimedia?.accent_color || '#0000FF'}
                                                        onChange={(color) => {
                                                            const multimedia = widget.multimedia || {};
                                                            handleFieldChange('multimedia', { ...multimedia, accent_color: color });
                                                        }}
                                                        placeholder="#0000FF"
                                                    />
                                                </div>

                                                {/* Text Color */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Text Color</label>
                                                    <ColorPickerInput
                                                        color={widget.multimedia?.text_color || '#000000'}
                                                        onChange={(color) => {
                                                            const multimedia = widget.multimedia || {};
                                                            handleFieldChange('multimedia', { ...multimedia, text_color: color });
                                                        }}
                                                        placeholder="#000000"
                                                    />
                                                </div>

                                                {/* Icon BG Color */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Icon BG Color</label>
                                                    <ColorPickerInput
                                                        color={widget.multimedia?.icon_bg_color || '#F0F0F0'}
                                                        onChange={(color) => {
                                                            const multimedia = widget.multimedia || {};
                                                            handleFieldChange('multimedia', { ...multimedia, icon_bg_color: color });
                                                        }}
                                                        placeholder="#F0F0F0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Is Multimedia Dark */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="is_multimedia_dark"
                                                    checked={widget.multimedia?.is_dark || false}
                                                    onChange={(e) => {
                                                        const multimedia = widget.multimedia || {};
                                                        handleFieldChange('multimedia', { ...multimedia, is_dark: e.target.checked });
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor="is_multimedia_dark" className="text-xs font-medium text-slate-600">
                                                    Is Multimedia Dark Theme
                                                </label>
                                            </div>

                                            {/* File Upload - Only for Image/Video */}
                                            {(!widget.multimedia?.type || widget.multimedia?.type === 'image' || widget.multimedia?.type === 'video') && (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-2 block">
                                                        {widget.multimedia?.type === 'video' ? '🎥 Video File' : '📷 Image File'}
                                                    </label>

                                                    {/* Drag & Drop Zone */}
                                                    <div
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                                                        }}
                                                        onDragLeave={(e) => {
                                                            e.preventDefault();
                                                            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

                                                            const file = e.dataTransfer.files[0];
                                                            if (file) {
                                                                // Validate file type
                                                                const isImage = widget.multimedia?.type === 'image';
                                                                const validTypes = isImage
                                                                    ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
                                                                    : ['video/mp4', 'video/webm', 'video/quicktime'];

                                                                if (!validTypes.includes(file.type)) {
                                                                    alert(`❌ Invalid file type. Please upload a ${isImage ? 'image' : 'video'} file.`);
                                                                    return;
                                                                }

                                                                const multimedia = widget.multimedia || {};
                                                                handleFieldChange('multimedia', { ...multimedia, file: file });
                                                            }
                                                        }}
                                                        onClick={() => document.getElementById('file-upload-input').click()}
                                                        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50 transition-all"
                                                    >
                                                        {widget.multimedia?.file ? (
                                                            <div className="space-y-2">
                                                                <div className="text-4xl">✅</div>
                                                                <p className="text-sm font-semibold text-green-600">
                                                                    {widget.multimedia.file.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {(widget.multimedia.file.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const multimedia = widget.multimedia || {};
                                                                        handleFieldChange('multimedia', { ...multimedia, file: null });
                                                                    }}
                                                                    className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <div className="text-4xl">
                                                                    {widget.multimedia?.type === 'image' ? '🖼️' : '🎬'}
                                                                </div>
                                                                <p className="text-sm font-semibold text-slate-700">
                                                                    Drag & drop or click to upload
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {widget.multimedia?.type === 'image'
                                                                        ? 'JPG, PNG, WEBP, GIF'
                                                                        : 'MP4, WEBM, MOV'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Hidden file input with Drive upload */}
                                                    <input
                                                        id="file-upload-input"
                                                        type="file"
                                                        accept={widget.multimedia?.type === 'video' ? 'video/*' : 'image/*'}
                                                        disabled={uploadingMedia}
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                // Determine media type from MIME
                                                                const isVideo = file.type.startsWith('video/');
                                                                const mediaType = isVideo ? 'video' : 'image';

                                                                // Get current multimedia state
                                                                const currentMultimedia = widget.multimedia || {};

                                                                // Show local preview immediately with type
                                                                handleFieldChange('multimedia', {
                                                                    ...currentMultimedia,
                                                                    file: file,
                                                                    type: mediaType
                                                                });

                                                                // Upload to Google Drive
                                                                setUploadingMedia(true);
                                                                toast.loading('Uploading to Drive...', { id: 'drive-upload' });

                                                                try {
                                                                    const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                                    console.log('[HeaderConfig] Drive upload result:', result);

                                                                    if (result.success) {
                                                                        // Store ALL Drive info in multimedia - use fresh reference from widget
                                                                        const freshMultimedia = widget.multimedia || {};
                                                                        handleFieldChange('multimedia', {
                                                                            ...freshMultimedia,
                                                                            file: file,
                                                                            type: mediaType,  // Important: set type
                                                                            driveUrl: result.viewUrl,
                                                                            driveFileId: result.fileId,
                                                                            driveFileName: result.fileName
                                                                        });
                                                                        console.log('[HeaderConfig] Set multimedia with driveFileId:', result.fileId);
                                                                        toast.success('Uploaded to Drive!', { id: 'drive-upload' });
                                                                    } else {
                                                                        toast.error('Upload failed: ' + result.error, { id: 'drive-upload' });
                                                                    }
                                                                } catch (err) {
                                                                    console.error('[HeaderConfig] Upload error:', err);
                                                                    toast.error('Upload failed', { id: 'drive-upload' });
                                                                } finally {
                                                                    setUploadingMedia(false);
                                                                }
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />

                                                    {/* Upload indicator */}
                                                    {uploadingMedia && (
                                                        <div className="flex items-center gap-2 text-blue-600 text-xs mt-2">
                                                            <Loader2 size={14} className="animate-spin" />
                                                            Uploading to Drive...
                                                        </div>
                                                    )}

                                                    {/* Drive URL indicator */}
                                                    {widget.multimedia?.driveUrl && !uploadingMedia && (
                                                        <div className="flex items-center gap-2 text-green-600 text-xs mt-2">
                                                            ✅ Saved to Drive
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Info for Lottie */}
                                            {widget.multimedia?.type === 'lottie' && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <p className="text-xs text-blue-700">
                                                        ℹ️ For Lottie animations, only color configuration is needed. No file upload required.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Info: Multimedia created on approval */}
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <p className="text-xs text-green-700">
                                                    ✅ <strong>Auto-create on Approval:</strong> The background multimedia will be created automatically when you approve this widget in the Queue.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* =========================================
                            SECONDARY MASTHEAD CONFIG
                           ========================================= */}
                        {key === 'secondaryMasthead' && (
                            <>
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">Slug Name</label>
                                        <input
                                            type="text"
                                            value={widget.slug_name || ''}
                                            onChange={(e) => handleFieldChange('slug_name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                                            Carousels Media-Number
                                            <span className="text-[10px] text-slate-400 ml-1">(4=4x1, 6=3x2, 8=4x2, 12=6x2)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={widget.aspectRatio || ''}
                                            onChange={(e) => handleFieldChange('aspectRatio', e.target.value)}
                                            placeholder="Enter number (e.g., 4, 6, 8, 12)"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Master Key */}
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                                        Master Key
                                        <span className="text-[10px] text-slate-400 ml-1">(e.g., gl_hp_global_category_pane_wi)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={widget.master_key || ''}
                                        onChange={(e) => handleFieldChange('master_key', e.target.value)}
                                        placeholder="Enter master key"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            value={widget.start_time ? widget.start_time.replace(' ', 'T') : ''}
                                            onChange={(e) => handleFieldChange('start_time', e.target.value.replace('T', ' '))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">End Time</label>
                                        <input
                                            type="datetime-local"
                                            value={widget.end_time ? widget.end_time.replace(' ', 'T') : ''}
                                            onChange={(e) => handleFieldChange('end_time', e.target.value.replace('T', ' '))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>


                                {/* Multimedia Upload Section */}
                                <div className="border-t border-slate-200 pt-3">
                                    <label className="text-xs font-medium text-slate-600 mb-2 block">
                                        Background Media (Image/Video)
                                    </label>

                                    {/* File upload button with drag-drop */}
                                    <div className="flex gap-2 mb-3">
                                        <label
                                            htmlFor="secondary-media-upload"
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.add('border-2', 'border-blue-400', 'bg-blue-100');
                                            }}
                                            onDragLeave={(e) => {
                                                e.currentTarget.classList.remove('border-2', 'border-blue-400', 'bg-blue-100');
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('border-2', 'border-blue-400', 'bg-blue-100');
                                                const file = e.dataTransfer.files[0];
                                                if (file) {
                                                    const fileInput = document.getElementById('secondary-media-upload');
                                                    const dataTransfer = new DataTransfer();
                                                    dataTransfer.items.add(file);
                                                    fileInput.files = dataTransfer.files;
                                                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border-2 border-dashed border-transparent ${uploadingMedia
                                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                        >
                                            <Upload size={14} />
                                            {uploadingMedia ? 'Uploading...' : 'Upload or Drag & Drop'}
                                        </label>

                                        {widget.multimedia?.driveFileId && (
                                            <button
                                                onClick={() => handleFieldChange('multimedia', {})}
                                                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                                            >
                                                <X size={14} />
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Hidden file input with Drive upload */}
                                    <input
                                        id="secondary-media-upload"
                                        type="file"
                                        accept="image/*,video/*"
                                        disabled={uploadingMedia}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Determine media type from MIME
                                                const isVideo = file.type.startsWith('video/');
                                                const mediaType = isVideo ? 'video' : 'image';

                                                // Calculate aspect ratio from file
                                                let aspectRatio = widget.aspectRatio || '4'; // default

                                                // For images, we can read dimensions
                                                if (!isVideo) {
                                                    try {
                                                        const img = new Image();
                                                        const imgUrl = URL.createObjectURL(file);
                                                        await new Promise((resolve) => {
                                                            img.onload = () => {
                                                                const ratio = img.width / img.height;
                                                                // Map to closest predefined aspect ratio
                                                                if (ratio >= 3.5) aspectRatio = '4';
                                                                else if (ratio >= 2.5) aspectRatio = '3';
                                                                else if (ratio >= 1.5) aspectRatio = '2';
                                                                else aspectRatio = '1';
                                                                URL.revokeObjectURL(imgUrl);
                                                                resolve();
                                                            };
                                                            img.src = imgUrl;
                                                        });
                                                    } catch (err) {
                                                        console.warn('Could not calculate aspect ratio:', err);
                                                    }
                                                }

                                                // Get current multimedia state
                                                const currentMultimedia = widget.multimedia || {};

                                                // Show local preview immediately with type and aspect ratio
                                                handleFieldChange('multimedia', {
                                                    ...currentMultimedia,
                                                    file: file,
                                                    type: mediaType,
                                                    aspect_ratio: aspectRatio
                                                });

                                                // Also update widget aspect ratio
                                                handleFieldChange('aspectRatio', aspectRatio);

                                                // Upload to Google Drive
                                                setUploadingMedia(true);
                                                toast.loading('Uploading to Drive...', { id: 'drive-upload-secondary' });

                                                try {
                                                    const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                    console.log('[HeaderConfig] Secondary Drive upload result:', result);

                                                    if (result.success) {
                                                        // Store ALL Drive info in multimedia
                                                        const freshMultimedia = widget.multimedia || {};
                                                        handleFieldChange('multimedia', {
                                                            ...freshMultimedia,
                                                            file: file,
                                                            type: mediaType,
                                                            aspect_ratio: aspectRatio,
                                                            driveUrl: result.viewUrl,
                                                            driveFileId: result.fileId,
                                                            driveFileName: result.fileName
                                                        });
                                                        console.log('[HeaderConfig] Secondary multimedia set with driveFileId:', result.fileId);
                                                        toast.success('Uploaded to Drive!', { id: 'drive-upload-secondary' });
                                                    } else {
                                                        toast.error('Upload failed: ' + result.error, { id: 'drive-upload-secondary' });
                                                    }
                                                } catch (err) {
                                                    console.error('[HeaderConfig] Secondary upload error:', err);
                                                    toast.error('Upload failed', { id: 'drive-upload-secondary' });
                                                } finally {
                                                    setUploadingMedia(false);
                                                }
                                            }
                                            // Reset input
                                            e.target.value = '';
                                        }}
                                        className="hidden"
                                    />

                                    {/* Upload indicator */}
                                    {uploadingMedia && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                                            <div className="animate-spin">⏳</div>
                                            <p className="text-xs text-blue-700">Uploading to Google Drive...</p>
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {widget.multimedia?.driveFileId && (
                                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                                                <CheckCircle size={14} className="text-green-500" />
                                                <span className="font-medium">
                                                    {widget.multimedia.type === 'video' ? 'Video' : 'Image'} uploaded
                                                </span>
                                                <span className="text-slate-400">• Aspect {widget.multimedia.aspect_ratio || widget.aspectRatio}</span>
                                            </div>
                                            {widget.multimedia.driveFileName && (
                                                <p className="text-[10px] text-slate-500 font-mono truncate">
                                                    {widget.multimedia.driveFileName}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Info note */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-3">
                                        <p className="text-[10px] text-blue-700">
                                            💡 <strong>Auto aspect ratio:</strong> Calculated from image dimensions (4=wide, 1=square)
                                        </p>
                                    </div>
                                </div>

                                {/* Carousel Items Editor - FULL AUTOMATION */}
                                <div className="mt-4 border-t border-slate-200 pt-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-xs text-slate-900">Carousel Items</h3>
                                        <button
                                            onClick={() => {
                                                const newItems = [...(widget.items || [])];
                                                newItems.push({
                                                    id: crypto.randomUUID(),
                                                    text: '',
                                                    textHi: '',
                                                    image: '',
                                                    redirectLink: '',
                                                    categoryPage: { heading: '' },
                                                    subCategories: []
                                                });
                                                handleFieldChange('items', newItems);
                                            }}
                                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                        >
                                            <Plus size={12} /> Add Carousel Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(widget.items || []).map((item, idx) => (
                                            <div key={item.id || idx} className="p-3 bg-slate-50 border-2 border-slate-300 rounded-lg relative">
                                                <button
                                                    onClick={() => {
                                                        const newItems = (widget.items || []).filter((_, i) => i !== idx);
                                                        handleFieldChange('items', newItems);
                                                    }}
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors z-10"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <div className="text-xs font-bold text-slate-700 mb-3">Carousel #{idx + 1}</div>

                                                {/* Carousel Item Basic Info */}
                                                <div className="space-y-2 mb-3">


                                                    <div className="flex gap-1">
                                                        <input
                                                            value={item.image || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...widget.items];
                                                                newItems[idx] = { ...newItems[idx], image: e.target.value };
                                                                handleFieldChange('items', newItems);
                                                            }}
                                                            placeholder="Image URL (or upload)"
                                                            className="flex-1 px-2 py-1.5 text-[10px] border border-slate-300 rounded font-mono"
                                                        />
                                                        <label
                                                            htmlFor={`carousel-img-${idx}`}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.classList.add('bg-green-100');
                                                            }}
                                                            onDragLeave={(e) => {
                                                                e.currentTarget.classList.remove('bg-green-100');
                                                            }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.classList.remove('bg-green-100');
                                                                const file = e.dataTransfer.files[0];
                                                                if (file) {
                                                                    const fileInput = document.getElementById(`carousel-img-${idx}`);
                                                                    const dataTransfer = new DataTransfer();
                                                                    dataTransfer.items.add(file);
                                                                    fileInput.files = dataTransfer.files;
                                                                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                                                                }
                                                            }}
                                                            className="flex items-center justify-center px-2 py-1 bg-green-500 text-white rounded text-[9px] cursor-pointer hover:bg-green-600 transition-colors"
                                                            title="Upload image"
                                                        >
                                                            <Upload size={12} />
                                                        </label>
                                                        <input
                                                            id={`carousel-img-${idx}`}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    try {
                                                                        toast.loading('Uploading...', { id: `carousel-${idx}` });
                                                                        const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                                        if (result.success) {
                                                                            const newItems = [...widget.items];
                                                                            newItems[idx] = { ...newItems[idx], image: result.viewUrl, driveFileId: result.fileId };
                                                                            handleFieldChange('items', newItems);
                                                                            toast.success('Uploaded!', { id: `carousel-${idx}` });
                                                                        } else {
                                                                            toast.error('Upload failed', { id: `carousel-${idx}` });
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Upload error', { id: `carousel-${idx}` });
                                                                    }
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                            className="hidden"
                                                        />
                                                    </div>

                                                    <input
                                                        value={item.categoryPage?.heading || ''}
                                                        onChange={(e) => {
                                                            const newItems = [...widget.items];
                                                            newItems[idx] = {
                                                                ...newItems[idx],
                                                                text: e.target.value,
                                                                categoryPage: { heading: e.target.value }
                                                            };
                                                            handleFieldChange('items', newItems);
                                                        }}
                                                        placeholder="Category Page Heading (e.g., Rice Products)"
                                                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded"
                                                    />
                                                </div>

                                                {/* Sub-Categories Section */}
                                                <div className="border-t border-slate-300 pt-3 mt-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="text-[10px] font-semibold text-slate-600">Sub-Categories</div>
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...widget.items];
                                                                const subCategories = [...(newItems[idx].subCategories || [])];
                                                                subCategories.push({
                                                                    id: crypto.randomUUID(),
                                                                    name: '',
                                                                    nameHi: '',
                                                                    image: '',
                                                                    products: {
                                                                        global: '',
                                                                        JH: '',
                                                                        CG: '',
                                                                        WB: ''
                                                                    }
                                                                });
                                                                newItems[idx] = { ...newItems[idx], subCategories };
                                                                handleFieldChange('items', newItems);
                                                            }}
                                                            className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                                                        >
                                                            <Plus size={10} /> Add Sub-Category
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {(item.subCategories || []).map((subCat, subIdx) => (
                                                            <div key={subCat.id || subIdx} className="p-2 bg-white border border-slate-200 rounded relative">
                                                                <button
                                                                    onClick={() => {
                                                                        const newItems = [...widget.items];
                                                                        const subCategories = (newItems[idx].subCategories || []).filter((_, i) => i !== subIdx);
                                                                        newItems[idx] = { ...newItems[idx], subCategories };
                                                                        handleFieldChange('items', newItems);
                                                                    }}
                                                                    className="absolute top-1 right-1 text-slate-300 hover:text-red-400"
                                                                >
                                                                    <X size={12} />
                                                                </button>

                                                                <div className="text-[9px] font-bold text-slate-500 mb-1">Sub-Cat #{subIdx + 1}</div>

                                                                <input
                                                                    value={subCat.name || ''}
                                                                    onChange={(e) => {
                                                                        const newItems = [...widget.items];
                                                                        const subCategories = [...(newItems[idx].subCategories || [])];
                                                                        subCategories[subIdx] = { ...subCategories[subIdx], name: e.target.value };
                                                                        newItems[idx] = { ...newItems[idx], subCategories };
                                                                        handleFieldChange('items', newItems);
                                                                    }}
                                                                    placeholder="Name (e.g., Basmati Rice)"
                                                                    className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded mb-1.5"
                                                                />


                                                                <div className="flex gap-1 mb-1.5">
                                                                    <input
                                                                        value={subCat.image || ''}
                                                                        onChange={(e) => {
                                                                            const newItems = [...widget.items];
                                                                            const subCategories = [...(newItems[idx].subCategories || [])];
                                                                            subCategories[subIdx] = { ...subCategories[subIdx], image: e.target.value };
                                                                            newItems[idx] = { ...newItems[idx], subCategories };
                                                                            handleFieldChange('items', newItems);
                                                                        }}
                                                                        placeholder="Image URL"
                                                                        className="flex-1 px-2 py-1 text-[9px] border border-slate-200 rounded font-mono"
                                                                    />
                                                                    <label
                                                                        htmlFor={`subcat-img-${idx}-${subIdx}`}
                                                                        onDragOver={(e) => {
                                                                            e.preventDefault();
                                                                            e.currentTarget.classList.add('bg-purple-100');
                                                                        }}
                                                                        onDragLeave={(e) => {
                                                                            e.currentTarget.classList.remove('bg-purple-100');
                                                                        }}
                                                                        onDrop={(e) => {
                                                                            e.preventDefault();
                                                                            e.currentTarget.classList.remove('bg-purple-100');
                                                                            const file = e.dataTransfer.files[0];
                                                                            if (file) {
                                                                                const fileInput = document.getElementById(`subcat-img-${idx}-${subIdx}`);
                                                                                const dataTransfer = new DataTransfer();
                                                                                dataTransfer.items.add(file);
                                                                                fileInput.files = dataTransfer.files;
                                                                                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                                                                            }
                                                                        }}
                                                                        className="flex items-center justify-center px-1.5 py-0.5 bg-purple-500 text-white rounded text-[8px] cursor-pointer hover:bg-purple-600 transition-colors"
                                                                        title="Upload image"
                                                                    >
                                                                        <Upload size={10} />
                                                                    </label>
                                                                    <input
                                                                        id={`subcat-img-${idx}-${subIdx}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                try {
                                                                                    toast.loading('Uploading...', { id: `subcat-${idx}-${subIdx}` });
                                                                                    const result = await GoogleSheetService.uploadMediaToDrive(file);
                                                                                    if (result.success) {
                                                                                        const newItems = [...widget.items];
                                                                                        const subCategories = [...(newItems[idx].subCategories || [])];
                                                                                        subCategories[subIdx] = { ...subCategories[subIdx], image: result.viewUrl, driveFileId: result.fileId };
                                                                                        newItems[idx] = { ...newItems[idx], subCategories };
                                                                                        handleFieldChange('items', newItems);
                                                                                        toast.success('Uploaded!', { id: `subcat-${idx}-${subIdx}` });
                                                                                    } else {
                                                                                        toast.error('Upload failed', { id: `subcat-${idx}-${subIdx}` });
                                                                                    }
                                                                                } catch (err) {
                                                                                    toast.error('Upload error', { id: `subcat-${idx}-${subIdx}` });
                                                                                }
                                                                            }
                                                                            e.target.value = '';
                                                                        }}
                                                                        className="hidden"
                                                                    />
                                                                </div>

                                                                {/* State-wise Products */}
                                                                <div className="text-[9px] font-semibold text-slate-500 mb-1">Products by State</div>
                                                                <div className="space-y-1">
                                                                    {['global', 'JH', 'CG', 'WB'].map(state => (
                                                                        <div key={state} className="flex items-center gap-1.5">
                                                                            <span className="text-[9px] font-medium text-slate-600 w-12">{state === 'global' ? 'Global' : state}:</span>
                                                                            <input
                                                                                value={subCat.products?.[state] || ''}
                                                                                onChange={(e) => {
                                                                                    const newItems = [...widget.items];
                                                                                    const subCategories = [...(newItems[idx].subCategories || [])];
                                                                                    subCategories[subIdx] = {
                                                                                        ...subCategories[subIdx],
                                                                                        products: {
                                                                                            ...(subCategories[subIdx].products || {}),
                                                                                            [state]: e.target.value
                                                                                        }
                                                                                    };
                                                                                    newItems[idx] = { ...newItems[idx], subCategories };
                                                                                    handleFieldChange('items', newItems);
                                                                                }}
                                                                                placeholder="PROD1,PROD2,PROD3"
                                                                                className="flex-1 px-1.5 py-0.5 text-[9px] border border-slate-200 rounded font-mono"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(item.subCategories || []).length === 0 && (
                                                            <div className="text-center py-2 text-[9px] text-slate-400 italic">No sub-categories</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(widget.items || []).length === 0 && (
                                            <div className="text-center py-3 text-[10px] text-slate-400 italic">No carousel items added</div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            {renderWidgetConfig('primaryMasthead', 'Primary Masthead')}
            {renderWidgetConfig('secondaryMasthead', 'Secondary Masthead')}
        </div>
    );
};

export default HeaderConfiguration;
