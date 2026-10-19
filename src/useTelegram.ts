import { useEffect } from "react";

export function useTelegram() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) return;

    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor("#100d12");
    webApp.setBackgroundColor("#100d12");
  }, []);

  const webApp = window.Telegram?.WebApp;

  return {
    isTelegram: Boolean(webApp),
    webApp,
    user: webApp?.initDataUnsafe?.user,
  };
}
