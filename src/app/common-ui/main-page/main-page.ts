import { Component, HostListener, OnDestroy, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, ButtonModule, RippleModule, RouterLink, TooltipModule],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit, OnDestroy {
  navScrolled = false;
  private observer!: IntersectionObserver;

  readonly themeService = inject(ThemeService);
  readonly langService  = inject(LangService);

  isDark = computed(() => this.themeService.theme() === 'dark');

  imagePath = computed(() =>
    this.isDark() ? 'infinityLogo.svg' : 'infinity.svg'
  );

  readonly t        = computed(() => this.langService.t());
  readonly features = computed(() => this.langService.t().features);
  readonly stats    = computed(() => this.langService.t().stats);
  readonly trust    = computed(() => this.langService.t().trust);
  readonly faqs     = computed(() => this.langService.t().faqs);

  openFaq: number | null = 0;
  toggleFaq(i: number) { this.openFaq = this.openFaq === i ? null : i; }

  @HostListener('window:scroll')
  onScroll() { this.navScrolled = window.scrollY > 140; }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit() {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => this.observer.observe(el));
    }, 100);
  }

  ngOnDestroy() { this.observer?.disconnect(); }
}
