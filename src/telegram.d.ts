interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  version: string;
  platform: string;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
