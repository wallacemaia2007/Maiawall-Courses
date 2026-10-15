const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const courseCatalog = require('../src/seed/course-catalog');
const { getLessonSummaries, hasCourseChapter, isCoursePublished } = require('../src/content/course-content');
const {
  buildCourseContent,
  buildCourseContentAssets,
  isPublishable,
} = require('../src/scripts/build-course-content-assets');

test('buildCourseContent agrupa as aulas por capítulo e traz o outline do curso', () => {
  const content = buildCourseContent({
    slug: 'curso-teste',
    title: 'Curso de teste',
    chapters: [
      {
        slug: 'capitulo-1',
        title: 'Capítulo 1',
        description: 'Primeiro capítulo',
        order: 1,
        requiresLogin: true,
        lessons: [
          { title: 'Aula 1', type: 'article', content: '<p>Oi</p>', order: 1 },
          { title: 'Aula 2', type: 'code', content: 'console.log(1)', isPublic: true, order: 2 },
        ],
      },
    ],
  });

  /*
   * `course` + metadado do capítulo existem para a página do capítulo montar a
   * tela inteira sem chamar a API (ver CourseContentService.getCourseOutline).
   */
  assert.deepEqual(Object.keys(content), ['course', 'chapters']);
  assert.deepEqual(content.course, { slug: 'curso-teste', title: 'Curso de teste' });
  assert.deepEqual(Object.keys(content.chapters), ['capitulo-1']);

  const { lessons, ...meta } = content.chapters['capitulo-1'];
  assert.deepEqual(meta, {
    title: 'Capítulo 1',
    description: 'Primeiro capítulo',
    order: 1,
    isPublic: false,
    requiresLogin: true,
  });

  assert.equal(lessons.length, 2);
  assert.equal(lessons[1].type, 'code');
  assert.equal(lessons[0].content, '<p>Oi</p>');
});

test('buildCourseContent usa a posição do capítulo quando o order não vem no JSON', () => {
  const content = buildCourseContent({
    slug: 'curso-teste',
    title: 'Curso de teste',
    chapters: [
      { slug: 'a', title: 'A', lessons: [] },
      { slug: 'b', title: 'B', lessons: [] },
    ],
  });

  assert.equal(content.chapters.a.order, 1);
  assert.equal(content.chapters.b.order, 2);
});

test('buildCourseContentAssets escreve um JSON por curso do catálogo', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-content-'));

  const { written } = buildCourseContentAssets(
    {
      courses: [
        {
          slug: 'curso-a',
          published: true,
          chapters: [{ slug: 'cap-1', lessons: [{ title: 'Aula', type: 'article', order: 1 }] }],
        },
        { slug: 'curso-b', published: true, chapters: [] },
      ],
    },
    outputDir,
  );

  assert.equal(written.length, 2);
  assert.deepEqual(fs.readdirSync(outputDir).sort(), ['curso-a.json', 'curso-b.json']);

  const cursoA = JSON.parse(fs.readFileSync(path.join(outputDir, 'curso-a.json'), 'utf8'));
  assert.deepEqual(Object.keys(cursoA.chapters), ['cap-1']);
  assert.equal(cursoA.chapters['cap-1'].lessons.length, 1);

  fs.rmSync(outputDir, { recursive: true, force: true });
});

test('isPublishable exige "published": true explícito', () => {
  assert.equal(isPublishable({ published: true }), true);
  assert.equal(isPublishable({ published: false }), false);

  // Campo ausente/inválido é erro, não "publicado": o asset não passa pela API,
  // então assumir publicado vazaria o conteúdo de um curso fora do catálogo.
  for (const course of [{}, { published: 'true' }, { published: null }]) {
    assert.throws(() => isPublishable(course), /published/);
  }
});

test('buildCourseContentAssets não gera asset de curso despublicado', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-content-'));

  const { written, skipped } = buildCourseContentAssets(
    {
      courses: [
        { slug: 'publicado', published: true, chapters: [] },
        { slug: 'rascunho', published: false, chapters: [] },
      ],
    },
    outputDir,
  );

  assert.deepEqual(skipped, ['rascunho']);
  assert.deepEqual(
    written.map((file) => path.basename(file)),
    ['publicado.json'],
  );
  assert.deepEqual(fs.readdirSync(outputDir), ['publicado.json']);

  fs.rmSync(outputDir, { recursive: true, force: true });
});

