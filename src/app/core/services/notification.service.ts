import { Injectable, signal } from '@angular/core';

export type AppNotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: number;
  tone: AppNotificationTone;
  title: string;
  message?: string;
}

/*
 * Toasts/alerts em memória para feedback transversal da UI
 * (erros de API, sucessos, avisos). Consumido por componentes que
 * renderizam a pilha de notificações.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);

  private nextId = 1;

  notify(notification: Omit<AppNotification, 'id'>): void {
    const id = this.nextId++;
    this.notifications.update((items) => [...items, { id, ...notification }]);

    window.setTimeout(() => this.remove(id), 6000);
  }

  success(title: string, message?: string): void {
    this.notify({ tone: 'success', title, message });
  }

  error(title: string, message?: string): void {
    this.notify({ tone: 'danger', title, message });
  }

  info(title: string, message?: string): void {
    this.notify({ tone: 'info', title, message });
  }

  warning(title: string, message?: string): void {
    this.notify({ tone: 'warning', title, message });
  }

  remove(id: number): void {
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.notifications.set([]);
  }
}