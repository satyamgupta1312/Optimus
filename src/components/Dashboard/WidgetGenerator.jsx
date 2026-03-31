import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Save, Plus, Trash2, Calendar, Upload, Key, FileText } from 'lucide-react';
import { DeploymentService } from '../../Backend/services/DeploymentService';
import DateTimeInput from '../Inputs/DateTimeInput';

const WidgetGenerator = ({ onClose }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    // Form State
    const [config, setConfig] = useState({
        csrfToken: '',
        title: 'New Category Grid',
        baseSlug: 'category_grid',
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        displayVertical: 'no',
        pageLayoutHeading: 'Category Page'
    });

    const [items, setItems] = useState([
        { id: 1, name: '', nameHi: '', image: null, leafIds: '' }
    ]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), name: '', nameHi: '', image: null, leafIds: '' }]);
    };

    const handleDeleteItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleDeploy = async () => {
        setLoading(true);
        setLogs(['Starting Deployment...']);

        // Mock Request Object adapting to BackendSyncService
        const mockRequest = {
            widgets: [{
                type: 'Category Grid',
                title: config.title,
                items: items.map(i => ({
                    text: i.name,
                    // We need to handle image uploads properly in service if actual files
                    // For now passing raw object if service supports it or placeholder
                    imageObj: i.image,
                    leafIds: i.leafIds
                }))
            }]
        };

        try {
            const result = await DeploymentService.deployRequest(mockRequest, { csrftoken: config.csrfToken });

            if (result.success) {
                setLogs(prev => [...prev, ...result.logs, '✅ Deployment Complete!']);
            } else {
                setLogs(prev => [...prev, ...result.logs, `❌ Error: ${result.error}`]);
            }
        } catch (e) {
            setLogs(prev => [...prev, `❌ Exception: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Widget Generator</h2>
                        <div className="text-xs text-slate-500">Step {step} of 4</div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Step 1: Authentication */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-800 text-sm mb-4">
                                <Key size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    Authentication is required to create widgets on the server.
                                    <br />Please enter your <strong>CSRF Token</strong> from <code>samaan.apnamart.in</code>.
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CSRF Token</label>
                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={config.csrfToken}
                                    onChange={(e) => setConfig({ ...config, csrfToken: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="Enter token..."
                                    style={{ WebkitTextSecurity: 'disc', textSecurity: 'disc' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Widget Details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Widget Title</label>
                                    <input
                                        value={config.title}
                                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Base Slug</label>
                                    <input
                                        value={config.baseSlug}
                                        onChange={(e) => setConfig({ ...config, baseSlug: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono text-slate-600"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DateTimeInput
                                    label="Start Date & Time"
                                    value={config.startDate || ''}
                                    onChange={(val) => setConfig({ ...config, startDate: val })}
                                    required
                                />
                                <DateTimeInput
                                    label="End Date & Time"
                                    value={config.endDate || ''}
                                    onChange={(val) => setConfig({ ...config, endDate: val })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Page Layout Heading</label>
                                <input
                                    value={config.pageLayoutHeading}
                                    onChange={(e) => setConfig({ ...config, pageLayoutHeading: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Items */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-slate-700">Sub-Categories ({items.length})</h3>
                                <button
                                    onClick={handleAddItem}
                                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 font-bold transition-colors"
                                >
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 relative group">
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            <div className="col-span-1 flex items-center justify-center pt-2 text-sm font-bold text-slate-300">
                                                #{idx + 1}
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    placeholder="Category Name (En)"
                                                    value={item.name}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].name = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full text-xs p-2 border border-slate-300 rounded mb-2"
                                                />
                                                <input
                                                    placeholder="Name (Hindi)"
                                                    value={item.nameHi}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].nameHi = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full text-xs p-2 border border-slate-300 rounded"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    placeholder="Leaf IDs (comma sep)"
                                                    value={item.leafIds}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[idx].leafIds = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full text-xs p-2 border border-slate-300 rounded font-mono mb-2"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <label className="flex-1 cursor-pointer bg-white border border-dashed border-slate-300 rounded p-1.5 flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors">
                                                        <Upload size={12} className="text-slate-400" />
                                                        <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                                                            {item.image ? item.image.name : 'Upload Img'}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    const newItems = [...items];
                                                                    newItems[idx].image = e.target.files[0];
                                                                    setItems(newItems);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Execution */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs h-[300px] overflow-y-auto custom-scrollbar">
                                {logs.length === 0 ? (
                                    <div className="text-slate-500 italic text-center mt-20">Ready to Deploy<br />Click button below to start</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">
                                            <span className="text-blue-400 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
                    <button
                        onClick={() => setStep(Math.max(1, step - 1))}
                        disabled={step === 1 || loading}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50 flex items-center gap-1"
                    >
                        <ChevronLeft size={16} /> Back
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => {
                                if (step === 1 && !config.csrfToken) {
                                    alert("Please enter CSRF Token");
                                    return;
                                }
                                setStep(step + 1);
                            }}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleDeploy}
                            disabled={loading}
                            className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 ${loading ? 'opacity-80' : ''}`}
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Save size={16} /> Deploy to Server
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WidgetGenerator;
