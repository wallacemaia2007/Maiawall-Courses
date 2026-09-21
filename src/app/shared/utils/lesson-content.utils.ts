export type ContentBlock =
  | { kind: 'text'; html: string }
  | { kind: 'code'; language: string; title: string; code: string };

export function parseLessonContent(content: string | null | undefined): ContentBlock[] {
  if (!content) return [];

  const blocks: ContentBlock[] = [];
  const lines = normalizeCodeTags(content).replace(/\r\n/g, '\n').split('\n');
  let textLines: string[] = [];
  let codeLines: string[] = [];
  let codeMeta: string | null = null;

  const pushText = (): void => {
    const html = textLines.join('\n').trim();
    if (html) blocks.push({ kind: 'text', html });
    textLines = [];
  };

  const pushCode = (): void => {
    const [language = '', ...titleParts] = (codeMeta ?? '').trim().split(/\s+/);

    blocks.push({
      kind: 'code',
      language: language.toLowerCase(),
      title: titleParts.join(' '),
      code: codeLines.join('\n').replace(/\s+$/, ''),
    });

    codeLines = [];
    codeMeta = null;
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^[ \t]*```([^\n`]*)[ \t]*$/);

    if (fenceMatch) {
      if (codeMeta !== null) {
        pushCode();
      } else {
        pushText();
        codeMeta = fenceMatch[1];
      }
      continue;
    }

    if (codeMeta !== null) {
      codeLines.push(line);
    } else {
      textLines.push(line);
    }
  }

  if (codeMeta !== null) {
    textLines.push(`\`\`\`${codeMeta}`, ...codeLines);
  }

  pushText();
  return blocks;
}

export function extractFirstCode(content: string): string {
  const first = parseLessonContent(content).find((block) => block.kind === 'code');
  return first?.kind === 'code' ? first.code : content;
}

function normalizeCodeTags(content: string): string {
  return content.replace(
    /<pre>\s*<code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, language: string | undefined, code: string) =>
      `\n\`\`\`${language ?? 'code'}\n${decodeHtmlEntities(code).trim()}\n\`\`\`\n`,
  );
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
