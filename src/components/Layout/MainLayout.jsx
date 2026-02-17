import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import HeaderConfiguration from '../Sidebar/HeaderConfiguration';
import PhoneFrame from '../Preview/PhoneFrame';
import HelpGuide from '../HelpGuide';
import { useAuth } from '../../context/AuthContext';
import { useWidgetContext } from '../../context/WidgetContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import RequestQueue from '../Dashboard/RequestQueue';
import ManageApprovalUsers from '../AdminPanel/ManageApprovalUsers';
import { LogOut, Save, CheckCircle, XCircle, Send, RotateCcw, Smartphone, ChevronDown, ListTodo, History, Undo2, Redo2, Settings, X, Users } from 'lucide-react';


const MainLayout = () => {
    const { user, logout, isChecker, isSuperAdmin } = useAuth();
    const {
        pageStatus, setPageStatus, submitForReview, approvePage, rejectPage, resetToDraft,
        headerWidgets, updateHeaderWidget, canUndo, canRedo, undo, redo
    } = useWidgetContext();
    const { theme, toggleTheme, osType, toggleOS } = useAppSettings();
    const [sidebarWidth, setSidebarWidth] = React.useState(420);
    const [isResizing, setIsResizing] = React.useState(false);
    const [showQueue, setShowQueue] = React.useState(false);
    const [showHeaderConfig, setShowHeaderConfig] = React.useState(false);
    const [showManageUsers, setShowManageUsers] = React.useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'cmd+z': undo,
        'ctrl+z': undo,
        'cmd+shift+z': redo,
        'ctrl+shift+z': redo,
    });


    const getStatusColor = () => {
        switch (pageStatus) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent) => {
            if (isResizing) {
                const newWidth = mouseMoveEvent.clientX;
                if (newWidth > 280 && newWidth < 800) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className={`flex flex-col h-screen bg-slate-50 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <img
                        src="/assets/optimus-logo.png"
                        alt="Optimus"
                        className="h-10 w-auto"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* OS Switcher */}
                    <button
                        onClick={toggleOS}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700"
                        title={`Switch to ${osType === 'ios' ? 'Android' : 'iOS'}`}
                    >
                        <Smartphone size={14} />
                        <span>{osType === 'ios' ? 'iOS' : 'Android'}</span>
                    </button>

                    {/* Undo/Redo Buttons */}
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Cmd+Z)"
                        aria-label="Undo"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Cmd+Shift+Z)"
                        aria-label="Redo"
                    >
                        <Redo2 size={16} />
                    </button>


                    <div className="h-6 w-px bg-slate-200"></div>

                    {/* Queue Toggle Button */}
                    <button
                        onClick={() => setShowQueue(!showQueue)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium ${showQueue ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        title="View Queue"
                    >
                        <ListTodo size={14} />
                        <span>Queue</span>
                    </button>

                    {/* Manage Users Button (Super Admin only) */}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setShowManageUsers(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors text-xs font-medium"
                            title="Manage Approval Users"
                        >
                            <Users size={14} />
                            <span>Users</span>
                        </button>
                    )}

                    {/* Filter buttons for Maker - Controls both page status and queue filter */}
                    {user?.role === 'MAKER' && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => {
                                    setQueueFilter('DRAFT');
                                    setPageStatus('DRAFT');
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${pageStatus === 'DRAFT'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Draft
                            </button>
                            <button
                                onClick={() => {
                                    setQueueFilter('PENDING');
                                    setPageStatus('PENDING');
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${pageStatus === 'PENDING'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => {
                                    setQueueFilter('APPROVED');
                                    setPageStatus('APPROVED');
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${pageStatus === 'APPROVED'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Approved
                            </button>
                        </div>
                    )}

                    {/* Request Queue Popover */}
                    {showQueue && isChecker && (
                        <RequestQueue
                            onClose={() => setShowQueue(false)}
                            onApprove={(id) => {
                                // Don't call approvePage() here - it sends ALL widgets unfiltered.
                                // The approval automation is already handled by handleApprove in RequestQueue.jsx
                                // which only sends the selected widgets.
                                setPageStatus('APPROVED');
                                setShowQueue(false);
                            }}
                            onReject={(id) => {
                                setPageStatus('REJECTED');
                                setShowQueue(false);
                            }}
                        />
                    )}

                    {/* Maker Queue view with filter */}
                    {showQueue && user?.role === 'MAKER' && (
                        <RequestQueue onClose={() => setShowQueue(false)} currentFilter={queueFilter} />
                    )}


                    {/* Workflow Actions */}
                    {user?.role === 'MAKER' && (pageStatus === 'DRAFT' || pageStatus === 'REJECTED') && (
                        <button
                            onClick={submitForReview}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Send size={16} />
                            Submit
                        </button>
                    )}

                    {isChecker && pageStatus === 'APPROVED' && (
                        <button
                            onClick={resetToDraft}
                            className="text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                            title="Re-open Draft"
                        >
                            <RotateCcw size={14} />
                            Re-open
                        </button>
                    )}

                    <div className="h-6 w-px bg-slate-200"></div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{user?.role}</div>
                        </div>
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                </div>
            </header>

            {/* Main Content Split */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - CMS */}
                <div
                    style={{ width: sidebarWidth }}
                    className="bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shrink-0"
                >
                    {/* Header Configuration Trigger Button */}
                    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                        <button
                            onClick={() => setShowHeaderConfig(true)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm group"
                            aria-label="Open header configuration"
                        >
                            <div className="flex items-center gap-2">
                                <Settings size={18} className="text-blue-600" />
                                <span className="font-semibold text-slate-800">Configure Header</span>
                            </div>
                            <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-xs text-slate-500 mt-2 px-1">Primary & Secondary Masthead settings</p>
                    </div>

                    {/* Standard Widget Library - Now Always Visib le */}
                    <div className="flex-1 overflow-y-auto">
                        <Sidebar />
                    </div>
                </div>

                {/* Drag Handle */}
                <div
                    onMouseDown={startResizing}
                    className="w-1 hover:bg-blue-400 cursor-col-resize active:bg-blue-600 transition-colors z-20 shrink-0"
                />

                {/* Right Workspace - Preview */}
                <div className="flex-1 bg-slate-50 relative flex items-center justify-center p-8 overflow-auto">
                    {/* Dot Pattern Background */}
                    <div className="absolute inset-0 opacity-[0.4]"
                        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
                    </div>

                    <PhoneFrame />
                </div>
            </div>

            {/* Header Configuration Modal Panel */}
            {showHeaderConfig && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
                        onClick={() => setShowHeaderConfig(false)}
                    />

                    {/* Modal Panel */}
                    <div className="fixed inset-y-0 left-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Settings size={24} />
                                    <div>
                                        <h2 className="text-xl font-bold">Header Configuration</h2>
                                        <p className="text-sm text-blue-100 mt-1">Configure Primary & Secondary Masthead</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHeaderConfig(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Close (ESC)"
                                    aria-label="Close modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            {headerWidgets && (
                                <HeaderConfiguration
                                    headerWidgets={headerWidgets}
                                    onUpdate={updateHeaderWidget}
                                />
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-slate-200 p-4 bg-white shrink-0 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Changes are saved automatically</p>
                            <button
                                onClick={() => setShowHeaderConfig(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Manage Users Modal Panel (Super Admin) */}
            {showManageUsers && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
                        onClick={() => setShowManageUsers(false)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users size={24} />
                                    <div>
                                        <h2 className="text-xl font-bold">Manage Approval Users</h2>
                                        <p className="text-sm text-amber-100 mt-1">Add or remove checkers</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowManageUsers(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            <ManageApprovalUsers />
                        </div>
                        <div className="border-t border-slate-200 p-4 bg-white shrink-0 flex items-center justify-end">
                            <button
                                onClick={() => setShowManageUsers(false)}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Interactive Help Guide */}
            <HelpGuide />
        </div>
    );
};

export default MainLayout;
