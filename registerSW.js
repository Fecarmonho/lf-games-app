// registerSW.js — Vericta Sports
// Registra o Service Worker e recarrega automaticamente ao detectar nova versao

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Verifica se ha atualizacao toda vez que o app abre
      reg.update();

      // Quando novo SW for encontrado
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Manda o novo SW ativar imediatamente
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Quando o SW mudar (nova versao ativada), recarrega a pagina
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

    } catch (err) {
      console.warn('Service Worker nao registrado:', err);
    }
  });
}
