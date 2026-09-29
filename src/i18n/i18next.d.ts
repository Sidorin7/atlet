import 'i18next';

import type { Translation } from './locales/ru';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Translation };
  }
}
