// src/app/services/error.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

/**
 * Intercepta erros HTTP e:
 *  1. normaliza a mensagem (FastAPI `detail` pode ser string ou array de validação);
 *  2. emite um toast por severidade apropriada;
 *  3. re-emite o erro para que o chamador ainda possa reagir.
 *
 * Silencia o log duplicado: cada componente não precisa mais `console.error`.
 */
const API_KEY = '12345678';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  // O header é exigido pelos endpoints de auditoria/documentos (Header(...) no FastAPI).
  const request = req.headers.has('X-API-Key')
    ? req
    : req.clone({ setHeaders: { 'X-API-Key': API_KEY } });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const detail = extractMessage(error);

      let severity: 'error' | 'warn' | 'info' = 'error';
      let summary = 'Erro';

      if (error.status === 0) {
        severity = 'warn';
        summary = 'Servidor indisponível';
      } else if (error.status === 401 || error.status === 403) {
        summary = 'Não autorizado';
      } else if (error.status === 404) {
        summary = 'Não encontrado';
      } else if (error.status === 422) {
        summary = 'Dados inválidos';
      } else if (error.status >= 500) {
        summary = 'Erro do servidor';
      }

      messageService.add({
        severity,
        summary,
        detail,
        life: severity === 'error' ? 6000 : 4000
      });

      return throwError(() => new Error(detail));
    })
  );
};

/** Converte `HttpErrorResponse` numa mensagem legível em pt-BR. */
function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as unknown;

  // FastAPI 422 → { detail: [{ msg, loc }] }
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;

    if (typeof detail === 'string' && detail.trim()) return detail;

    if (Array.isArray(detail)) {
      const messages = detail
        .map(item => {
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: unknown }).msg);
          }
          return String(item);
        })
        .filter(Boolean);
      if (messages.length) return messages.join(' • ');
    }
  }

  if (typeof body === 'string' && body.trim()) return body;
  if (error.status === 0) return 'Não foi possível conectar ao servidor.';

  return error.statusText || 'Erro inesperado.';
}
