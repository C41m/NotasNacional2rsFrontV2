// src/app/services/toast.service.ts
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Wrapper fino sobre o MessageService do PrimeNG.
 * Mantém a assinatura usada no projeto antigo (`success(msg, title)`).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messageService = inject(MessageService);

  success(message: string, title = 'Sucesso', life = 4000): void {
    this.messageService.add({ severity: 'success', summary: title, detail: message, life });
  }

  error(message: string, title = 'Erro', life = 6000): void {
    this.messageService.add({ severity: 'error', summary: title, detail: message, life });
  }

  warn(message: string, title = 'Atenção', life = 5000): void {
    this.messageService.add({ severity: 'warn', summary: title, detail: message, life });
  }

  info(message: string, title = 'Informação', life = 3500): void {
    this.messageService.add({ severity: 'info', summary: title, detail: message, life });
  }
}
