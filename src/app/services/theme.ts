import { Injectable, signal, effect } from '@angular/core';
import { PrimeNG } from 'primeng/config';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'infinity-theme';

  readonly theme = signal<Theme>(this.getSavedTheme());

  constructor(private primeng: PrimeNG) {
    // Применяем сразу при старте — до рендера
    this.applyTheme(this.theme());

    // И при каждом изменении
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggle() {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;

    // Применяем на document.documentElement (html) — это работает с Shadow DOM компонентов
    if (theme === 'dark') {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }

    // Переключаем цветовую схему PrimeNG
    this.primeng.theme.update(t => ({
      ...t,
      options: {
        ...t?.options,
        darkModeSelector: theme === 'dark' ? ':root' : '.dark-theme-never',
      }
    }));

    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // Определяем по системной теме
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}