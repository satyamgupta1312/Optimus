import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WidgetRenderer from './WidgetRenderer';

const SortableWidget = ({ widget, isSelected, onClick, deleteWidget }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto', // Bring dragging item to front
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <WidgetRenderer
                widget={widget}
                isSelected={isSelected}
                onClick={onClick}
                deleteWidget={deleteWidget}
            />
        </div>
    );
};

export default SortableWidget;
