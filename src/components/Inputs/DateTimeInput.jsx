import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');

function formatISO(date) {
    if (!date) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

/** Get calendar grid days for a given year/month. Returns array of {day, inMonth} */
function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0 offset
    let startOffset = (firstDay.getDay() + 6) % 7; // shift so Monday = 0

    const days = [];
    // Previous month padding
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
        days.push({ day: prevLastDay - i, inMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({ day: d, inMonth: true });
    }
    // Next month padding to fill 6 rows max (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
        days.push({ day: d, inMonth: false });
    }
    return days;
}

/** Scrollable number spinner column */
const ScrollSpinner = ({ value, onChange, max, label }) => {
    const containerRef = useRef(null);
    const itemHeight = 32;
    const suppressScroll = useRef(false);

    // Scroll to selected value on mount and value change
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        suppressScroll.current = true;
        el.scrollTop = value * itemHeight;
        // Allow scroll events again after a tick
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
                className="h-24 w-14 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
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
 * DateTimeInput — Combined date-time picker with calendar grid + scrolling hour/minute spinners.
 *
 * Props (InputRegistry interface):
 * - label, value, onChange(value)
 * - error, helperText, required, disabled, placeholder
 *
 * Value format: YYYY-MM-DDTHH:MM:SS (ISO 8601)
 */
const DateTimeInput = ({
    label,
    value = '',
    onChange,
    error,
    helperText,
    required,
    disabled,
    placeholder = 'Select date & time...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Calendar view state
    const parsed = parseISO(value);
    const [viewYear, setViewYear] = useState(() => parsed ? parsed.getFullYear() : new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsed ? parsed.getMonth() : new Date().getMonth());

    // Selected date/time state (derived from value)
    const selectedDay = parsed ? parsed.getDate() : null;
    const selectedMonth = parsed ? parsed.getMonth() : null;
    const selectedYear = parsed ? parsed.getFullYear() : null;
    const [hour, setHour] = useState(() => parsed ? parsed.getHours() : 0);
    const [minute, setMinute] = useState(() => parsed ? parsed.getMinutes() : 0);

    // Sync internal time state when value changes externally
    useEffect(() => {
        const p = parseISO(value);
        if (p) {
            setHour(p.getHours());
            setMinute(p.getMinutes());
            setViewYear(p.getFullYear());
            setViewMonth(p.getMonth());
        }
    }, [value]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const emitChange = useCallback((y, m, d, h, min) => {
        const dt = new Date(y, m, d, h, min, 0);
        onChange(formatISO(dt));
    }, [onChange]);

    const handleDayClick = (day) => {
        emitChange(viewYear, viewMonth, day, hour, minute);
    };

    const handleHourChange = (h) => {
        setHour(h);
        if (selectedDay !== null) {
            emitChange(selectedYear, selectedMonth, selectedDay, h, minute);
        }
    };

    const handleMinuteChange = (m) => {
        setMinute(m);
        if (selectedDay !== null) {
            emitChange(selectedYear, selectedMonth, selectedDay, hour, m);
        }
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleToday = () => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        setHour(now.getHours());
        setMinute(now.getMinutes());
        onChange(formatISO(now));
    };

    const handleClear = () => {
        onChange('');
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevMonth(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); handleNextMonth(); }
        if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); }
    };

    const calendarDays = getCalendarDays(viewYear, viewMonth);
    const today = new Date();
    const isToday = (day) =>
        day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isSelected = (day) =>
        day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;

    return (
        <div className="mb-3" ref={ref} onKeyDown={handleKeyDown}>
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {/* Trigger input */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between transition-all
                    ${error
                        ? 'bg-red-50 border border-red-300 text-red-700'
                        : isOpen
                            ? 'bg-white border border-blue-500 text-slate-800 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 hover:border-slate-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
                <Calendar size={14} className="text-slate-400" />
            </button>

            {/* Popup panel */}
            {isOpen && (
                <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-72">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold text-slate-700">
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map((d) => (
                            <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((cell, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={!cell.inMonth}
                                onClick={() => cell.inMonth && handleDayClick(cell.day)}
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
                        <ScrollSpinner value={hour} onChange={handleHourChange} max={23} label="Hour" />
                        <span className="text-lg font-bold text-slate-300 mt-4">:</span>
                        <ScrollSpinner value={minute} onChange={handleMinuteChange} max={59} label="Min" />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 my-2" />

                    {/* Action buttons */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <X size={12} /> Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleToday}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default DateTimeInput;
