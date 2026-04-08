import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, ButtonModule, RippleModule, RouterLink],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit, OnDestroy {
  imagePath = 'infinityLogo.svg';
  navScrolled = false;
  private observer!: IntersectionObserver;
 
  features = [
    {
      icon: 'pi pi-th-large',
      title: 'Kanban-доска',
      desc: 'Гибкое управление задачами с кастомными колонками, чекбоксами и drag-and-drop сортировкой.'
    },
    {
      icon: 'pi pi-folder-open',
      title: 'Файловое хранилище',
      desc: 'Загружайте, организуйте и делитесь файлами как в Google Drive прямо внутри платформы.'
    },
    {
      icon: 'pi pi-user',
      title: 'Профиль пользователя',
      desc: 'Персонализация аватара, логина и email. Полный контроль над своим аккаунтом.'
    },
    {
      icon: 'pi pi-moon',
      title: 'Тёмный дизайн',
      desc: 'Минималистичный тёмный интерфейс, разработанный для долгой работы без усталости глаз.'
    },
    {
      icon: 'pi pi-share-alt',
      title: 'Пересылка файлов',
      desc: 'Отправляйте файлы коллегам напрямую из хранилища — быстро и без лишних шагов.'
    },
    {
      icon: 'pi pi-lock',
      title: 'Безопасность',
      desc: 'Email-подтверждение, скрытый ввод пароля и надёжная защита данных пользователей.'
    }
  ];
 
  stats = [
    { num: '2', label: 'Модуля в одном' },
    { num: '∞', label: 'Задач и файлов' },
    { num: '0', label: 'Лишних вкладок' },
    { num: '1', label: 'Рабочее пространство' }
  ];
 
  kanbanCols = [
    {
      title: 'infinity',
      tasks: [{ label: 'Backend', done: true }]
    },
    {
      title: 'В процессе',
      tasks: [{ label: 'Отчёт', done: false }, { label: 'Frontend', done: false }]
    }
  ];
 
  folders = ['MyArts', 'Projects'];
 
  thumbColors = [
    ['#1a1a2e', '#16213e'],
    ['#0d0d1a', '#1a0a2e'],
    ['#1a0a0a', '#2e0a0a'],
    ['#0a1a0a', '#0a2e0a'],
    ['#1a1000', '#2e1a00'],
    ['#001a1a', '#002e2e']
  ];
 
  @HostListener('window:scroll')
  onScroll() {
    this.navScrolled = window.scrollY > 40;
  }
 
  ngOnInit() {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.12 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => this.observer.observe(el));
    }, 100);
  }
 
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
