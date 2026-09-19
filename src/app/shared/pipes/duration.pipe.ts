import { Pipe, PipeTransform } from '@angular/core';

/*
 * Formata duração em minutos para exibição amigável (ex.: 150 → "2h 30min").
 */
@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined || minutes <= 0) {
      return '';
    }

    const totalMinutes = Math.round(minutes);

    if (totalMinutes < 60) {
      return `${totalMinutes}min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainder = totalMinutes % 60;

    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}min`;
  }
}