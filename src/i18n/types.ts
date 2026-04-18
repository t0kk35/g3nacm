import type en from '../../conf/messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en;
  }
}
