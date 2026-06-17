import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

/**
 * Лёгкий rich-text редактор на contenteditable + execCommand: жирный, курсив,
 * подчёркивание, зачёркивание, заголовки H1–H3, списки, цитата, ссылка, картинки.
 * Без внешних зависимостей — полностью кастомный стиль под бренд.
 *
 * value — стартовый HTML (ставится один раз при инициализации); изменения
 * летят через (valueChange). Загрузка картинок — через переданную функцию
 * uploadImage(file) => Promise<url>.
 */
@Component({
  selector: 'app-rich-editor',
  standalone: true,
  templateUrl: './rich-editor.html',
  styleUrl: './rich-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichEditor implements AfterViewInit {
  @Input() value = '';
  @Input() placeholder = '';
  @Input() uploadImage?: (file: File) => Promise<string>;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInputRef!: ElementRef<HTMLInputElement>;

  private el = inject(ElementRef);

  uploading = false;

  ngAfterViewInit() {
    this.editorRef.nativeElement.innerHTML = this.value ?? '';
  }

  // Принудительно перезаписать содержимое (например, при переключении заметки).
  setContent(html: string) {
    this.value = html ?? '';
    if (this.editorRef) this.editorRef.nativeElement.innerHTML = this.value;
  }

  private focus() { this.editorRef.nativeElement.focus(); }

  exec(cmd: string, arg?: string) {
    this.focus();
    document.execCommand(cmd, false, arg);
    this.emit();
  }

  heading(tag: string) {
    this.focus();
    document.execCommand('formatBlock', false, `<${tag}>`);
    this.emit();
  }

  createLink() {
    const url = window.prompt('Ссылка (URL):', 'https://');
    if (!url) return;
    this.exec('createLink', url);
  }

  onImageBtn() { this.imageInputRef.nativeElement.click(); }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.uploadImage) return;
    this.uploading = true;
    try {
      const url = await this.uploadImage(file);
      this.focus();
      document.execCommand('insertImage', false, url);
      this.emit();
    } catch {
      /* ошибку покажет родитель через тост */
    } finally {
      this.uploading = false;
    }
  }

  onInput() { this.emit(); }

  private emit() {
    this.valueChange.emit(this.editorRef.nativeElement.innerHTML);
  }

  // Пустой ли редактор (для плейсхолдера).
  get isEmpty(): boolean {
    const html = this.editorRef?.nativeElement.innerHTML ?? this.value;
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    return text.length === 0 && !/<img|<hr/i.test(html);
  }
}
