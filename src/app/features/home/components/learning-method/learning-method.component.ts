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
      title: 'Aprender',
      description:
        'Aulas objetivas que explicam o porquê antes do como, com exemplos do dia a dia de quem trabalha com tecnologia.',
      outcome: 'Você entende o conceito antes de copiar comandos.',
    },
    {
      number: '02',
      icon: 'keyboard',
      title: 'Praticar',
      description:
        'Exercícios em cada módulo para aplicar o conteúdo na hora e fixar o aprendizado com mão na massa.',
      outcome: 'Você transforma aula em execução.',
    },
    {
      number: '03',
      icon: 'chat',
      title: 'Receber feedback',
      description:
        'Envie suas respostas e receba correção com orientações claras sobre o que ajustar e por quê.',
      outcome: 'Você sabe exatamente onde melhorar.',
    },
    {
      number: '04',
      icon: 'award',
      title: 'Certificar',
      description:
        'Conclua a trilha e conquiste o certificado da Maiawall para comprovar o que aprendeu.',
      outcome: 'Você fecha a trilha com comprovação.',
    },
  ]);
}
