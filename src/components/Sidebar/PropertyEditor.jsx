
import React, { useMemo } from 'react';
import { useWidgetContext } from '../../context/WidgetContext';
import { WidgetRegistry } from '../../config/WidgetRegistry';
import { getInputComponent } from '../Inputs/InputRegistry';
import { validateField } from '../../services/system/ConfigValidator';
import PillSelector from '../Inputs/PillSelector';
import ToggleInput from '../Inputs/ToggleInput';
import LegacyPropertyEditor from './LegacyPropertyEditor';

/**
 * PropertyEditor
 *
 * Config-Driven property editor. For config-driven widgets:
 * 1. Reads PNC properties from config → renders variant selectors (pills, toggles)
 * 2. Reads fields[] from config → renders input components via InputRegistry
 * 3. Uses ConfigValidator for real-time field validation
 *
 * For legacy widgets, falls back to LegacyPropertyEditor.
 */
const PropertyEditor = ({ widget }) => {
    const { updateWidget } = useWidgetContext();

    const config = WidgetRegistry.getConfig(widget.type);

    // ── Handlers ──
    const handleChange = (field, value) => {
        updateWidget(widget.id, { [field]: value });

        // Sync implicit has_multimedia when background media changes
        if (field === 'background_media' || field === 'background_video') {
            const currentPnc = widget.pnc || {};
            updateWidget(widget.id, {
                pnc: { ...currentPnc, has_multimedia: !!value }
            });
        }
    };

    const handlePncChange = (field, value) => {
        const currentPnc = widget.pnc || {};
        updateWidget(widget.id, {
            pnc: { ...currentPnc, [field]: value }
        });
    };

    // ── Memoized visible fields ──
    const pnc = widget.pnc || config?.initialState?.pnc || {};
    const visibleFields = useMemo(() => {
        if (!config?.fields) return [];
        return config.fields.filter(f => !f.condition || f.condition(pnc));
    }, [config, pnc]);

    // ── Fallback to legacy ──
    if (!config) {
        return <LegacyPropertyEditor widget={widget} />;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* ─── Section 1: Variant Properties (PNC) ─── */}
            {config.properties && (
                <div className="flex flex-col gap-4">
                    {Object.entries(config.properties).map(([key, prop]) => {
                        const currentValue = pnc[key] ?? prop.default;

                        if (prop.ui === 'pills') {
                            return (
                                <div key={key} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                                    <PillSelector
                                        label={prop.label}
                                        options={prop.options}
                                        value={currentValue}
                                        onChange={(val) => handlePncChange(key, val)}
                                    />
                                </div>
                            );
                        }

                        if (prop.ui === 'card' && prop.type === 'boolean') {
                            return (
                                <div
                                    key={key}
                                    onClick={() => handlePncChange(key, !currentValue)}
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${currentValue
                                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${currentValue ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                            }`}>
                                            {currentValue && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div>
                                            <div className={`text-sm font-semibold ${currentValue ? 'text-blue-900' : 'text-slate-700'}`}>
                                                {prop.label}
                                            </div>
                                            {prop.description && (
                                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    {prop.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Fallback
                        return (
                            <div key={key} className="border border-slate-200 rounded-xl p-3 bg-white">
                                <ToggleInput
                                    label={prop.label}
                                    description={prop.description}
                                    value={currentValue}
                                    onChange={(val) => handlePncChange(key, val)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Section 2: Config-Driven Fields ─── */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                <h3 className="font-semibold text-sm text-slate-900 mb-3">Content Settings</h3>
                <div className="flex flex-col gap-1">
                    {visibleFields.map(field => {
                        const InputComponent = getInputComponent(field.component);
                        const error = validateField(field, widget[field.name]);

                        return (
                            <InputComponent
                                key={field.name}
                                label={field.label}
                                value={widget[field.name] || ''}
                                onChange={(val) => handleChange(field.name, val)}
                                error={error}
                                helperText={field.helperText}
                                placeholder={field.placeholder}
                                required={field.validation?.required}
                                {...(field.validation || {})}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ─── Section 3: Filters (if config defines them) ─── */}
            {config.additionalProperties && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-900 mb-3">Advanced Settings</h3>
                    <div className="flex flex-col gap-1">
                        {Object.entries(config.additionalProperties).map(([key, prop]) => {
                            const InputComponent = getInputComponent(prop.component || 'TextInput');
                            return (
                                <InputComponent
                                    key={key}
                                    label={prop.label}
                                    value={widget[key] ?? prop.default}
                                    onChange={(val) => handleChange(key, val)}
                                    helperText={prop.helperText}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyEditor;
