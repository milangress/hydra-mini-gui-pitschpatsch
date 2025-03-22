export interface DragPosition {
    x: number;
    y: number;
}

export interface DragEvent extends MouseEvent {
    clientX: number;
    clientY: number;
}

export interface TouchDragEvent extends TouchEvent {
    touches: TouchList;
}

export interface DragState {
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    isDragging: boolean;
} 