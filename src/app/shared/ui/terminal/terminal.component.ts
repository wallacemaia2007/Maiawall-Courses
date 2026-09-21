import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  signal,
} from '@angular/core';

type TerminalLineKind = 'command' | 'continuation' | 'output' | 'comment' | 'plain' | 'blank';

interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
}

interface ShellProfile {
  prompt: string;
  continuation: RegExp;
}

const UNIX_SHELL: ShellProfile = { prompt: '$', continuation: /\\\s*$/ };
const POWERSHELL: ShellProfile = { prompt: '>', continuation: /`\s*$/ };
const CMD: ShellProfile = { prompt: '>', continuation: /\^\s*$/ };

const SHELLS: Record<string, ShellProfile> = {
  bash: UNIX_SHELL,
  sh: UNIX_SHELL,
  shell: UNIX_SHELL,
  zsh: UNIX_SHELL,
  terminal: UNIX_SHELL,
  console: UNIX_SHELL,
  powershell: POWERSHELL,
  ps1: POWERSHELL,
  cmd: CMD,
  bat: CMD,
};

@Component({
  selector: 'app-terminal',
  standalone: true,
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalComponent implements OnDestroy {
  readonly code = input.required<string>();
  readonly language = input<string>('');
  readonly title = input<string>('');

  protected readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly shell = computed(() => SHELLS[this.language().toLowerCase()] ?? null);

  protected readonly prompt = computed(() => this.shell()?.prompt ?? '');

  protected readonly heading = computed(() => {
    const title = this.title();
    if (title) return title;
    if (this.shell()) return 'Terminal';
    return this.language() ? this.language().toUpperCase() : 'Código';
  });

  protected readonly lines = computed(() => this.buildLines());

  protected async copy(): Promise<void> {
    /* Copia só o que o aluno deve executar: sem prompt, saída ou comentários. */
    const text = this.lines()
      .filter((line) => !this.shell() || line.kind === 'command' || line.kind === 'continuation')
      .map((line) => line.text)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }

    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 1800);
  }

  ngOnDestroy(): void {
    clearTimeout(this.copiedTimer);
  }

  private buildLines(): TerminalLine[] {
    const rawLines = this.code().replace(/\r\n/g, '\n').split('\n');
    const shell = this.shell();

    if (!shell) {
      return rawLines.map((text) => ({ kind: text.trim() ? 'plain' : 'blank', text }));
    }

    /* Se alguma linha começa com "$ ", só essas são comandos e o resto é saída.
     * Sem nenhuma, toda linha (exceto comentário) é tratada como comando. */
    const marker = `${shell.prompt} `;
    const explicit = rawLines.some((line) => line.startsWith(marker));
    let continues = false;

    return rawLines.map((line): TerminalLine => {
      if (!line.trim()) {
        continues = false;
        return { kind: 'blank', text: '' };
      }

      if (continues) {
        continues = shell.continuation.test(line);
        return { kind: 'continuation', text: line };
      }

      if (explicit) {
        if (!line.startsWith(marker)) return { kind: 'output', text: line };
        const text = line.slice(marker.length);
        continues = shell.continuation.test(text);
        return { kind: 'command', text };
      }

      if (line.trimStart().startsWith('#')) return { kind: 'comment', text: line };

      continues = shell.continuation.test(line);
      return { kind: 'command', text: line };
    });
  }
}