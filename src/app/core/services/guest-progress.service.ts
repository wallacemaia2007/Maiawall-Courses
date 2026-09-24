import { Injectable, signal } from '@angular/core';

/*
 * Progresso de capítulos para visitantes que ainda não criaram cadastro.
 * Mantém o estado apenas no localStorage do navegador; quando o usuário
 * autentica, o progresso passa a ser registrado no backend (LearningService).
 */

type GuestChapterRecord = Record<string, string>;
type GuestCourseRecord = Record<string, GuestChapterRecord>;

const STORAGE_KEY = 'maiawall.guest-progress';

@Injectable({
  providedIn: 'root',
})
export class GuestProgressService {
  private readonly progressSignal = signal<GuestCourseRecord>(this.load());

  readonly value = this.progressSignal.asReadonly();

  isChapterComplete(courseId: string, chapterId: string): boolean {
    return this.progressSignal()[courseId]?.[chapterId] !== undefined;
  }

  markChapterComplete(courseId: string, chapterId: string): void {
    this.progressSignal.update((current) => {
      const course = current[courseId] ?? {};
      const next: GuestCourseRecord = {
        ...current,
        [courseId]: {
          ...course,
          [chapterId]: new Date().toISOString(),
        },
      };
      this.persist(next);
      return next;
    });
  }

  private load(): GuestCourseRecord {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as GuestCourseRecord) : {};
    } catch {
      return {};
    }
  }

  private persist(records: GuestCourseRecord): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      /* localStorage indisponível ou cheio — ignora silenciosamente. */
    }
  }
}