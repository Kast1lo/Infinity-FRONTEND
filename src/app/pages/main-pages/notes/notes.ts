import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotesService } from '../../../services/notes';
import { LangService } from '../../../services/lang';
import { Note } from '../../../interfaces/note.model';
import { RichEditor } from '../../../common-ui/rich-editor/rich-editor';

@Component({
  selector: 'app-notes',
  imports: [FormsModule, DialogModule, ToastModule, RichEditor],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notes implements OnInit {
  private notesService = inject(NotesService);
  private messageService = inject(MessageService);
  readonly langService = inject(LangService);

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  t = computed(() => this.langService.t().pages.notes);

  notes   = this.notesService.notes;
  loading = this.notesService.loading;

  selectedId = signal<string | null>(null);
  selectedNote = computed(() => this.notes().find(n => n.id === this.selectedId()) ?? null);
  // Однокартиночный массив для @for — пересоздаёт редактор при смене заметки.
  selectedNoteArr = computed(() => { const n = this.selectedNote(); return n ? [n] : []; });

  editTitle = signal('');
  private pendingContent = '';
  saveState = signal<'idle' | 'saving' | 'saved'>('idle');
  private saveTimer: any;

  search = signal('');
  filteredNotes = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.notes();
    return this.notes().filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      n.content.replace(/<[^>]*>/g, ' ').toLowerCase().includes(q),
    );
  });

  confirmDelete = signal<Note | null>(null);

  // Функция загрузки картинки для редактора (bind к сервису).
  uploadImageFn = (file: File) => this.notesService.uploadImage(file);

  ngOnInit() {
    this.notesService.load().subscribe({
      next: (list) => { if (list?.length && !this.selectedId()) this.select(list[0]); },
      error: () => {},
    });
  }

  select(note: Note) {
    if (note.id === this.selectedId()) return;
    this.flushSave();
    this.selectedId.set(note.id);
    this.editTitle.set(note.title);
    this.pendingContent = note.content;
    this.saveState.set('idle');
  }

  createNote() {
    this.flushSave();
    this.notesService.create().subscribe({
      next: (note) => {
        this.selectedId.set(note.id);
        this.editTitle.set('');
        this.pendingContent = '';
        this.saveState.set('idle');
        // Сразу ставим курсор в заголовок, чтобы можно было печатать без клика.
        setTimeout(() => this.titleInputRef?.nativeElement.focus(), 0);
      },
      error: () => this.toast(this.t().createFailed),
    });
  }

  onTitleInput(value: string) {
    this.editTitle.set(value);
    this.scheduleSave();
  }

  onContentChange(html: string) {
    this.pendingContent = html;
    this.scheduleSave();
  }

  private scheduleSave() {
    this.saveState.set('saving');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 700);
  }

  // Немедленно сохранить, если есть отложенное (при переключении/выходе).
  private flushSave() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; this.save(); }
  }

  private save() {
    const id = this.selectedId();
    if (!id) return;
    this.notesService.update(id, { title: this.editTitle(), content: this.pendingContent }).subscribe({
      next: () => {
        this.saveState.set('saved');
        setTimeout(() => { if (this.saveState() === 'saved') this.saveState.set('idle'); }, 1500);
      },
      error: () => { this.saveState.set('idle'); this.toast(this.t().saveFailed); },
    });
  }

  togglePin(note: Note, event?: Event) {
    event?.stopPropagation();
    this.notesService.update(note.id, { isPinned: !note.isPinned }).subscribe({ error: () => {} });
  }

  askDelete(note: Note, event?: Event) {
    event?.stopPropagation();
    this.confirmDelete.set(note);
  }

  confirmDeleteNote() {
    const note = this.confirmDelete();
    if (!note) return;
    this.notesService.remove(note.id).subscribe({
      next: () => {
        if (this.selectedId() === note.id) {
          this.selectedId.set(null);
          this.editTitle.set('');
          this.pendingContent = '';
        }
        this.toast(this.t().deleted, true);
      },
      error: () => this.toast(this.t().deleteFailed),
    });
    this.confirmDelete.set(null);
  }

  // Текстовый сниппет из HTML-содержимого для карточки списка.
  snippet(note: Note): string {
    const text = note.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text.slice(0, 90);
  }

  hasImage(note: Note): boolean { return /<img/i.test(note.content); }

  formatDate(iso: string): string {
    const locale = this.langService.lang() === 'ru' ? 'ru-RU' : 'en-US';
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  private toast(detail: string, success = false) {
    this.messageService.add({ severity: 'secondary', summary: success ? this.t().toastDone : this.t().toastError, detail, key: 'nt' });
  }
}
