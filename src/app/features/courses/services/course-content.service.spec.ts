import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Chapter, Lesson } from '../models/course.model';
import { CourseContentService } from './course-content.service';
import { CourseService } from './course.service';

const SLUG = 'apis-metodos-http-e-json';
const CHAPTER_A = 'fundamentos-da-comunicacao-web';
const CHAPTER_B = 'protocolo-http-e-mensagens';
const CHAPTER_VAZIO = 'capitulo-publicado-sem-aulas';

const CONTENT_URL = `/assets/courses/content/${SLUG}.json`;
const DETAIL_URL = `/api/courses/slug/${SLUG}`;

const CONTENT_PAYLOAD = {
  course: { slug: SLUG, title: 'APIs, metodos HTTP e JSON' },
  chapters: {
    [CHAPTER_A]: {
      title: 'Fundamentos da comunicacao web',
      description: 'Como o navegador conversa com o servidor',
      order: 1,
      lessons: [
        { title: 'Aula 1', type: 'article', content: '<p>1</p>', order: 1 },
        { title: 'Aula 2', type: 'code', content: '```js\nconsole.log(1)\n```', order: 2 },
      ],
    },
    [CHAPTER_B]: {
      title: 'Protocolo HTTP',
      order: 2,
      lessons: [{ title: 'Aula 3', type: 'article', content: '<p>3</p>', order: 1 }],
    },
    [CHAPTER_VAZIO]: { title: 'Sem aulas', order: 3, lessons: [] },
  },
};

const DETAIL_PAYLOAD = {
  success: true,
  message: 'OK',
  data: {
    id: SLUG,
    title: 'APIs, metodos HTTP e JSON',
    slug: SLUG,
    chapters: [
      {
        id: `${SLUG}:${CHAPTER_A}`,
        courseId: SLUG,
        title: 'Cap A',
        slug: CHAPTER_A,
        order: 1,
        lessons: [],
      },
      {
        id: `${SLUG}:${CHAPTER_B}`,
        courseId: SLUG,
        title: 'Cap B',
        slug: CHAPTER_B,
        order: 2,
        lessons: [],
      },
    ],
  },
};

function failRequest(request: ReturnType<HttpTestingController['expectOne']>): void {
  request.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
}

