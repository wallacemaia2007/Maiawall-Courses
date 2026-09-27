import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SmoothScrollService } from './core/services/smooth-scroll.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly smoothScroll = inject(SmoothScrollService);

  ngOnInit(): void {
    this.smoothScroll.initialize();
  }

  ngOnDestroy(): void {
    this.smoothScroll.destroy();
  }
}
