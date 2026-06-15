import { DecodeURIComponentPipe } from './decode-uri.pipe';

describe('DecodeURIComponentPipe', () => {
  const pipe = new DecodeURIComponentPipe();

  it('декодирует процент-кодированную строку', () => {
    expect(pipe.transform('%D0%9F%D0%B0%D0%BF%D0%BA%D0%B0')).toBe('Папка');
  });

  it('декодирует пробелы (%20) и спецсимволы', () => {
    expect(pipe.transform('my%20file%20(1).txt')).toBe('my file (1).txt');
  });

  it('возвращает исходную строку без изменений, если декодировать нечего', () => {
    expect(pipe.transform('plain-name.png')).toBe('plain-name.png');
  });

  it('возвращает исходную строку при некорректной последовательности (без выброса)', () => {
    // '%E0%A4%A' — обрывок, decodeURIComponent бросит URIError
    expect(pipe.transform('%E0%A4%A')).toBe('%E0%A4%A');
  });
});
