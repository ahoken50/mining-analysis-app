import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    details?: string; // Optional technical details
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private counter = 0;

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000, details?: string) {
        const id = this.counter++;
        console.log(`[ToastService] Showing ${type} toast: ${message}`, details ? `Details: ${details}` : '');
        this.toasts.update(current => [...current, { id, message, type, details }]);

        // Auto remove after specified duration (0 = no auto-dismiss)
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
    }

    success(message: string, duration: number = 3000) {
        this.show(message, 'success', duration);
    }

    error(message: string, details?: string, duration: number = 5000) {
        this.show(message, 'error', duration, details);
    }

    warning(message: string, duration: number = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message: string, duration: number = 3000) {
        this.show(message, 'info', duration);
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
