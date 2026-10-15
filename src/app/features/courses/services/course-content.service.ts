import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';

import { Chapter, CourseContent, CourseContentChapter, CourseContentLesson, CourseOutline, Lesson } from '../models/course.model';

/*
 * O corpo das aulas (content/imagem/anexos) não vem mais da API — vem direto
 * daqui, como um asset estático servido pelo hosting (nunca passa pela
 * function do backend nem pelo Firestore). Isso é o que elimina a espera ao
 * trocar de capítulo: o curso inteiro fica em cache em memória depois do
 * primeiro fetch, e trocar de capítulo dentro do mesmo curso vira leitura
 * local, sem nenhuma chamada de rede.
 *
 * O arquivo traz também o outline do curso (título e metadado dos capítulos),
 * então a página do capítulo monta a tela inteira a partir daqui — não existe
 * nenhuma requisição à API no caminho crítico da leitura.
 *
 * Os arquivos são gerados a partir do catálogo de seed — ver
 * backend/src/scripts/build-course-content-assets.js (roda sozinho antes de
 * `npm run build`/`npm start`).
 */
const CONTENT_BASE_PATH = '/assets/courses/content';

@Injectable({ providedIn: 'root' })
export class CourseContentService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<CourseContent>>();

  /*
   * Busca (ou reaproveita do cache) o conteúdo completo do curso.
   *
   * O erro NÃO pode ser engolido antes do shareReplay: `catchError(() => of(null))`
   * transformaria a falha num valor, e valor é cacheado junto — uma única
   * request caída deixaria o curso inteiro sem conteúdo (e sem nova tentativa)
   * pelo resto da sessão. Aqui a entrada é removida do cache e o erro segue
   * para quem chamou, que pode exibir o erro e oferecer nova tentativa.
   */
  getForCourse(courseSlug: string): Observable<CourseContent> {
    if (!courseSlug) return throwError(() => new Error('curso invalido'));

    const cached = this.cache.get(courseSlug);
    if (cached) return cached;

    const request$ = this.http.get<CourseContent>(`${CONTENT_BASE_PATH}/${courseSlug}.json`).pipe(
      catchError((error: unknown) => {
        this.cache.delete(courseSlug);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(courseSlug, request$);
    return request$;
  }

  /*
   * Título do curso e metadado dos capítulos (id/courseId/order) para a
   * sidebar, o hero e o prev/next — tudo sem `lessons`, que a página carrega à
   * parte. Vem do mesmo asset já em cache: não é uma requisição extra.
   */
  getCourseOutline(courseSlug: string): Observable<CourseOutline> {
    return this.getForCourse(courseSlug).pipe(
      map((content) => ({
        title: content?.course?.title ?? '',
        chapters: Object.entries(content?.chapters ?? {})
          .map(([slug, chapter], index) => this.toChapter(courseSlug, slug, chapter, index))
          .sort((a, b) => a.order - b.order),
      })),
    );
  }

  /*
   * Aulas de um capítulo já prontas para o template (`app-article`), com
   * `id`/`chapterId` recalculados no mesmo esquema do backend
   * (`curso:capitulo:indice` — índice na lista, não o campo `order`), o que
   * mantém compatibilidade com qualquer progresso já salvo.
   *
   * Devolve `null` (e não `[]`) quando o capítulo não existe no asset. São
   * coisas diferentes para quem lê: `[]` é um capítulo publicado sem aula
   * ("em preparação"), `null` é um capítulo que existe no Firestore mas não
   * foi publicado como asset (JSON de seed desatualizado, `npm run
   * content:build` não rodado, ou curso despublicado). Sem essa distinção o
   * leitor cai no texto errado e não há como reagir.
   */
  getChapterLessons(courseSlug: string, chapterSlug: string): Observable<Lesson[] | null> {
    const chapterId = `${courseSlug}:${chapterSlug}`;

    return this.getForCourse(courseSlug).pipe(
      map((content) => {
        const lessons = content?.chapters?.[chapterSlug]?.lessons;
        if (!lessons) return null;

        return lessons
          .map((lesson, index) => this.toLesson(chapterId, lesson, index))
          .sort((a, b) => a.order - b.order);
      }),
    );
  }

  /*
   * `id` e `courseId` são recalculados aqui, nunca guardados no asset: é o
   * mesmo esquema do backend (`curso:capitulo`), e é o que amarra a página ao
   * progresso já salvo no Firestore.
   */
  private toChapter(
    courseSlug: string,
    chapterSlug: string,
    chapter: CourseContentChapter,
    index: number,
  ): Chapter {
    return {
      id: `${courseSlug}:${chapterSlug}`,
      courseId: courseSlug,
      title: chapter.title,
      slug: chapterSlug,
      description: chapter.description,
      order: chapter.order ?? index + 1,
      lessonCount: chapter.lessons?.length ?? 0,
      lessons: [],
    };
  }

  private toLesson(chapterId: string, lesson: CourseContentLesson, index: number): Lesson {
    return {
      id: `${chapterId}:${index}`,
      chapterId,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      attachments: lesson.attachments,
      image: lesson.image,
      order: lesson.order ?? index + 1,
    };
  }
}
