import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');

function formatISO(date) {
    if (!date) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function parseISO(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(str) {
    if (!str) return '';
    const d = parseISO(str);
    if (!d) return str;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
        days.push({ day: prevLastDay - i, inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({ day: d, inMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
        days.push({ day: d, inMonth: false });
    }
    return days;
}

const ScrollSpinner = ({ value, onChange, max, label }) => {
    const containerRef = useRef(null);
    const itemHeight = 32;
    const suppressScroll = useRef(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        suppressScroll.current = true;
        el.scrollTop = value * itemHeight;
        requestAnimationFrame(() => { suppressScroll.current = false; });
    }, [value]);

    const handleScroll = () => {
        if (suppressScroll.current) return;
        const el = containerRef.current;
        if (!el) return;
        const idx = Math.round(el.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(max, idx));
        if (clamped !== value) onChange(clamped);
    };

    const items = [];
    for (let i = 0; i <= max; i++) items.push(i);

    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-1 font-medium">{label}</span>
            <button
                type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                className="text-slate-400 hover:text-slate-600 p-0.5"
            >
                <ChevronLeft size={14} className="rotate-90" />
            </button>
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-24 w-14 overflow-y-auto snap-y snap-mandatory"
                style={{ scrollbarWidth: 'none' }}
            >
                {items.map((i) => (
                    <div
                        key={i}
                        onClick={() => onChange(i)}
                        className={`h-8 flex items-center justify-center text-sm cursor-pointer snap-center rounded transition-colors
                            ${i === value
                                ? 'bg-blue-100 text-blue-700 font-semibold'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        {pad(i)}
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className="text-slate-400 hover:text-slate-600 p-0.5"
            >
                <ChevronRight size={14} className="rotate-90" />
            </button>
        </div>
    );
};

/**
 * DateRangePicker — Combined Start & End datetime picker in one popup.
 *
 * Uses ReactDOM.createPortal → renders at document root → no clipping from
 * overflow:hidden/scroll parents.
 *
 * Props:
 * - label (string)
 * - startValue / endValue (ISO string)
 * - onStartChange / onEndChange (fn)
 * - required, disabled, error, helperText
 */
const DateRangePicker = ({
    label,
    startValue = '',
    endValue = '',
    onStartChange,
    onEndChange,
    required,
    disabled,
    error,
    helperText,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('start'); // 'start' | 'end'
    const triggerRef = useRef(null);
    const popupRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 });

    const startParsed = parseISO(startValue);
    const endParsed = parseISO(endValue);

    // Per-tab internal state
    const [startYear, setStartYear] = useState(() => startParsed?.getFullYear() ?? new Date().getFullYear());
    const [startMonth, setStartMonth] = useState(() => startParsed?.getMonth() ?? new Date().getMonth());
    const [startHour, setStartHour] = useState(() => startParsed?.getHours() ?? 0);
    const [startMinute, setStartMinute] = useState(() => startParsed?.getMinutes() ?? 0);

    const [endYear, setEndYear] = useState(() => endParsed?.getFullYear() ?? new Date().getFullYear());
    const [endMonth, setEndMonth] = useState(() => endParsed?.getMonth() ?? new Date().getMonth());
    const [endHour, setEndHour] = useState(() => endParsed?.getHours() ?? 23);
    const [endMinute, setEndMinute] = useState(() => endParsed?.getMinutes() ?? 59);

    const startSelectedDay = startParsed?.getDate() ?? null;
    const startSelectedMonth = startParsed?.getMonth() ?? null;
    const startSelectedYear = startParsed?.getFullYear() ?? null;

    const endSelectedDay = endParsed?.getDate() ?? null;
    const endSelectedMonth = endParsed?.getMonth() ?? null;
    const endSelectedYear = endParsed?.getFullYear() ?? null;

    // Position popup below trigger
    const openPopup = () => {
        if (disabled) return;
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
            setPopupPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 300),
            });
        }
        setIsOpen(true);
    };

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (
                !triggerRef.current?.contains(e.target) &&
                !popupRef.current?.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Sync internal state when external value changes
    useEffect(() => {
        const p = parseISO(startValue);
        if (p) {
            setStartYear(p.getFullYear());
            setStartMonth(p.getMonth());
            setStartHour(p.getHours());
            setStartMinute(p.getMinutes());
        }
    }, [startValue]);

    useEffect(() => {
        const p = parseISO(endValue);
        if (p) {
            setEndYear(p.getFullYear());
            setEndMonth(p.getMonth());
            setEndHour(p.getHours());
            setEndMinute(p.getMinutes());
        }
    }, [endValue]);

    // ── Start handlers ──
    const handleStartDayClick = (day) => {
        const dt = new Date(startYear, startMonth, day, startHour, startMinute, 0);
        onStartChange(formatISO(dt));
        // Auto-switch to end tab
        setActiveTab('end');
    };

    const handleStartHourChange = useCallback((h) => {
        setStartHour(h);
        if (startSelectedDay !== null) {
            onStartChange(formatISO(new Date(startSelectedYear, startSelectedMonth, startSelectedDay, h, startMinute, 0)));
        }
    }, [startSelectedDay, startSelectedMonth, startSelectedYear, startMinute, onStartChange]);

    const handleStartMinuteChange = useCallback((m) => {
        setStartMinute(m);
        if (startSelectedDay !== null) {
            onStartChange(formatISO(new Date(startSelectedYear, startSelectedMonth, startSelectedDay, startHour, m, 0)));
        }
    }, [startSelectedDay, startSelectedMonth, startSelectedYear, startHour, onStartChange]);

    // ── End handlers ──
    const handleEndDayClick = (day) => {
        const dt = new Date(endYear, endMonth, day, endHour, endMinute, 0);
        onEndChange(formatISO(dt));
    };

    const handleEndHourChange = useCallback((h) => {
        setEndHour(h);
        if (endSelectedDay !== null) {
            onEndChange(formatISO(new Date(endSelectedYear, endSelectedMonth, endSelectedDay, h, endMinute, 0)));
        }
    }, [endSelectedDay, endSelectedMonth, endSelectedYear, endMinute, onEndChange]);

    const handleEndMinuteChange = useCallback((m) => {
        setEndMinute(m);
        if (endSelectedDay !== null) {
            onEndChange(formatISO(new Date(endSelectedYear, endSelectedMonth, endSelectedDay, endHour, m, 0)));
        }
    }, [endSelectedDay, endSelectedMonth, endSelectedYear, endHour, onEndChange]);

    const today = new Date();

    // ── Render one calendar panel ──
    const renderCalendar = (
        year, month, setYear, setMonth,
        selectedDay, selectedMonth, selectedYear,
        onDayClick, hour, minute, onHourChange, onMinuteChange,
        onClear
    ) => {
        const calDays = getCalendarDays(year, month);

        const isToday = (d) =>
            d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isSelected = (d) =>
            d === selectedDay && month === selectedMonth && year === selectedYear;

        const prevMonth = () => {
            if (month === 0) { setMonth(11); setYear(y => y - 1); }
            else setMonth(m => m - 1);
        };
        const nextMonth = () => {
            if (month === 11) { setMonth(0); setYear(y => y + 1); }
            else setMonth(m => m + 1);
        };

        return (
            <>
                {/* Month nav */}
                <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-semibold text-slate-700">
                        {MONTHS[month]} {year}
                    </span>
                    <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                    {calDays.map((cell, idx) => (
                        <button
                            key={idx}
                            type="button"
                            disabled={!cell.inMonth}
                            onClick={() => cell.inMonth && onDayClick(cell.day)}
                            className={`h-8 w-full text-xs rounded-md transition-colors
                                ${!cell.inMonth
                                    ? 'text-slate-300 cursor-default'
                                    : isSelected(cell.day)
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : isToday(cell.day)
                                            ? 'bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100'
                                            : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                                }`}
                        >
                            {cell.day}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 my-2" />

                {/* Time spinners */}
                <div className="flex items-center justify-center gap-4">
                    <ScrollSpinner value={hour} onChange={onHourChange} max={23} label="Hour" />
                    <span className="text-lg font-bold text-slate-300 mt-4">:</span>
                    <ScrollSpinner value={minute} onChange={onMinuteChange} max={59} label="Min" />
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 my-2" />
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClear}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <X size={12} /> Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const now = new Date();
                            onDayClick(now.getDate());
                            setYear(now.getFullYear());
                            setMonth(now.getMonth());
                            onHourChange(now.getHours());
                            onMinuteChange(now.getMinutes());
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                        Today
                    </button>
                </div>
            </>
        );
    };

    const popup = isOpen && ReactDOM.createPortal(
        <div
            ref={popupRef}
            style={{
                position: 'absolute',
                top: popupPos.top,
                left: popupPos.left,
                width: popupPos.width,
                minWidth: 300,
                zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-3"
        >
            {/* Tabs */}
            <div className="flex mb-3 rounded-lg overflow-hidden border border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('start')}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'start'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    📅 Start
                    {startValue && <span className="ml-1 opacity-70">{formatDisplay(startValue)}</span>}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('end')}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'end'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    🏁 End
                    {endValue && <span className="ml-1 opacity-70">{formatDisplay(endValue)}</span>}
                </button>
            </div>

            {activeTab === 'start'
                ? renderCalendar(
                    startYear, startMonth, setStartYear, setStartMonth,
                    startSelectedDay, startSelectedMonth, startSelectedYear,
                    handleStartDayClick, startHour, startMinute,
                    handleStartHourChange, handleStartMinuteChange,
                    () => onStartChange('')
                )
                : renderCalendar(
                    endYear, endMonth, setEndYear, setEndMonth,
                    endSelectedDay, endSelectedMonth, endSelectedYear,
                    handleEndDayClick, endHour, endMinute,
                    handleEndHourChange, handleEndMinuteChange,
                    () => onEndChange('')
                )
            }

            {/* Done button */}
            <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-2 w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
                Done
            </button>
        </div>,
        document.body
    );

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {/* Trigger — shows both dates */}
            <button
                ref={triggerRef}
                type="button"
                onClick={openPopup}
                disabled={disabled}
                className={`w-full px-3 py-2 rounded-lg text-xs text-left flex items-center justify-between transition-all
                    ${error
                        ? 'bg-red-50 border border-red-300 text-red-700'
                        : isOpen
                            ? 'bg-white border border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex-1 flex flex-col gap-0.5">
                    <span className={startValue ? 'text-slate-700' : 'text-slate-400'}>
                        📅 <span className="font-medium">Start:</span> {startValue ? formatDisplay(startValue) : 'Not set'}
                    </span>
                    <span className={endValue ? 'text-slate-700' : 'text-slate-400'}>
                        🏁 <span className="font-medium">End:</span> {endValue ? formatDisplay(endValue) : 'Not set'}
                    </span>
                </div>
                <Calendar size={14} className="text-slate-400 shrink-0 ml-2" />
            </button>

            {popup}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default DateRangePicker;
