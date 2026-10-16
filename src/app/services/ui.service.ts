// src/app/services/ui.service.ts
import { Injectable, signal, computed } from '@angular/core';

/**
 * Estado de UI do layout (sidebar, tema).
 * Migrado de BehaviorSubject para signals — idiomático em Angular 22.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly _sidebarVisible = signal(false);
  private readonly _darkMode = signal(true);

  /** Sidebar aberta (mobile). */
  readonly sidebarVisible = this._sidebarVisible.asReadonly();

  /** Tema escuro ativo — controla a classe `dark-theme` no <body>. */
  readonly darkMode = this._darkMode.asReadonly();

  /** Rótulo do tema para exibir no botão. */
  readonly themeLabel = computed(() => (this._darkMode() ? 'dark_mode' : 'light_mode'));

  toggleSidebar(): void {
    this._sidebarVisible.update(v => !v);
  }

  closeSidebar(): void {
    this._sidebarVisible.set(false);
  }

  toggleTheme(): void {
    this._darkMode.update(v => !v);
    this.applyTheme();
  }

  /** Aplica a classe de tema no <body>, consumido por `darkModeSelector`. */
  applyTheme(): void {
    const body = document.body;
    body.classList.toggle('dark-theme', this._darkMode());
    body.classList.toggle('light-theme', !this._darkMode());
  }
}
