import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

const STORAGE_KEY    = 'infinity_bg_current';
const HISTORY_KEY    = 'infinity_bg_history';
const MAX_HISTORY    = 6;
const AUTH_ROUTES    = ['/profile', '/edit', '/infinity-life', '/file-system'];

@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private router = inject(Router);

  readonly backgroundUrl = signal<string>(this.load(STORAGE_KEY));
  readonly history        = signal<string[]>(this.loadHistory());

  private styleEl: HTMLStyleElement;
  private isAuthRoute = false;

  constructor() {
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'infinity-bg-style';
    document.head.appendChild(this.styleEl);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isAuthRoute = AUTH_ROUTES.some(r => e.urlAfterRedirects.startsWith(r));
      this.applyBackground(this.backgroundUrl());
    });

    this.isAuthRoute = AUTH_ROUTES.some(r => this.router.url.startsWith(r));
    this.applyBackground(this.backgroundUrl());

    effect(() => {
      const url = this.backgroundUrl();
      this.save(STORAGE_KEY, url);
      this.applyBackground(url);
    });
  }

  setBackground(url: string) {
    this.backgroundUrl.set(url);
    const hist = this.history().filter(h => h !== url);
    const newHist = [url, ...hist].slice(0, MAX_HISTORY);
    this.history.set(newHist);
    this.saveHistory(newHist);
  }

  setCustom(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.setBackground(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  removeFromHistory(url: string) {
    const newHist = this.history().filter(h => h !== url);
    this.history.set(newHist);
    this.saveHistory(newHist);
    if (this.backgroundUrl() === url) {
      this.backgroundUrl.set(newHist[0] ?? '');
    }
  }

  clearBackground() {
    this.backgroundUrl.set('');
  }

  private applyBackground(url: string) {
    if (url && this.isAuthRoute) {
      document.body.classList.add('has-bg');
      this.styleEl.textContent = `
        body {
          background-image: url('${url}') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-repeat: no-repeat !important;
          background-color: #0a0a0a !important;
        }
      `;
    } else {
      document.body.classList.remove('has-bg');
      this.styleEl.textContent = `
        body {
          background-color: rgba(0,0,0,0.6);
          background-image: radial-gradient(rgba(255,255,255,0.155) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `;
    }
  }

  private load(key: string): string {
    try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
  }

  private save(key: string, val: string) {
    try { localStorage.setItem(key, val); } catch {}
  }

  private loadHistory(): string[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveHistory(hist: string[]) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch {}
  }
}