/**
 * DragAndDropConfig — Widget Drag & Drop (Emulator Reorder) Feature Config
 *
 * Single source of truth for drag & drop behavior:
 *   - Which widgets can be reordered
 *   - Which widgets are pinned (fixed position)
 *   - In which page states drag is allowed
 *   - How priority is derived from canvas order
 *   - What backend mapping gets updated on deploy
 *
 * Wiki Reference: wiki/FEATURE-WIDGET-drag-and-drop.md
 */

// ── Page States Where Drag is Allowed ──
// Drag & drop is only active when the canvas is editable.
export const DRAG_ALLOWED_STATES = ['DRAFT', 'REJECTED'];

// ── Page States Where Drag is Blocked ──
// Canvas is locked — widget order cannot be changed.
export const DRAG_BLOCKED_STATES = ['PENDING', 'APPROVED'];

// ── Pinned Widgets ──
// These widget types are FIXED in position and cannot be reordered via drag.
// Primary and Secondary Mastheads always occupy a fixed slot on the homepage.
export const PINNED_WIDGET_TYPES = [
    'masthead_primary',                   // Primary Masthead — always fixed
    'masthead_secondary_category_hp',     // Secondary Masthead — always fixed
];

// ── Draggable Widget Types ──
// All other widget types support free reorder via drag & drop.
export const DRAGGABLE_WIDGET_TYPES = [
    'carousel',
    'category',
    'single_product_row',
    'single_product_row_v2',
    'multimedia_single_product_row',
    'multimedia_single_product_row_v2',
    'double_product_row',
    'double_product_row_v2',
    'multimedia_double_product_row',
    'multimedia_double_product_row_v2',
];

// ── Priority Rules ──
// How canvas position maps to backend priority.
export const PRIORITY_RULES = {
    // 1-indexed: the topmost widget in the emulator gets priority 1
    startIndex: 1,

    // Priority is sequential — no gaps between draggable widgets
    sequential: true,

    // Pinned widgets retain their original priority regardless of drag
    pinnedRetainPriority: true,
};

// ── Visual Feedback ──
// CSS/style values applied to a widget while it is being dragged.
export const DRAG_VISUAL = {
    opacity: 0.8,        // semi-transparent while held
    zIndex: 50,          // lifted above sibling widgets
    dragHandleIcon: '≡', // Unicode handle shown on left edge of each widget
};

// ── Backend Mapping updated on Deploy ──
// After Checker approves, the new priority order is written to this mapping.
export const DRAG_BACKEND = {
    pageLayoutSlug: 'GL-HP-global',          // Homepage page layout slug
    endpoint: '/api/app/update_layout_widget_mapping/',
    contentType: 'text/csv',
    csvHeaders: ['widget_slug_name', 'priority'],

    /**
     * Generate the priority mapping CSV from an ordered list of widget slugs.
     * Pinned widgets are excluded — their priority is managed separately.
     *
     * @param {string[]} orderedSlugs - Widget slugs in canvas top-to-bottom order
     * @returns {string} CSV string with headers
     */
    generateCSV(orderedSlugs) {
        const header = this.csvHeaders.join(',');
        const rows = orderedSlugs.map(
            (slug, index) => `${slug},${index + PRIORITY_RULES.startIndex}`
        );
        return [header, ...rows].join('\n');
    },
};

// ── Library ──
// Frontend drag & drop is powered by @dnd-kit
export const DRAG_LIBRARY = {
    name: '@dnd-kit/sortable',
    utilities: '@dnd-kit/utilities',
    hook: 'useSortable',
    cssHelper: 'CSS.Transform.toString',
};

// ── Component Map ──
// Which components implement each part of this feature
export const DRAG_COMPONENTS = {
    sortableWrapper: 'src/components/Widgets/SortableWidget.jsx',
    containerWithDndContext: 'src/components/Preview/PhoneFrame.jsx',
    stateManager: 'src/context/WidgetContext.jsx',
    moveWidgetFn: 'WidgetContext.moveWidget(dragIndex, hoverIndex)',
};
