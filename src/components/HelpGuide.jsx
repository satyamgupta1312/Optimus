import React, { useState } from 'react';
import {
    HelpCircle, X, ChevronRight, BookOpen, Zap, Lightbulb,
    CheckCircle, Wrench, Sparkles, Package, LayoutDashboard, Rocket,
} from 'lucide-react';
import { GUIDE_CATEGORIES, GUIDE_COLORS } from '../config/Feature/HelpGuideConfig';

// Map string icon names (from config) to lucide-react components
const ICON_MAP = {
    Wrench,
    Sparkles,
    Zap,
    Lightbulb,
    LayoutDashboard,
    Rocket,
    Package,
    BookOpen,
    HelpCircle,
    CheckCircle,
};

/**
 * Floating Help Button with Step-by-Step Guide
 * Shows widget creation SOP and workflows
 *
 * Guide data is defined in src/config/Feature/HelpGuideConfig.js
 * This component handles only UI, state, and navigation logic.
 */
const HelpGuide = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeGuide, setActiveGuide] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
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
                        {GUIDE_CATEGORIES.map((guide) => {
                            const Icon = ICON_MAP[guide.icon] || Package;

                            return (
                                <button
                                    key={guide.id}
                                    onClick={() => handleOpenGuide(guide)}
                                    className={`w-full p-4 rounded-xl bg-gradient-to-br ${GUIDE_COLORS[guide.color] || GUIDE_COLORS.blue} text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-between group`}
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
                            Need more help? Contact your admin
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
                                        {(() => {
                                            const IconComp = typeof activeGuide.icon === 'string'
                                                ? ICON_MAP[activeGuide.icon]
                                                : activeGuide.icon;
                                            return IconComp
                                                ? <IconComp size={24} />
                                                : <Package size={24} />;
                                        })()}
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
                                            <p className="text-sm text-green-800">You've completed this guide!</p>
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
