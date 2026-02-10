import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, BookOpen, Zap, Lightbulb, CheckCircle, Wrench, Sparkles, Package } from 'lucide-react';

/**
 * Floating Help Button with Step-by-Step Guide
 * Shows widget creation SOP and workflows
 */
const HelpGuide = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeGuide, setActiveGuide] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Guide categories
    const guides = [
        {
            id: 'widget-sops',
            title: 'Widget SOPs (Step-by-Step)',
            icon: Wrench,
            color: 'indigo',
            steps: [
                {
                    title: 'Select a Widget Type',
                    description: 'Choose which widget you want to configure from the list below to see its Standard Operating Procedure (SOP).',
                    tip: 'Click "Next" to cycle through all widget guides'
                }
            ],
            subGuides: [
                {
                    title: 'Primary Masthead (Header)',
                    steps: [
                        {
                            title: '1. Open Header Configuration',
                            description: '• Go to the left sidebar\n• Click on "Header Configuration"\n• Expand "Primary Masthead" section',
                            tip: 'Primary Masthead is always enabled - no toggle needed'
                        },
                        {
                            title: '2. Enter Basic Settings',
                            description: '• **Slug Name**: Unique identifier (e.g., "diwali_2024_header")\n• **Master Key**: Campaign link slug for redirects\n• **End Time**: When this header should expire',
                            tip: 'The slug name will be used to auto-generate the background multimedia slug'
                        },
                        {
                            title: '3. Configure Background Multimedia',
                            description: '• Click "🎨 Configure Background Multimedia" to expand\n• The multimedia slug is **auto-generated** from your slug name + "_bg"\n• Select **Type**: Image, Video, or Lottie\n• Set **Aspect Ratio**: Default is 1 (square)',
                            tip: 'No need to manually enter multimedia slug - it\'s created automatically!'
                        },
                        {
                            title: '4. Set Color Configuration',
                            description: '• **Transition Color**: Background transition color\n• **Accent Color**: Accent/highlight color\n• **Text Color**: Color for text overlays\n• **Icon BG Color**: Background for icons\n• Check **Is Multimedia Dark** if using dark theme',
                            tip: 'Use ColorPicker for easy color selection with hex preview'
                        },
                        {
                            title: '5. Upload Media File',
                            description: '• For Image/Video: **Drag & drop** or click the upload zone\n• Accepted formats: JPG, PNG, WEBP, GIF (images) or MP4, WEBM, MOV (videos)\n• File automatically uploads to **Google Drive**\n• Wait for "✅ Saved to Drive" confirmation',
                            tip: 'For Lottie animations, no file upload needed - just configure colors'
                        },
                        {
                            title: '6. Submit Your Request',
                            description: '• Review all fields are filled correctly\n• Click "💾 Save Request" in toolbar (top-right)\n• Wait for success notification\n• Your request will appear in the Queue',
                            tip: 'The background multimedia will be auto-created when a Checker approves your request!'
                        }
                    ]
                },
                {
                    title: 'Secondary Masthead',
                    steps: [
                        {
                            title: '1. Access Configuration',
                            description: 'Go to sidebar > "Header Configuration" > "Secondary Masthead".',
                            tip: 'Top section of the page below the header'
                        },
                        {
                            title: '2. Timing & Display',
                            description: '• Aspect Ratio: Choose 4 (Standard), 3, 2, or 1 (Square)\n• Start/End Time: Schedule when this widget appears',
                            tip: 'Standard (4) is best for most banners'
                        },
                        {
                            title: '3. Add Carousel Items',
                            description: '• Click "+ Add" to create a new slide\n• Enter Text (English/Hindi)\n• Upload Image or paste URL\n• Enter Redirect Link Slug',
                            tip: 'You can drag items to reorder them'
                        }
                    ]
                },
                {
                    title: 'Banner With Product Listing (PLP)',
                    steps: [
                        {
                            title: '1. Add & Select',
                            description: 'Add "Banner With Product Listing" from the library and click it to edit.',
                            tip: 'Useful for category highlights'
                        },
                        {
                            title: '2. Upload Banner',
                            description: '• Click "Upload Image" in Property Editor\n• Drag & drop your banner image\n• Preview updates instantly',
                            tip: 'Use high-quality images (max 5MB)'
                        },
                        {
                            title: '3. Link Products',
                            description: '• Option A: Enter comma-separated Product IDs\n• Option B: Paste a CSV URL\n• Option C: Type ID and press Enter to search catalog',
                            tip: 'Products will display in a grid below the banner'
                        }
                    ]
                },
                {
                    title: 'Single Product Row (SPR)',
                    steps: [
                        {
                            title: '1. Add Widget',
                            description: 'Select "Single Product Row" from the library.',
                            tip: 'Best for specific product collections'
                        },
                        {
                            title: '2. Configure Title',
                            description: 'Enter a catchy title (e.g., "Best Sellers", "New Arrivals").',
                            tip: 'Keep it short and descriptive'
                        },
                        {
                            title: '3. Add Products',
                            description: 'Enter Product IDs (comma-separated). The widget will auto-fetch details like image, price, and name.',
                            tip: 'Verify product details in the preview'
                        }
                    ]
                },
                {
                    title: 'SPR Optimize (Quick Actions)',
                    steps: [
                        {
                            title: '1. What is it?',
                            description: 'A compact version of SPR that includes "Add to Cart" buttons directly on the card.',
                            tip: 'High conversion for essential items'
                        },
                        {
                            title: '2. Configuration',
                            description: 'Same as Standard SPR:\n• Title\n• Product IDs\n• Background Color',
                            tip: 'Ensure products are in stock'
                        }
                    ]
                },
                {
                    title: 'Category Grid',
                    steps: [
                        {
                            title: '1. Add Widget',
                            description: 'Select "Category Grid" from the library.',
                            tip: 'Used for main navigation links'
                        },
                        {
                            title: '2. Define Grid',
                            description: '• Add items using the definition list\n• Format: id, text, image_url\n• Example: { "id": "1", "text": "Fruits", "image": "..." }',
                            tip: 'Supports 2-4 columns automatically'
                        }
                    ]
                }
            ]
        },
        {
            id: 'widget-creation',
            title: 'General Creation Flow',
            icon: Sparkles,
            color: 'blue',
            steps: [
                {
                    title: 'Step 1: Select Widget Type',
                    description: 'Click on any widget from the sidebar library (CLP, Banner, Product Row, etc.)',
                    tip: 'Widget appears in the phone preview instantly'
                },
                {
                    title: 'Step 2: Configure Properties',
                    description: 'Fill in the required fields in the Property Editor:\n• Title (required)\n• Product IDs or CSV URL\n• Images (use drag & drop)\n• Aspect ratio, colors, etc.',
                    tip: 'Changes reflect in real-time in the preview'
                },
                {
                    title: 'Step 3: Add Products',
                    description: 'For PLP/Banner widgets:\n• Enter product codes (comma-separated)\n• OR paste a CSV URL\n• OR use the catalog search (Enter key)',
                    tip: 'Products auto-populate from catalog'
                },
                {
                    title: 'Step 4: Preview & Reorder',
                    description: '• Use drag handles to reorder widgets\n• Click phone preview to test interactions\n• Check all pages work correctly',
                    tip: 'Drag widgets to change position'
                },
                {
                    title: 'Step 5: Submit for Review',
                    description: 'Click "Submit for Review" button in header when ready',
                    tip: 'Page status changes to PENDING'
                }
            ]
        },
        {
            id: 'workflow',
            title: 'Approval Workflow',
            icon: Zap,
            color: 'purple',
            steps: [
                {
                    title: 'Maker: Create & Submit',
                    description: '1. Create/edit widgets in DRAFT mode\n2. Click "Submit for Review"\n3. Wait for Checker approval',
                    tip: 'Cannot edit while in PENDING status'
                },
                {
                    title: 'Checker: Review',
                    description: '1. Review submitted widgets\n2. Click "Approve" or "Reject"\n3. If rejected, returns to maker',
                    tip: 'Approval triggers automation'
                },
                {
                    title: 'Automation: Google Sheets',
                    description: '1. Approved page → Google Sheets\n2. Automation script creates widgets\n3. Publishes to live application',
                    tip: 'Check Google Sheet for status'
                },
                {
                    title: 'Success!',
                    description: 'Widgets are now live on the application!',
                    tip: 'Use undo if you need to revert'
                }
            ]
        },
        {
            id: 'tips-tricks',
            title: 'Tips & Tricks',
            icon: Lightbulb,
            color: 'green',
            steps: [
                {
                    title: 'Keyboard Shortcuts',
                    description: '• Cmd/Ctrl + Z: Undo\n• Cmd/Ctrl + Shift + Z: Redo\n• Cmd/Ctrl + S: Save (Coming soon)\n• Drag & Drop: Reorder widgets',
                    tip: 'Be a power user!'
                },
                {
                    title: 'Image Upload',
                    description: '• Drag & drop images directly\n• Paste from clipboard (Cmd+V)\n• Or click to browse files\n• Supports PNG, JPG, GIF, WebP',
                    tip: 'Max 5MB per image'
                },
                {
                    title: 'Product Search',
                    description: '• Type product code in field\n• Press Enter to search catalog\n• Products auto-fill with details\n• Live preview updates instantly',
                    tip: 'Works for all PLP widgets'
                },
                {
                    title: 'Duplicate Widgets',
                    description: '• Select any widget\n• Click duplicate icon (copy)\n• Edit the copy\n• Saves time!',
                    tip: 'Appears right below original'
                }
            ]
        }
    ];

    const [parentGuide, setParentGuide] = useState(null);

    const handleOpenGuide = (guide) => {
        setActiveGuide(guide);
        setParentGuide(null);
        setCurrentStep(0);
    };

    const handleNext = () => {
        if (currentStep < activeGuide.steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleClose = () => {
        setActiveGuide(null);
        setParentGuide(null);
        setCurrentStep(0);
        setIsOpen(false);
    };

    const handleSubGuideClick = (subGuide) => {
        setParentGuide(activeGuide);
        setActiveGuide(subGuide);
        setCurrentStep(0);
    };

    const handleBackNavigation = () => {
        if (parentGuide) {
            setActiveGuide(parentGuide);
            setParentGuide(null);
            setCurrentStep(0);
        } else {
            setActiveGuide(null);
            setCurrentStep(0);
        }
    };

    return (
        <>
            {/* Floating Help Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
                title="Help & Guide"
            >
                {isOpen ? (
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                ) : (
                    <HelpCircle size={24} className="group-hover:animate-pulse" />
                )}
            </button>

            {/* Guide Selection Panel */}
            {isOpen && !activeGuide && (
                <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 animate-slideUp">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-3 right-3 z-10 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <BookOpen size={20} />
                            Help & Guides
                        </h3>
                        <p className="text-xs text-blue-100 mt-1">Choose a guide to get started</p>
                    </div>

                    {/* Guide List */}
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                        {guides.map((guide) => {
                            const Icon = guide.icon;
                            const colorClasses = {
                                blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                                purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
                                green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                                indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
                            };

                            return (
                                <button
                                    key={guide.id}
                                    onClick={() => handleOpenGuide(guide)}
                                    className={`w-full p-4 rounded-xl bg-gradient-to-br ${colorClasses[guide.color] || colorClasses.blue} text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-between group`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                            <Icon size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-semibold text-sm">{guide.title}</h4>
                                            <p className="text-xs text-white/80">
                                                {guide.subGuides ? `${guide.subGuides.length} topics` : `${guide.steps.length} steps`}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                        <p className="text-sm text-slate-600 text-center font-medium">
                            💡 Need more help? Contact your admin
                        </p>
                    </div>
                </div>
            )}

            {/* Step-by-Step Guide Modal */}
            {activeGuide && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
                        onClick={handleClose}
                    />

                    {/* Guide Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full animate-slideUp max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-xl flex items-center gap-2">
                                        {activeGuide.icon ? React.createElement(activeGuide.icon, { size: 24 }) : <Package size={24} />}
                                        {activeGuide.title}
                                    </h3>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Progress Bar - Only separate steps if NO subguides */}
                                {!activeGuide.subGuides && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            {activeGuide.steps.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${idx <= currentStep ? 'bg-white' : 'bg-white/30'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-blue-100 mt-2">
                                            Step {currentStep + 1} of {activeGuide.steps.length}
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Step Content */}
                            <div className="p-8 min-h-[300px]">
                                {/* Only show step content if NOT showing subGuides */}
                                {!activeGuide.subGuides && (
                                    <>
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                                                {currentStep + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-xl font-bold text-slate-900 mb-3">
                                                    {activeGuide.steps[currentStep].title}
                                                </h4>
                                                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                                                    {activeGuide.steps[currentStep].description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tip Box */}
                                        {activeGuide.steps[currentStep].tip && (
                                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mt-6 mb-6">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">💡</span>
                                                    <div>
                                                        <h5 className="font-semibold text-amber-900 text-sm mb-1">Pro Tip</h5>
                                                        <p className="text-sm text-amber-800">
                                                            {activeGuide.steps[currentStep].tip}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Sub-Guides Grid */}
                                {activeGuide.subGuides && (
                                    <>
                                        <div className="mb-4">
                                            <h4 className="text-xl font-bold text-slate-900 mb-2">
                                                {activeGuide.steps && activeGuide.steps[0] ? activeGuide.steps[0].title : 'Choose a Widget Type'}
                                            </h4>
                                            <p className="text-slate-600">
                                                {activeGuide.steps && activeGuide.steps[0] ? activeGuide.steps[0].description : 'Select a widget below to view its detailed SOP'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 animate-fadeIn">
                                            {activeGuide.subGuides.map((sub, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSubGuideClick(sub)}
                                                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left flex items-center justify-between group"
                                                >
                                                    <span className="font-medium text-slate-800 text-sm">{sub.title}</span>
                                                    <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Success Message on Last Step (Only if NOT a parent/category guide) */}
                                {!activeGuide.subGuides && currentStep === activeGuide.steps.length - 1 && (
                                    <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg mt-6 flex items-center gap-3">
                                        <CheckCircle size={24} className="text-green-600" />
                                        <div>
                                            <h5 className="font-semibold text-green-900">All Done!</h5>
                                            <p className="text-sm text-green-800">You're all set to create widgets like a pro! 🎉</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Navigation */}
                            <div className="flex items-center justify-between px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl sticky bottom-0 z-10">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className={`px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${activeGuide.subGuides ? 'invisible' : ''}`}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleBackNavigation}
                                        className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        {parentGuide ? `Back to ${parentGuide.title.split(' ')[0]}` : 'Back to Guides'}
                                    </button>

                                    {/* Hide Next/Done buttons if viewing a parent guide with subguides */}
                                    {!activeGuide.subGuides && (
                                        currentStep < activeGuide.steps.length - 1 ? (
                                            <button
                                                onClick={handleNext}
                                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2"
                                            >
                                                Next <ChevronRight size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleClose}
                                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle size={16} /> Done
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default HelpGuide;
