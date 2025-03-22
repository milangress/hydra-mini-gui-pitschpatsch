import { Logger } from '../../utils/logger';
import { DragEvent, TouchDragEvent, DragState } from './types/draggable-pane';

/**
 * Adds dragging functionality to the Tweakpane container
 */
export class DraggablePane {
    private container: HTMLElement;
    private dragBar: HTMLElement | null;
    private isDragging: boolean;
    private startX: number;
    private startY: number;
    private initialX: number;
    private initialY: number;

    constructor(container: HTMLElement) {
        this.container = container;
        this.dragBar = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.initialX = 0;
        this.initialY = 0;

        // Bind methods
        this.onDragStart = this.onDragStart.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        
        // Wait a bit for Tweakpane to be initialized
        setTimeout(() => this.init(), 1000);
    }

    /**
     * Initialize draggable functionality
     */
    private init(): void {
        // Try different selectors to find the drag handle
        const selectors = [
            '.tp-rotv_t',
            '.hydra-mini-gui>div>button',
            // Add more selectors if needed
        ];

        for (const selector of selectors) {
            this.dragBar = this.container.querySelector(selector);
            if (this.dragBar) {
                Logger.log('DraggablePane: Found drag handle using selector:', selector);
                break;
            }
        }

        if (!this.dragBar) {
            Logger.error('DraggablePane: Could not find any suitable drag handle. DOM structure:', this.container.innerHTML);
            // Try again after a short delay
            setTimeout(() => this.init(), 500);
            return;
        }

        // Make the drag handle look draggable
        this.dragBar.style.cursor = 'grab';
        this.dragBar.classList.add('draggable');
        
        // Add event listeners
        this.dragBar.addEventListener('mousedown', this.onDragStart);
        this.dragBar.addEventListener('touchstart', this.onDragStart, { passive: false });
    }

    /**
     * Handle drag start
     */
    private onDragStart(e: DragEvent | TouchDragEvent): void {
        e.preventDefault();
        this.isDragging = true;
        
        if (!this.dragBar) return;
        
        // Change cursor style
        this.dragBar.style.cursor = 'grabbing';
        
        // Get initial positions
        if (e instanceof MouseEvent) {
            this.startX = e.clientX;
            this.startY = e.clientY;
        } else if (e instanceof TouchEvent) {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
        }

        // Get current container position
        const rect = this.container.getBoundingClientRect();
        
        // Remove right position and set initial left position
        this.container.style.removeProperty('right');
        this.initialX = rect.left;
        this.initialY = rect.top;

        Logger.log('DraggablePane: Drag start', {
            startX: this.startX,
            startY: this.startY,
            initialX: this.initialX,
            initialY: this.initialY
        });

        // Add move and end event listeners
        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('touchmove', this.onDrag, { passive: false });
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchend', this.onDragEnd);
    }

    /**
     * Handle drag movement
     */
    private onDrag(e: DragEvent | TouchDragEvent): void {
        if (!this.isDragging) return;
        e.preventDefault();

        let currentX: number;
        let currentY: number;

        if (e instanceof MouseEvent) {
            currentX = e.clientX;
            currentY = e.clientY;
        } else if (e instanceof TouchEvent) {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            return;
        }

        // Calculate new position
        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY;
        
        // Update container position
        const newX = this.initialX + deltaX;
        const newY = this.initialY + deltaY;

        // Keep the pane within the viewport
        const maxX = window.innerWidth - this.container.offsetWidth;
        const maxY = window.innerHeight - this.container.offsetHeight;
        
        const finalX = Math.max(0, Math.min(maxX, newX));
        const finalY = Math.max(0, Math.min(maxY, newY));

        Logger.log('DraggablePane: Dragging', {
            deltaX,
            deltaY,
            newX: finalX,
            newY: finalY
        });
        
        this.container.style.left = `${finalX}px`;
        this.container.style.top = `${finalY}px`;
    }

    /**
     * Handle drag end
     */
    private onDragEnd(): void {
        if (!this.isDragging || !this.dragBar) return;
        this.isDragging = false;
        
        // Restore cursor style
        this.dragBar.style.cursor = 'grab';
        
        Logger.log('DraggablePane: Drag end', {
            finalX: this.container.style.left,
            finalY: this.container.style.top
        });

        // Remove move and end event listeners
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('touchmove', this.onDrag);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchend', this.onDragEnd);
    }

    /**
     * Clean up event listeners
     */
    cleanup(): void {
        if (this.dragBar) {
            this.dragBar.removeEventListener('mousedown', this.onDragStart);
            this.dragBar.removeEventListener('touchstart', this.onDragStart);
            this.dragBar.classList.remove('draggable');
        }
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('touchmove', this.onDrag);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchend', this.onDragEnd);
    }
} 