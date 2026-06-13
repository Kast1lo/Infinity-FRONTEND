import { Component, HostListener, OnDestroy, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../services/theme';
import { LangService } from '../../services/lang';
import { AuthService } from '../../services/auth';

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
  private readonly authService = inject(AuthService);

  isDark = computed(() => this.themeService.theme() === 'dark');

  imagePath = computed(() =>
    this.isDark() ? 'infinityLogo.svg' : 'infinity.svg'
  );

  readonly t        = computed(() => this.langService.t());
  readonly features = computed(() => this.langService.t().features);
  readonly trust    = computed(() => this.langService.t().trust);
  readonly faqs     = computed(() => this.langService.t().faqs);

  openFaq: number | null = 0;
  toggleFaq(i: number) { this.openFaq = this.openFaq === i ? null : i; }

  menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu()  { this.menuOpen = false; }

  @HostListener('window:scroll')
  onScroll() { this.navScrolled = window.scrollY > 140; }

  scrollTo(id: string) {
    this.closeMenu();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit() {
    // Запомненного пользователя с живой сессией сразу уводим в профиль.
    this.authService.autoRedirectIfRemembered();

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