describe('conteúdo estático dos cursos', () => {
  let http: HttpTestingController;
  let content: CourseContentService;
  let courses: CourseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    content = TestBed.inject(CourseContentService);
    courses = TestBed.inject(CourseService);
  });

  afterEach(() => http.verify());

  it('busca o JSON do curso uma única vez e reusa em todos os capítulos', () => {
    let capituloA: Lesson[] | null = [];
    let capituloB: Lesson[] | null = [];
    content.getChapterLessons(SLUG, CHAPTER_A).subscribe((lessons) => (capituloA = lessons));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    content.getChapterLessons(SLUG, CHAPTER_B).subscribe((lessons) => (capituloB = lessons));

    http.expectNone(CONTENT_URL);
    expect(capituloA?.length).toBe(2);
    expect(capituloB?.length).toBe(1);
  });

  it('monta id/chapterId no mesmo esquema do backend (curso:capitulo:indice)', () => {
    let lessons: Lesson[] | null = [];
    content.getChapterLessons(SLUG, CHAPTER_A).subscribe((value) => (lessons = value ?? []));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    expect(lessons.map((lesson) => lesson.id)).toEqual([
      `${SLUG}:${CHAPTER_A}:0`,
      `${SLUG}:${CHAPTER_A}:1`,
    ]);
    expect(lessons[0].chapterId).toBe(`${SLUG}:${CHAPTER_A}`);
    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2]);
  });

  it('capítulo publicado sem aulas devolve lista vazia, sem erro', () => {
    let lessons: Lesson[] | null | undefined;
    content
      .getChapterLessons(SLUG, CHAPTER_VAZIO)
      .subscribe((value) => (lessons = value));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    expect(lessons).toEqual([]);
  });

  it('capítulo ausente no asset devolve null (diferente de "sem aulas")', () => {
    /*
     * `null` = catálogo de seed e build do asset fora de sincronia (ou curso
     * despublicado): a tela mostra "aulas não disponíveis" em vez de
     * "em preparação", que seria mentira. `[]` continua sendo o capítulo
     * publicado e genuinamente vazio.
     */
    let lessons: Lesson[] | null | undefined;
    content
      .getChapterLessons(SLUG, 'capitulo-inexistente')
      .subscribe((value) => (lessons = value));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    expect(lessons).toBeNull();
  });

  it('monta o outline do curso a partir do mesmo asset, sem chamada extra', () => {
    let outline: { title: string; chapters: Chapter[] } | undefined;
    content.getCourseOutline(SLUG).subscribe((value) => (outline = value));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    // Hero, sumário e prev/next saem daqui: a página não depende da API.
    expect(outline?.title).toBe('APIs, metodos HTTP e JSON');
    expect(outline?.chapters.map((chapter) => chapter.slug)).toEqual([
      CHAPTER_A,
      CHAPTER_B,
      CHAPTER_VAZIO,
    ]);

    const [primeiro] = outline?.chapters ?? [];
    expect(primeiro.id).toBe(`${SLUG}:${CHAPTER_A}`);
    expect(primeiro.courseId).toBe(SLUG);
    expect(primeiro.title).toBe('Fundamentos da comunicacao web');
    expect(primeiro.description).toBe('Como o navegador conversa com o servidor');
    expect(primeiro.lessonCount).toBe(2);
    // O corpo das aulas vem à parte; o outline não carrega o texto duas vezes.
    expect(primeiro.lessons).toEqual([]);
  });

  it('ordena o outline pela ordem do capítulo, não pela chave do objeto', () => {
    let outline: { chapters: Chapter[] } | undefined;
    content.getCourseOutline(SLUG).subscribe((value) => (outline = value));
    http.expectOne(CONTENT_URL).flush({
      ...CONTENT_PAYLOAD,
      chapters: {
        [CHAPTER_B]: { title: 'B', order: 2, lessons: [] },
        [CHAPTER_A]: { title: 'A', order: 1, lessons: [] },
      },
    });

    expect(outline?.chapters.map((chapter) => chapter.order)).toEqual([1, 2]);
  });

  it('outline e aulas do mesmo capítulo saem de UMA requisição', () => {
    content.getCourseOutline(SLUG).subscribe();
    content.getChapterLessons(SLUG, CHAPTER_A).subscribe();
    content.getChapterLessons(SLUG, CHAPTER_B).subscribe();

    // Uma só: as outras duas saem do mesmo cache.
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);
    http.expectNone(CONTENT_URL);
  });

  it('propaga a falha para quem chamou, em vez de devolver null', () => {
    let erro: unknown = null;
    content.getChapterLessons(SLUG, CHAPTER_A).subscribe({
      next: () => undefined,
      error: (value: unknown) => (erro = value),
    });
    failRequest(http.expectOne(CONTENT_URL));

    expect(erro).not.toBeNull();
  });

  it('NÃO envenena o cache: falhou uma vez, a próxima chamada tenta de novo', () => {
    content.getChapterLessons(SLUG, CHAPTER_A).subscribe({ error: () => undefined });
    failRequest(http.expectOne(CONTENT_URL));

    let lessons: Lesson[] | null = [];
    content
      .getChapterLessons(SLUG, CHAPTER_A)
      .subscribe((value) => (lessons = value ?? []));
    http.expectOne(CONTENT_URL).flush(CONTENT_PAYLOAD);

    expect(lessons.length).toBe(2);
  });

  it('detalhe do curso só é buscado uma vez, mesmo trocando de capítulo', () => {
    courses.getBySlug(SLUG).subscribe();
    http.expectOne(DETAIL_URL).flush(DETAIL_PAYLOAD);

    courses.getBySlug(SLUG).subscribe();
    http.expectNone(DETAIL_URL);
  });

  it('detalhe do curso que falhou volta a ser buscado na próxima chamada', () => {
    courses.getBySlug(SLUG).subscribe({ error: () => undefined });
    failRequest(http.expectOne(DETAIL_URL));

    let retry: { slug: string } | undefined;
    courses.getBySlug(SLUG).subscribe({ next: (value) => (retry = value ?? undefined) });
    http.expectOne(DETAIL_URL).flush(DETAIL_PAYLOAD);

    expect(retry?.slug).toBe(SLUG);
  });
});
