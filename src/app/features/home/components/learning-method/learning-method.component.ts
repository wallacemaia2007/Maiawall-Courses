import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../section-head/section-head.component';

interface LearningStep {
  number: string;
  icon: 'book' | 'keyboard' | 'rocket';
  title: string;
  description: string;
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
      title: 'Conteúdo direto',
      description:
        'Aprenda os conceitos essenciais sem enrolação, com exemplos que você encontra no dia a dia de verdade.',
    },
    {
      number: '02',
      icon: 'keyboard',
      title: 'Pratique',
      description:
        'Resolva exercícios e coloque o conhecimento em prática imediatamente — é praticando que a fixação acontece.',
    },
    {
      number: '03',
      icon: 'rocket',
      title: 'Construa',
      description:
        'Aplique o que aprendeu em projetos reais, dos pequenos ao deploy. É assim que você evolui de verdade.',
    },
  ]);
}