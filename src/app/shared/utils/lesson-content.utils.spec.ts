import { extractFirstCode, parseLessonContent } from './lesson-content.utils';

describe('parseLessonContent', () => {
  it('retorna lista vazia para conteúdo vazio', () => {
    expect(parseLessonContent(undefined)).toEqual([]);
    expect(parseLessonContent('')).toEqual([]);
  });

  it('mantém conteúdo sem cercas como um único bloco de texto', () => {
    expect(parseLessonContent('Olá <b>mundo</b>')).toEqual([
      { kind: 'text', html: 'Olá <b>mundo</b>' },
    ]);
  });

  it('separa texto e código na ordem em que aparecem', () => {
    const blocks = parseLessonContent('Rode:\n```bash\ngit init\ngit status\n```\nDepois disso, commite.');

    expect(blocks).toEqual([
      { kind: 'text', html: 'Rode:' },
      { kind: 'code', language: 'bash', title: '', code: 'git init\ngit status' },
      { kind: 'text', html: 'Depois disso, commite.' },
    ]);
  });

  it('lê linguagem e título da linha de abertura', () => {
    const [block] = parseLessonContent('```yaml compose.yaml\nservices:\n  app:\n```');

    expect(block).toEqual({
      kind: 'code',
      language: 'yaml',
      title: 'compose.yaml',
      code: 'services:\n  app:',
    });
  });

  it('aceita cerca sem linguagem e vários trechos', () => {
    const blocks = parseLessonContent('```\nls\n```\n```bash\npwd\n```');

    expect(blocks.map((block) => block.kind)).toEqual(['code', 'code']);
  });

  it('trata cerca sem fechamento como texto', () => {
    expect(parseLessonContent('```bash\ngit init')).toEqual([
      { kind: 'text', html: '```bash\ngit init' },
    ]);
  });
});

describe('parseLessonContent with indented fences', () => {
  it('reconhece cercas indentadas entre blocos HTML', () => {
    const blocks = parseLessonContent(
      '<p>Antes</p>\n                    ```http\nGET /api/courses\n```\n                    <p>Depois</p>',
    );

    expect(blocks).toEqual([
      { kind: 'text', html: '<p>Antes</p>' },
      { kind: 'code', language: 'http', title: '', code: 'GET /api/courses' },
      { kind: 'text', html: '<p>Depois</p>' },
    ]);
  });
});

describe('parseLessonContent with HTML code tags', () => {
  it('converte pre code em bloco de codigo', () => {
    const blocks = parseLessonContent(
      '<p>Antes</p>\n<pre><code>GET /api/courses\nHost: api.exemplo.com</code></pre>\n<p>Depois</p>',
    );

    expect(blocks).toEqual([
      { kind: 'text', html: '<p>Antes</p>' },
      {
        kind: 'code',
        language: 'code',
        title: '',
        code: 'GET /api/courses\nHost: api.exemplo.com',
      },
      { kind: 'text', html: '<p>Depois</p>' },
    ]);
  });

  it('decodifica entidades HTML dentro do codigo', () => {
    const [block] = parseLessonContent('<pre><code>{&quot;ok&quot;: true, &quot;path&quot;: &quot;/a&amp;b&quot;}</code></pre>');

    expect(block).toEqual({
      kind: 'code',
      language: 'code',
      title: '',
      code: '{"ok": true, "path": "/a&b"}',
    });
  });
});

describe('extractFirstCode', () => {
  it('devolve o primeiro trecho de código', () => {
    expect(extractFirstCode('Texto\n```bash\ngit init\n```')).toBe('git init');
  });

  it('devolve o conteúdo original quando não há cercas', () => {
    expect(extractFirstCode('git init')).toBe('git init');
  });
});
