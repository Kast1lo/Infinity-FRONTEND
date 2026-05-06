import { Injectable, signal, computed } from '@angular/core';
import { TRANSLATIONS, Lang } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>((localStorage.getItem('lang') as Lang) || 'ru');

  readonly t = computed(() => TRANSLATIONS[this.lang()]);

  toggle() {
    const next: Lang = this.lang() === 'ru' ? 'en' : 'ru';
    this.lang.set(next);
    localStorage.setItem('lang', next);
  }
}
