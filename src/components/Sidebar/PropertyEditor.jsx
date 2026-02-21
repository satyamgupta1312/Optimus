
import React, { useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { useWidgetContext } from '../../context/WidgetContext';
import { WidgetRegistry } from '../../config/WidgetRegistry';
import { getInputComponent } from '../Inputs/InputRegistry';
import { validateField, validateWidget } from '../../services/system/ConfigValidator';
import PillSelector from '../Inputs/PillSelector';
import ToggleInput from '../Inputs/ToggleInput';
import LegacyPropertyEditor from './LegacyPropertyEditor';
import FilterEditor from '../Editors/FilterEditor';
import AppConfigEditor from '../Editors/AppConfigEditor';
import ExpandPageSection from '../Editors/ExpandPageSection';
import DateRangePicker from '../Inputs/DateRangePicker';
import showToast from '../../utils/toast';
import { LocalApiService } from '../../services/LocalApiService';

/**
 * AppConfigPanel — Collapsible panel grouping Advanced Settings + Filters + App Configuration.
 * Only renders the toggle button if at least one sub-section exists in config.
 */
const AppConfigPanel = ({ config, widget, handleChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const hasAdvanced = !!config.additionalProperties;
    const hasFilters = !!config.filters;
    const hasAppConfig = !!config.appConfigurations;

    if (!hasAdvanced && !hasFilters && !hasAppConfig) return null;

    return (
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
                <Settings2 size={15} className="text-slate-500" />
                <span className="font-semibold text-sm text-slate-900 flex-1">App Config</span>
                {isOpen
                    ? <ChevronDown size={16} className="text-slate-400" />
                    : <ChevronRight size={16} className="text-slate-400" />
                }
            </button>

            {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-4">
                    {/* Advanced Settings */}
                    {hasAdvanced && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Advanced Settings</h4>
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

                    {/* Filters */}
                    {hasFilters && (
                        <FilterEditor
                            filters={config.filters}
                            value={widget.filterValues || {}}
                            onChange={(val) => handleChange('filterValues', val)}
                        />
                    )}

                    {/* App Configuration */}
                    {hasAppConfig && (
                        <AppConfigEditor
                            config={config.appConfigurations}
                            value={widget.appConfig || {}}
                            onChange={(val) => handleChange('appConfig', val)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * PropertyEditor
 *
 * Config-Driven property editor. For config-driven widgets:
 * 1. Reads PNC properties from config → renders variant selectors (pills, toggles)
 * 2. Reads fields[] from config → renders input components via InputRegistry
 * 3. Uses ConfigValidator for real-time field validation
 * 4. Submit button validates and deselects → ready for next widget
 *
 * For legacy widgets, falls back to LegacyPropertyEditor.
 */
const PropertyEditor = ({ widget, onSubmit }) => {
    const { updateWidget, setSelectedWidgetId } = useWidgetContext();

    const config = WidgetRegistry.getConfig(widget.type);

    const [uploadingMedia, setUploadingMedia] = useState(false);

    // ── Handlers ──
    const handleChange = async (field, value) => {
        // Auto-upload File to local server for background_media (same as HeaderConfiguration)
        if (field === 'background_media' && value instanceof File) {
            // Set file immediately for local preview
            updateWidget(widget.id, { [field]: value });
            const currentPnc = widget.pnc || {};
            updateWidget(widget.id, { pnc: { ...currentPnc, has_multimedia: true } });

            // Upload to server/uploads/ → get persistent URL
            setUploadingMedia(true);
            showToast.loading('Uploading media...', { id: 'media-upload' });
            try {
                const result = await LocalApiService.uploadMedia(value);
                if (result.success) {
                    // Replace File with persistent URL
                    updateWidget(widget.id, {
                        background_media: result.viewUrl,
                        background_media_fileId: result.fileId,
                    });
                    showToast.success('Media uploaded!', { id: 'media-upload' });
                } else {
                    showToast.error('Upload failed: ' + (result.error || 'Unknown'), { id: 'media-upload' });
                }
            } catch (err) {
                console.error('[PropertyEditor] Media upload error:', err);
                showToast.error('Upload failed', { id: 'media-upload' });
            } finally {
                setUploadingMedia(false);
            }
            return;
        }

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
        const newPnc = { ...currentPnc, [field]: value };

        // Auto-disable properties that become unavailable with the new PNC
        if (config?.properties) {
            for (const [key, prop] of Object.entries(config.properties)) {
                if (key !== field && prop.disabledWhen && prop.disabledWhen(newPnc)) {
                    newPnc[key] = prop.default ?? false;
                }
            }
        }

        updateWidget(widget.id, { pnc: newPnc });
    };

    // ── Memoized visible fields ──
    const pnc = widget.pnc || config?.initialState?.pnc || {};
    const visibleFields = useMemo(() => {
        if (!config?.fields) return [];
        return config.fields.filter(f => !f.condition || f.condition(pnc, widget));
    }, [config, pnc, widget]);

    // ── Fallback to legacy ──
    if (!config) {
        return <LegacyPropertyEditor widget={widget} />;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* ─── Section 1: Variant Properties (PNC) ─── */}
            {config.properties && (
                <div className="flex flex-col gap-4">
                    {Object.entries(config.properties)
                        .filter(([, prop]) => {
                            // Hide variant selectors — these are chosen at add time via WidgetLibrary picker
                            if (prop.options && Array.isArray(prop.options) && prop.options.length > 1) return false;
                            return true;
                        })
                        .map(([key, prop]) => {
                            const currentValue = pnc[key] ?? prop.default;
                            const isDisabled = prop.disabledWhen ? prop.disabledWhen(pnc) : false;

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
                                // If disabled, force value off and show "Not Available"
                                if (isDisabled) {
                                    return (
                                        <div
                                            key={key}
                                            className="border border-slate-200 rounded-xl p-4 bg-slate-50 opacity-60 cursor-not-allowed"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-semibold text-slate-400">
                                                            {prop.label}
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                                            Not Available
                                                        </span>
                                                    </div>
                                                    {prop.disabledMessage && (
                                                        <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                            {prop.disabledMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

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
                    {(() => {
                        // Group start_time + end_time into one DateRangePicker
                        const rendered = [];
                        let i = 0;
                        while (i < visibleFields.length) {
                            const field = visibleFields[i];
                            const next = visibleFields[i + 1];

                            const isStartTime = field.name === 'start_time' && field.component === 'DateTimeInput';
                            const isEndTime = next?.name === 'end_time' && next?.component === 'DateTimeInput';

                            if (isStartTime && isEndTime) {
                                const startError = validateField(field, widget.start_time, { pnc });
                                const endError = validateField(next, widget.end_time, { pnc });
                                rendered.push(
                                    <DateRangePicker
                                        key="date_range"
                                        label="Schedule"
                                        startValue={widget.start_time || ''}
                                        endValue={widget.end_time || ''}
                                        onStartChange={(val) => handleChange('start_time', val)}
                                        onEndChange={(val) => handleChange('end_time', val)}
                                        required
                                        error={startError || endError}
                                        helperText="Click start date, then end date on the same calendar"
                                    />
                                );
                                i += 2; // skip both fields
                                continue;
                            }

                            const InputComponent = getInputComponent(field.component);
                            const error = validateField(field, widget[field.name], { pnc });
                            rendered.push(
                                <div key={field.name}>
                                    <InputComponent
                                        label={field.label}
                                        value={widget[field.name] ?? field.default ?? ''}
                                        onChange={(val) => handleChange(field.name, val)}
                                        error={error}
                                        helperText={field.helperText}
                                        placeholder={field.placeholder}
                                        required={field.validation?.required}
                                        options={field.options}
                                        widget={widget}
                                        {...(field.validation || {})}
                                    />
                                    {field.name === 'background_media' && uploadingMedia && (
                                        <div className="flex items-center gap-2 text-blue-600 text-xs -mt-2 mb-2 ml-1">
                                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            Uploading to server...
                                        </div>
                                    )}
                                </div>
                            );

                            // Expand Page toggle — appears after pageType when product_listing_page selected
                            if (field.name === 'pageType' && widget.pageType === 'product_listing_page') {
                                rendered.push(
                                    <ExpandPageSection
                                        key="expand_page"
                                        expandPage={widget.expandPage || false}
                                        plpWidgets={widget.plpWidgets || []}
                                        onChange={({ expandPage, plpWidgets }) => {
                                            updateWidget(widget.id, { expandPage, plpWidgets });
                                        }}
                                    />
                                );
                            }

                            i++;
                        }
                        return rendered;
                    })()}
                </div>
            </div>

            {/* ─── Section 3: App Config (collapsible — Advanced + Filters + App Config) ─── */}
            <AppConfigPanel
                config={config}
                widget={widget}
                handleChange={handleChange}
            />

            {/* ─── Submit Button ─── */}
            <div className="border-t border-slate-200 pt-4 mt-2">
                <button
                    onClick={() => {
                        // Validate all visible fields
                        const errors = validateWidget(config, widget);
                        const hasErrors = Object.values(errors).some(e => e !== null);

                        if (hasErrors) {
                            const firstError = Object.entries(errors).find(([, e]) => e !== null);
                            showToast.error(`Fix errors before saving: ${firstError[1]}`);
                            return;
                        }

                        showToast.success(`${config.label || widget.type} saved!`);
                        setSelectedWidgetId(null);
                        if (onSubmit) onSubmit(widget);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
                >
                    <CheckCircle size={16} />
                    Save Widget
                </button>
                <button
                    onClick={() => {
                        setSelectedWidgetId(null);
                        if (onSubmit) onSubmit(null);
                    }}
                    className="w-full text-center text-xs text-slate-400 hover:text-blue-600 mt-2 py-1 transition-colors"
                >
                    Skip — add another widget without saving
                </button>
            </div>
        </div>
    );
};

export default PropertyEditor;
