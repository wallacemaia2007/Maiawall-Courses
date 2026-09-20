import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../section-head/section-head.component';

interface LearningStep {
  number: string;
  icon: 'book' | 'keyboard' | 'chat' | 'award';
  title: string;
  description: string;
  outcome: string;
}

@Component({
  selector: 'app-learning-method',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent],
  templateUrl: './learning-method.component.html',
  styleUrl: './learning-method.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningMethodComponent {
  protected readonly steps = signal<LearningStep[]>([
    {
      number: '01',
      icon: 'book',
      title: 'Conhecer o curso',
      description:
        'Veja o tema, o nível, a duração e o contexto do curso antes de entrar nos capítulos.',
      outcome: 'Você entende o que foi abordado no curso.',
    },
    {
      number: '02',
      icon: 'keyboard',
      title: 'Percorrer os capítulos',
      description:
        'Consulte o conteúdo na mesma organização de módulos e capítulos usada no curso ministrado.',
      outcome: 'Você encontra cada assunto em sua sequência original.',
    },
    {
      number: '03',
      icon: 'chat',
      title: 'Consultar materiais',
      description:
        'Acesse textos, exemplos, comandos e links de apoio reunidos em cada capítulo.',
      outcome: 'Você revisita o material sempre que precisar.',
    },
    {
      number: '04',
      icon: 'book',
      title: 'Retomar a leitura',
      description:
        'Se quiser, use uma conta para marcar o que concluiu e continuar exatamente de onde parou.',
      outcome: 'Seu histórico fica salvo no perfil.',
    },
  ]);
}
