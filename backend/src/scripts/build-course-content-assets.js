/*
 * Gera, a partir de backend/src/seed/course-catalog.js (fonte única do
 * conteúdo dos cursos), um JSON estático por curso em
 * public/assets/courses/content/<slug>.json — o mesmo caminho onde já ficam
 * as imagens dos cursos (public/assets/courses/<curso>/*.png).
 *
 * O frontend busca esse JSON direto (fetch de asset estático, servido pelo
 * hosting estático — nunca passa pela function do backend nem pelo
 * Firestore) para renderizar o corpo das aulas ao ler um capítulo. Isso é o
 * que elimina a espera/instabilidade ao trocar de capítulo: o curso inteiro
 * fica em memória no navegador depois do primeiro carregamento.
 *
 * O Firestore guarda apenas o metadado (curso/capítulo) e o progresso de cada
 * aluno — o corpo das aulas não é gravado lá (ver scripts/seed-courses.js).
 *
 * Roda automaticamente antes de `npm run build`/`npm start` (ver
 * package.json: "prebuild"/"prestart") — não precisa rodar à mão, mas pode:
 *   node backend/src/scripts/build-course-content-assets.js
 */

const fs = require('node:fs');
const path = require('node:path');

const courseCatalog = require('../seed/course-catalog');
const { isCoursePublished } = require('../content/course-content');

const OUTPUT_DIR = path.join(__dirname, '../../../public/assets/courses/content');

/*
 * O asset carrega o outline do curso (título + metadado dos capítulos) além do
 * corpo das aulas. Sem isso, a página do capítulo dependeria de
 * `GET /api/courses/slug/:slug` só para ter título, ordem e sumário — e ela
 * ficaria presa no spinner esperando a API mesmo com o texto já baixado. Com o
 * outline aqui, a página inteira renderiza a partir deste arquivo e a API só
 * entra depois, para progresso.
 *
 * Uma aula por posição no array (não pelo campo `order`, que é só o rótulo
 * mostrado). O id calculado no frontend (`curso:capitulo:indice`) precisa
 * bater com o índice usado aqui, que é o mesmo esquema do seed
 * (backend/src/scripts/seed-courses.js: `${chapterDocId}:${index}`).
 */
function buildCourseContent(course) {
  const chapters = {};

  for (const [chapterIndex, chapter] of (course.chapters || []).entries()) {
    chapters[chapter.slug] = {
      title: chapter.title,
      description: chapter.description,
      // Mesmo contrato das aulas: sem `order` explícito, vale a posição.
      order: chapter.order ?? chapterIndex + 1,
      isPublic: Boolean(chapter.isPublic),
      requiresLogin: Boolean(chapter.requiresLogin),
      lessons: (chapter.lessons || []).map((lesson) => ({
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        isPublic: Boolean(lesson.isPublic),
        attachments: lesson.attachments || [],
        image: lesson.image || null,
        order: lesson.order,
      })),
    };
  }

  return { course: { slug: course.slug, title: course.title }, chapters };
}

/*
 * O asset é servido publicamente pelo hosting, sem passar pela API — então ele
 * não respeita `published` em tempo de leitura: o controle é ser ou não estar
 * no diretório. Por isso a regra é "só publica o que está explicitamente
 * publicado" (isCoursePublished, compartilhada com o seed):
 *   - `published: true`  -> gera o JSON;
 *   - `published: false` -> pula (curso despublicado, decisão legítima);
 *   - ausente/inválido   -> erro, porque aí não há como distinguir "esqueci de
 *     publicar" de "ainda em preparação", e errar para o lado seguro (não gerar)
 *     deixaria o capítulo silenciosamente sem aulas em produção.
 */
function isPublishable(course) {
  if (typeof course.published !== 'boolean') {
    throw new Error(
      `O curso "${course.slug || '(sem slug)'}" precisa de "published": true ou false no JSON de ` +
        'backend/src/seed/. O asset é público e não passa pela API, então campo ausente não ' +
        'pode ser assumido como publicado.',
    );
  }

  return isCoursePublished(course);
}

function buildCourseContentAssets(catalog = courseCatalog, outputDir = OUTPUT_DIR) {
  /*
   * Avalia o catálogo inteiro ANTES de tocar no disco. Se um `published` estiver
   * faltando, a build aborta sem ter apagado nem gravado nada — do contrário a
   * ordem de leitura do diretório deixaria o conjunto inconsistente (metade dos
   * cursos novos, nenhum dos antigos removido).
   */
  const publishable = [];
  const skipped = [];
  for (const course of catalog.courses) {
    if (isPublishable(course)) {
      publishable.push(course);
    } else {
      skipped.push(course.slug);
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const written = publishable.map((course) => {
    const filePath = path.join(outputDir, `${course.slug}.json`);
    fs.writeFileSync(filePath, `${JSON.stringify(buildCourseContent(course))}\n`);
    return filePath;
  });

  const removed = removeStaleAssets(outputDir, written);
  return { written, skipped, removed };
}

/*
 * Sem isto, despublicar ou renomear um curso deixaria o JSON antigo em
 * public/assets/courses/content/ — e ele continuaria sendo servido em produção
 * (o asset não passa pela API). O diretório é exclusivo do build, então só
 * `.json` é removido.
 */
function removeStaleAssets(outputDir, writtenPaths) {
  const expected = new Set(writtenPaths.map((filePath) => path.basename(filePath)));
  const removed = [];

  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || expected.has(entry.name)) continue;
    fs.rmSync(path.join(outputDir, entry.name));
    removed.push(entry.name);
  }

  return removed;
}

function main() {
  const { written, skipped, removed } = buildCourseContentAssets();
  console.log(`Conteudo estatico gerado para ${written.length} curso(s) em ${OUTPUT_DIR}`);
  if (skipped.length > 0) {
    console.log(`Ignorado (published === false): ${skipped.join(', ')}`);
  }
  if (removed.length > 0) {
    console.log(`Removido (fora do catalogo): ${removed.join(', ')}`);
  }
}

if (require.main === module) {
  /*
   * Este script roda como hook de `prestart`/`prebuild`: um erro aqui precisa
   * derrubar o comando com uma mensagem legível, não um stack trace no meio do
   * log do `ng serve` (o hook falhar sai com código != 0, então o build para).
   */
  try {
    main();
  } catch (error) {
    console.error(`Falha ao gerar o conteudo estatico dos cursos: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildCourseContent, buildCourseContentAssets, isPublishable };
