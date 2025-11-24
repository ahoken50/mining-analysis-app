import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error(err);
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Application Error</h1><pre>${err.message || err}</pre></div>`;
  });
