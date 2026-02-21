import React from 'react';
import { Smartphone, Settings2 } from 'lucide-react';
import { getInputComponent } from '../Inputs/InputRegistry';

/**
 * AppConfigEditor — Platform toggles + version constraints.
 * Reads config.appConfigurations and renders ToggleInput + VersionInput fields.
 *
 * Props:
 * - config: appConfigurations object from widget config
 * - value: current values { allow_android, allow_ios, min_android_version, ... }
 * - onChange(values)
 */
const AppConfigEditor = ({ config, value = {}, onChange }) => {
    if (!config) return null;

    const handleChange = (key, val) => {
        onChange({ ...value, [key]: val });
    };

    // Group fields into toggles and versions
    const toggleFields = Object.entries(config).filter(([, def]) => def.type === 'boolean');
    const versionFields = Object.entries(config).filter(([, def]) => def.type === 'version');

    return (
        <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Smartphone size={12} className="text-slate-400" />
                App Configuration
            </h4>

            {/* Platform toggles */}
            {toggleFields.length > 0 && (
                <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-500 mb-2">Platforms</label>
                    <div className="flex gap-3">
                        {toggleFields.map(([key, def]) => {
                            const isEnabled = value[key] ?? def.default ?? true;
                            const platform = key.includes('android') ? 'Android' : 'iOS';
                            const icon = key.includes('android') ? '🤖' : '🍎';

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleChange(key, !isEnabled)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all flex-1
                                        ${isEnabled
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-400'
                                        }`}
                                >
                                    <span className="text-lg">{icon}</span>
                                    <div className="text-left">
                                        <div className="text-xs font-semibold">{platform}</div>
                                        <div className="text-[10px]">{isEnabled ? 'Enabled' : 'Disabled'}</div>
                                    </div>
                                    <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${isEnabled ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                                        {isEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Version constraints */}
            {versionFields.length > 0 && (
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Version Constraints</label>
                    <div className="grid grid-cols-2 gap-2">
                        {versionFields.map(([key, def]) => {
                            const InputComponent = getInputComponent(def.component || 'VersionInput');
                            const friendlyLabel = key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, c => c.toUpperCase());

                            return (
                                <InputComponent
                                    key={key}
                                    label={friendlyLabel}
                                    value={value[key] || ''}
                                    onChange={(val) => handleChange(key, val)}
                                    placeholder="e.g. 1.0.0"
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppConfigEditor;
