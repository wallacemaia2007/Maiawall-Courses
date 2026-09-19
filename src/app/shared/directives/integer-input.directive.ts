import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/*
 * Restringe a entrada de um <input> a números inteiros.
 * Adaptado do padrão de máscara de input do Maiawall Homolog
 * (CentavosMaskDirective), sem a lógica de moeda.
 */
@Directive({
  selector: 'input[appIntegerInput]',
  standalone: true,
  host: {
    inputmode: 'numeric',
    autocomplete: 'off',
  },
})
export class IntegerInputDirective {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = this.element.nativeElement;

    if (!event.isTrusted) {
      return;
    }

    const digitsOnly = target.value.replace(/\D/g, '');
    if (target.value !== digitsOnly) {
      target.value = digitsOnly;
    }
  }
}