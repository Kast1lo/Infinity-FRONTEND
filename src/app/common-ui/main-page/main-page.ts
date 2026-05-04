import { Component, HostListener, OnDestroy, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../services/theme';

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
  isDark = computed(() => this.themeService.theme() === 'dark');

  // Логотип меняется в зависимости от темы
  imagePath = computed(() =>
    this.isDark() ? 'infinityLogo.svg' : 'infinity.svg'
  );

  features = [
    { icon: 'pi pi-th-large',    title: 'Infinity-life',         desc: 'Гибкое управление задачами с кастомными колонками, чекбоксами и drag-and-drop сортировкой.' },
    { icon: 'pi pi-folder-open', title: 'Файловое хранилище',   desc: 'Загружайте, организуйте и делитесь файлами как в Google Drive прямо внутри платформы.' },
    { icon: 'pi pi-user',        title: 'Профиль пользователя', desc: 'Персонализация аватара, логина и email. Полный контроль над своим аккаунтом.' },
    { icon: 'pi pi-sun',         title: 'Светлая и тёмная тема', desc: 'Минималистичный интерфейс в двух вариантах — выбирайте то, что удобнее для ваших глаз.' },
    { icon: 'pi pi-share-alt',   title: 'Пересылка файлов',     desc: 'Отправляйте файлы коллегам напрямую из хранилища — быстро и без лишних шагов.' },
    { icon: 'pi pi-lock',        title: 'Безопасность',         desc: 'Email-подтверждение, скрытый ввод пароля и надёжная защита данных пользователей.' },
  ];

  stats = [
    { num: '2', label: 'Модуля в одном' },
    { num: '∞', label: 'Задач и файлов' },
    { num: '0', label: 'Лишних вкладок' },
    { num: '1', label: 'Рабочее пространство' },
  ];

  kanbanCols = [
    { title: 'Готово',     tasks: [{ label: 'Backend', done: true }] },
    { title: 'В процессе', tasks: [{ label: 'Отчёт', done: false }, { label: 'Frontend', done: false }] },
  ];

  folders = ['MyArts', 'Projects'];

  trustItems = [
    { icon: 'pi pi-bolt',         label: 'Мгновенная синхронизация' },
    { icon: 'pi pi-shield',       label: 'Шифрование AES-256' },
    { icon: 'pi pi-server',       label: 'Серверы в РФ' },
    { icon: 'pi pi-clock',        label: 'Резервные копии 24/7' },
    { icon: 'pi pi-globe',        label: 'Доступ из любой точки' },
    { icon: 'pi pi-mobile',       label: 'Работает на всех устройствах' },
  ];

  faqs = [
    {
      q: 'Можно ли использовать Infinity бесплатно?',
      a: 'Да. У нас есть тариф Spark — 7 дней полного доступа. После окончания пробного периода данные заморожены ещё 7 дней, затем удаляются без оформления подписки.',
    },
    {
      q: 'Где хранятся мои файлы и насколько они защищены?',
      a: 'Файлы хранятся на серверах в РФ с шифрованием AES-256. Доступ только через ваш аккаунт, передача данных идёт по HTTPS.',
    },
    {
      q: 'Что произойдёт, если я отменю подписку?',
      a: 'Все ваши задачи и файлы остаются доступны для скачивания в течение 30 дней. После этого аккаунт переходит в режим «только чтение».',
    },
    {
      q: 'Можно ли работать в команде?',
      a: 'Совместная работа над досками и общие папки находятся в активной разработке — выйдут в ближайших обновлениях. Тариф Eternal даёт ранний доступ ко всем новым функциям.',
    },
    {
      q: 'Подходит ли Infinity для мобильных устройств?',
      a: 'Да, веб-интерфейс полностью адаптирован под планшеты и смартфоны. Нативные приложения для iOS и Android в планах.',
    },
    {
      q: 'Чем Infinity отличается от Notion или Trello?',
      a: 'Мы объединили Kanban-доски и полноценное файловое хранилище в одном минималистичном интерфейсе. Никаких лишних функций — только то, что нужно для продуктивной работы.',
    },
  ];

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