test('buildCourseContentAssets aborta sem tocar no disco se um curso não declara "published"', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-content-'));
  fs.writeFileSync(path.join(outputDir, 'curso-antigo.json'), '{"chapters":{}}');

  assert.throws(
    () =>
      buildCourseContentAssets(
        {
          courses: [
            { slug: 'ok', published: true, chapters: [] },
            { slug: 'sem-campo', chapters: [] },
          ],
        },
        outputDir,
      ),
    /sem-campo/,
  );

  /*
   * A validação é feita antes de qualquer escrita: um `published` faltando não
   * pode deixar o diretório pela metade (curso novo gravado, course antigo já
   * removido) — o conteúdo de um curso que sumiu do catálogo é justamente o que
   * não pode continuar sendo servido.
   */
  assert.deepEqual(fs.readdirSync(outputDir), ['curso-antigo.json']);

  fs.rmSync(outputDir, { recursive: true, force: true });
});

test('buildCourseContentAssets apaga o JSON de curso que saiu do catálogo', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-content-'));
  fs.writeFileSync(path.join(outputDir, 'curso-antigo.json'), '{"chapters":{}}');

  const { written, removed } = buildCourseContentAssets(
    { courses: [{ slug: 'curso-atual', published: true, chapters: [] }] },
    outputDir,
  );

  // Sem isso, o conteúdo de um curso despublicado/renomeado continuaria
  // sendo servido em produção (o asset não passa pela API).
  assert.deepEqual(removed, ['curso-antigo.json']);
  assert.equal(written.length, 1);
  assert.deepEqual(fs.readdirSync(outputDir), ['curso-atual.json']);

  fs.rmSync(outputDir, { recursive: true, force: true });
});

/*
 * Paridade entre o que o backend publica (resumo das aulas) e o que o frontend
 * baixa do asset estático. Os dois recalculam o id da aula na tela
 * (`curso:capitulo:indice`), então qualquer divergência aqui quebra o id com o
 * progresso já salvo no Firestore.
 */
test('o asset gerado bate com o catálogo e com o resumo publicado pela API', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-content-'));
  const { written } = buildCourseContentAssets(courseCatalog, outputDir);

  assert.equal(written.length, courseCatalog.courses.length);

  for (const course of courseCatalog.courses) {
    const asset = JSON.parse(fs.readFileSync(path.join(outputDir, `${course.slug}.json`), 'utf8'));
    const sourceChapters = course.chapters || [];
    assert.deepEqual(Object.keys(asset.chapters), sourceChapters.map((chapter) => chapter.slug));
    assert.deepEqual(asset.course, { slug: course.slug, title: course.title });

    for (const [index, chapter] of sourceChapters.entries()) {
      assert.equal(hasCourseChapter(course.slug, chapter.slug), true);
      const generated = asset.chapters[chapter.slug];
      const source = chapter.lessons || [];
      const summaries = getLessonSummaries(course.slug, chapter.slug);

      assert.equal(generated.order, chapter.order ?? index + 1, `${course.slug}/${chapter.slug}: ordem`);
      assert.equal(generated.title, chapter.title);
      assert.equal(generated.lessons.length, source.length, `${course.slug}/${chapter.slug}: nº de aulas`);

      generated.lessons.forEach((lesson, lessonIndex) => {
        assert.equal(lesson.title, source[lessonIndex].title);
        assert.equal(lesson.type, source[lessonIndex].type);
        assert.equal(lesson.content, source[lessonIndex].content);
        // Mesmo id nos dois lados: o que a API mostra e o que o front renderiza.
        assert.equal(`${course.slug}:${chapter.slug}:${lessonIndex}`, summaries[lessonIndex].id);
        assert.equal(lesson.order ?? lessonIndex + 1, summaries[lessonIndex].order);
      });
    }
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
});

test('todo curso do catálogo real declara "published" (o build depende disso)', () => {
  for (const course of courseCatalog.courses) {
    assert.equal(
      isPublishable(course),
      isCoursePublished(course),
      `${course.slug}: published ausente ou inválido`,
    );
  }
});

test('hasCourseChapter acusa capítulo do Firestore que não existe no catálogo', () => {
  const [course] = courseCatalog.courses;
  assert.equal(hasCourseChapter(course.slug, course.chapters[0].slug), true);
  assert.equal(hasCourseChapter(course.slug, 'capitulo-inexistente'), false);
  assert.equal(hasCourseChapter('curso-inexistente', course.chapters[0].slug), false);
});
