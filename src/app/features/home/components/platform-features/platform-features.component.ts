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
      title: 'Trilhas guiadas',
      description:
        'Percurso estruturado, do fundamento ao avançado: você sempre sabe qual é o próximo passo.',
    },
    {
      icon: 'code',
      title: 'Exercícios com correção',
      description:
        'Pratique em cada módulo e receba feedback claro sobre o que acertou e o que pode melhorar.',
    },
    {
      icon: 'chart',
      title: 'Progresso acompanhado',
      description:
        'A plataforma registra onde você parou, o que concluiu e quanto falta para terminar a trilha.',
    },
    {
      icon: 'award',
      title: 'Certificados',
      description:
        'Ao concluir, receba um certificado com código de validação para comprovar e compartilhar.',
    },
    {
      icon: 'user',
      title: 'Área do aluno',
      description:
        'Aulas, exercícios, submissões e certificados reunidos em um só lugar, em qualquer dispositivo.',
    },
    {
      icon: 'shield',
      title: 'Gestão admin',
      description:
        'Administradores e instrutores criam cursos, organizam capítulos, corrigem submissões e emitem certificados.',
    },
  ]);

  protected readonly proofs = signal<PlatformProof[]>([
    { label: 'Cursos publicados', value: '3' },
    { label: 'Fluxos da plataforma', value: 'Aluno + Admin' },
    { label: 'Certificados verificáveis', value: 'Código público' },
  ]);

  protected formatNumber(value: number): string {
    return String(value).padStart(2, '0');
  }
}
