import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import './index.css';
import { bootstrapAppSession, launchThroughPortal } from './auth/app-runtime';

// NOTE: DocumentViewer の PDF モードを使う場合は、初回描画前にここで '@valance/sdk' の setupPdfWorker() を呼ぶこと。

async function start() {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing application root');
  try {
    if (import.meta.env.VITE_DEMO) {
      // デモ版: ログインせず、ブラウザ内のデモ用バックエンドで動かす
      const { startDemo } = await import('./demo/demo-backend');
      startDemo();
    } else {
      await bootstrapAppSession();
    }
  } catch {
    const message = document.createElement('p');
    message.textContent = 'ログインの有効期限が切れました。もう一度ログインしてください。';
    const retry = document.createElement('button');
    retry.textContent = 'ログインに戻る';
    retry.onclick = () => {
      retry.disabled = true;
      void launchThroughPortal().catch(() => { retry.disabled = false; });
    };
    root.replaceChildren(message, retry);
    return;
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void start();
