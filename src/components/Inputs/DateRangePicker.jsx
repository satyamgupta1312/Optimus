import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X, Clock } from 'lucide-react';

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
    if (!str) return null;
    const d = parseISO(str);
    if (!d) return null;
    return `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameDay(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
        days.push({ day: prevLastDay - i, inMonth: false, date: new Date(year, month - 1, prevLastDay - i) });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
        days.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
    }
    return days;
}

/** Compact time editor row */
const TimeRow = ({ label, hour, minute, onHourChange, onMinuteChange }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className="flex items-center gap-2">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-500 w-10 shrink-0">{label}</span>
            <select
                value={hour}
                onChange={(e) => onHourChange(Number(e.target.value))}
                className="flex-1 px-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-400"
            >
                {hours.map(h => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            <span className="text-slate-400 font-bold text-sm">:</span>
            <select
                value={minute}
                onChange={(e) => onMinuteChange(Number(e.target.value))}
                className="flex-1 px-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-400"
            >
                {minutes.map(m => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
        </div>
    );
};

/**
 * DateRangePicker — Single calendar grid where:
 *   • Click 1 = sets start date (highlighted in blue)
 *   • Click 2 = sets end date (highlighted in green, range in between shaded)
 *   • Separate time dropdowns for start & end below the calendar
 *
 * Uses ReactDOM.createPortal → popup renders at document.body, no clipping.
 *
 * Props:
 *   label, startValue, endValue, onStartChange, onEndChange,
 *   required, disabled, error, helperText
 *
 * Also works as a single DateTimeInput replacement:
 *   value, onChange — when used for a single date
 */
const DateRangePicker = ({
    // Range mode (two values)
    label,
    startValue = '',
    endValue = '',
    onStartChange,
    onEndChange,
    // Single mode (one value, for backward compat with DateTimeInput)
    value,
    onChange,
    // Shared
    required,
    disabled,
    error,
    helperText,
    placeholder,
}) => {
    // Detect mode
    const isSingle = !onStartChange && !!onChange;

    // Normalise to range
    const effectiveStart = isSingle ? (value ?? '') : startValue;
    const effectiveEnd = isSingle ? '' : endValue;
    const emitStart = isSingle ? onChange : onStartChange;
    const emitEnd = isSingle ? null : onEndChange;

    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const popupRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const startParsed = parseISO(effectiveStart);
    const endParsed = parseISO(effectiveEnd);

    const now = new Date();
    const [viewYear, setViewYear] = useState(startParsed?.getFullYear() ?? now.getFullYear());
    const [viewMonth, setViewMonth] = useState(startParsed?.getMonth() ?? now.getMonth());

    // Hover state for range preview
    const [hoverDate, setHoverDate] = useState(null);

    // Time state
    const [startHour, setStartHour] = useState(startParsed?.getHours() ?? 0);
    const [startMin, setStartMin] = useState(startParsed?.getMinutes() ?? 0);
    const [endHour, setEndHour] = useState(endParsed?.getHours() ?? 23);
    const [endMin, setEndMin] = useState(endParsed?.getMinutes() ?? 59);

    // Sync time state when external value changes
    useEffect(() => {
        const p = parseISO(effectiveStart);
        if (p) { setStartHour(p.getHours()); setStartMin(p.getMinutes()); }
    }, [effectiveStart]);

    useEffect(() => {
        const p = parseISO(effectiveEnd);
        if (p) { setEndHour(p.getHours()); setEndMin(p.getMinutes()); }
    }, [effectiveEnd]);

    const openPopup = () => {
        if (disabled) return;
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
            setPopupPos({
                top: rect.bottom + window.scrollY + 4,
                left: Math.min(rect.left + window.scrollX, window.innerWidth - 320),
            });
        }
        setIsOpen(true);
    };

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (!triggerRef.current?.contains(e.target) && !popupRef.current?.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // ── Day click: click1=start, click2=end ──
    const handleDayClick = useCallback((date) => {
        if (!isSingle && !startParsed) {
            // No start yet → set start
            emitStart(formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0)));
            return;
        }
        if (!isSingle && startParsed && !endParsed) {
            // Start set, no end yet
            if (date < startParsed) {
                // Clicked before start → reset start to this date
                emitStart(formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0)));
                return;
            }
            emitEnd(formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMin, 0)));
            return;
        }
        if (!isSingle) {
            // Both set → reset and start over with this as new start
            emitEnd('');
            emitStart(formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0)));
            return;
        }
        // Single mode
        emitStart(formatISO(new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMin, 0)));
    }, [isSingle, startParsed, endParsed, startHour, startMin, endHour, endMin, emitStart, emitEnd]);

    // ── Time changes ──
    const handleStartTimeChange = useCallback((h, m) => {
        if (startParsed) {
            emitStart(formatISO(new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate(), h, m, 0)));
        }
    }, [startParsed, emitStart]);

    const handleEndTimeChange = useCallback((h, m) => {
        if (endParsed) {
            emitEnd(formatISO(new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate(), h, m, 0)));
        }
    }, [endParsed, emitEnd]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    // ── Day cell classifier ──
    const getDayStyle = (cell) => {
        const { date, inMonth } = cell;
        if (!inMonth) return 'text-slate-200 cursor-default';

        const rangeEnd = endParsed ?? (hoverDate && startParsed && !endParsed ? hoverDate : null);

        const isStart = startParsed && sameDay(date, startParsed);
        const isEnd = endParsed && sameDay(date, endParsed);
        const isToday = sameDay(date, now);

        const inRange = startParsed && rangeEnd &&
            date > startParsed && date < rangeEnd;

        if (isStart) return 'bg-blue-600 text-white font-bold rounded-l-full';
        if (isEnd) return 'bg-green-600 text-white font-bold rounded-r-full';
        if (inRange) return 'bg-blue-50 text-blue-700';
        if (isToday) return 'bg-slate-100 text-blue-600 font-semibold rounded-full hover:bg-blue-100 cursor-pointer';
        return 'text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer';
    };

    const calendarDays = getCalendarDays(viewYear, viewMonth);

    // ── Trigger label ──
    const triggerContent = isSingle
        ? (formatDisplay(effectiveStart) || placeholder || 'Select date & time...')
        : (
            <div className="flex flex-col gap-0.5 text-xs">
                <span className={effectiveStart ? 'text-slate-700' : 'text-slate-400'}>
                    <span className="font-semibold text-blue-600">▶ Start</span>
                    {effectiveStart ? `  ${formatDisplay(effectiveStart)}` : '  Not set'}
                </span>
                {!isSingle && (
                    <span className={effectiveEnd ? 'text-slate-700' : 'text-slate-400'}>
                        <span className="font-semibold text-green-600">◀ End</span>
                        {effectiveEnd ? `  ${formatDisplay(effectiveEnd)}` : '  Not set'}
                    </span>
                )}
            </div>
        );

    const popup = isOpen && ReactDOM.createPortal(
        <div
            ref={popupRef}
            style={{
                position: 'absolute',
                top: popupPos.top,
                left: popupPos.left,
                width: 300,
                zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center justify-between">
                <button type="button" onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                    <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                    {MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                    <ChevronRight size={15} />
                </button>
            </div>

            {/* Calendar grid */}
            <div className="p-3">
                {/* Instruction banner */}
                {!isSingle && (
                    <div className="mb-2 text-center text-[10px] text-slate-400 italic">
                        {!startParsed
                            ? 'Click to set start date'
                            : !endParsed
                                ? 'Now click end date'
                                : 'Click any date to reset range'}
                    </div>
                )}

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((cell, idx) => (
                        <button
                            key={idx}
                            type="button"
                            disabled={!cell.inMonth}
                            onClick={() => cell.inMonth && handleDayClick(cell.date)}
                            onMouseEnter={() => cell.inMonth && startParsed && !endParsed && setHoverDate(cell.date)}
                            onMouseLeave={() => setHoverDate(null)}
                            className={`h-8 w-full text-xs transition-colors ${getDayStyle(cell)}`}
                        >
                            {cell.day}
                        </button>
                    ))}
                </div>

                {/* Time pickers */}
                {(startParsed || endParsed) && (
                    <>
                        <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
                            {startParsed && (
                                <TimeRow
                                    label="Start"
                                    hour={startHour}
                                    minute={startMin}
                                    onHourChange={(h) => { setStartHour(h); handleStartTimeChange(h, startMin); }}
                                    onMinuteChange={(m) => { setStartMin(m); handleStartTimeChange(startHour, m); }}
                                />
                            )}
                            {!isSingle && endParsed && (
                                <TimeRow
                                    label="End"
                                    hour={endHour}
                                    minute={endMin}
                                    onHourChange={(h) => { setEndHour(h); handleEndTimeChange(h, endMin); }}
                                    onMinuteChange={(m) => { setEndMin(m); handleEndTimeChange(endHour, m); }}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Footer actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => {
                            emitStart('');
                            if (emitEnd) emitEnd('');
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <X size={11} /> Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <button
                ref={triggerRef}
                type="button"
                onClick={openPopup}
                disabled={disabled}
                className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-all
                    ${error
                        ? 'bg-red-50 border border-red-300'
                        : isOpen
                            ? 'bg-white border border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex-1">{triggerContent}</div>
                <Calendar size={14} className="text-slate-400 shrink-0" />
            </button>

            {popup}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};

export default DateRangePicker;
