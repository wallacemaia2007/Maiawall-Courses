import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../section-head/section-head.component';

type FeatureIcon = 'stack' | 'code' | 'chart' | 'award' | 'user' | 'shield';

interface PlatformFeature {
  icon: FeatureIcon;
  title: string;
  description: string;
}

interface PlatformProof {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-features',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent],
  templateUrl: './platform-features.component.html',
  styleUrl: './platform-features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformFeaturesComponent {
  protected readonly features = signal<PlatformFeature[]>([
    {
      icon: 'stack',
      title: 'Cursos ministrados',
      description:
        'Cada publicação registra um curso que já foi ministrado e preserva sua organização original.',
    },
    {
      icon: 'code',
      title: 'Conteúdo por capítulo',
      description:
        'Textos, exemplos e materiais ficam agrupados na mesma sequência apresentada no curso.',
    },
    {
      icon: 'chart',
      title: 'Progresso acompanhado',
      description:
        'Ao entrar, você pode registrar onde parou e quais capítulos já concluiu.',
    },
    {
      icon: 'award',
      title: 'Consulta completa',
      description:
        'O conteúdo publicado pode ser consultado por inteiro, sem exigir uma conta.',
    },
    {
      icon: 'user',
      title: 'Perfil de leitura',
      description:
        'A conta identifica quem está consultando e mantém somente o histórico de progresso.',
    },
    {
      icon: 'shield',
      title: 'Acervo em evolução',
      description:
        'Novos cursos ministrados e seus respectivos materiais podem ser acrescentados ao acervo.',
    },
  ]);

  protected readonly proofs = signal<PlatformProof[]>([
    { label: 'Cursos publicados', value: '3' },
    { label: 'Formato', value: 'Curso + capítulos' },
    { label: 'Conta', value: 'Progresso opcional' },
  ]);

  protected formatNumber(value: number): string {
    return String(value).padStart(2, '0');
  }
}
