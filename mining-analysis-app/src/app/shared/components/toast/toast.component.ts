import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastService.toasts()" 
           class="toast" 
           [ngClass]="toast.type"
           (click)="toastService.remove(toast.id)">
        {{ toast.message }}
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toast {
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      min-width: 250px;
    }
    .success { background-color: #2ecc71; }
    .error { background-color: #e74c3c; }
    .info { background-color: #3498db; }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastComponent {
    toastService = inject(ToastService);
}
