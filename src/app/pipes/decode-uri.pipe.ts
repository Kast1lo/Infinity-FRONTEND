import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'decodeURIComponent'
})
export class DecodeURIComponentPipe implements PipeTransform {
  transform(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }
}