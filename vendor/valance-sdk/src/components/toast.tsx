import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';

/*
 * CMP-14: トースト・アラート
 * トースト = 操作結果の通知（右下に積み上げ・4秒で自動消滅・手動クローズ可）。
 * ホバー / フォーカス中は自動消滅を一時停止する。エラーは role="alert" で即時に読み上げる。
 * アラート = 画面内に常駐する注意喚起。文言は LABELS 辞書（CNV-05）から選ぶこと。
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  /** 退場アニメーション中フラグ */
  closing: boolean;
}

/** 自動消滅までの表示時間 */
const AUTO_DISMISS_MS = 4000;
/** 退場アニメーション時間（--duration-slow と一致させる） */
const EXIT_MS = 300;

/**
 * トーストごとのタイマー状態。
 * auto = 自動消滅待ち / paused = ホバー・フォーカスで一時停止 / exit = 退場アニメーション中
 */
interface TimerEntry {
  handle: ReturnType<typeof setTimeout> | null;
  phase: 'auto' | 'paused' | 'exit';
  /** auto のときの消滅予定時刻（一時停止時の残り時間計算に使う） */
  expiresAt: number;
  /** paused のときの残り時間 */
  remaining: number;
}

const TOAST_TONE: Record<ToastTone, { icon: LucideIcon; iconClass: string; borderClass: string }> = {
  success: { icon: CircleCheck, iconClass: 'text-success', borderClass: 'border-success-border' },
  error: { icon: CircleAlert, iconClass: 'text-danger', borderClass: 'border-danger-border' },
  info: { icon: Info, iconClass: 'text-info', borderClass: 'border-info-border' },
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast は ToastProvider の内側で使用してください');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, TimerEntry>());

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const entry = timersRef.current.get(id);
    if (entry?.handle) clearTimeout(entry.handle);
    timersRef.current.delete(id);
  }, []);

  /** 退場アニメーションを開始し、完了後に除去する */
  const beginClose = useCallback(
    (id: number) => {
      const entry = timersRef.current.get(id);
      if (entry?.phase === 'exit') return; // 二重クローズ防止
      if (entry?.handle) clearTimeout(entry.handle);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      timersRef.current.set(id, {
        handle: setTimeout(() => remove(id), EXIT_MS),
        phase: 'exit',
        expiresAt: 0,
        remaining: 0,
      });
    },
    [remove],
  );

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, tone, message, closing: false }]);
      timersRef.current.set(id, {
        handle: setTimeout(() => beginClose(id), AUTO_DISMISS_MS),
        phase: 'auto',
        expiresAt: Date.now() + AUTO_DISMISS_MS,
        remaining: AUTO_DISMISS_MS,
      });
    },
    [beginClose],
  );

  /** ホバー・フォーカス中は自動消滅を一時停止する（退場中は無視） */
  const pause = useCallback((id: number) => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.phase !== 'auto') return;
    if (entry.handle) clearTimeout(entry.handle);
    timersRef.current.set(id, {
      handle: null,
      phase: 'paused',
      expiresAt: entry.expiresAt,
      remaining: Math.max(0, entry.expiresAt - Date.now()),
    });
  }, []);

  /** 一時停止から残り時間で再開する */
  const resume = useCallback(
    (id: number) => {
      const entry = timersRef.current.get(id);
      if (!entry || entry.phase !== 'paused') return;
      const remaining = Math.max(0, entry.remaining);
      timersRef.current.set(id, {
        handle: setTimeout(() => beginClose(id), remaining),
        phase: 'auto',
        expiresAt: Date.now() + remaining,
        remaining,
      });
    },
    [beginClose],
  );

  // アンマウント時に残タイマーを破棄
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((entry) => {
        if (entry.handle) clearTimeout(entry.handle);
      });
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-80 max-w-full flex-col gap-2"
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onClose={() => beginClose(item.id)}
            onPause={() => pause(item.id)}
            onResume={() => resume(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastCardProps {
  item: ToastItem;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
}

function ToastCard({ item, onClose, onPause, onResume }: ToastCardProps) {
  // マウント直後にフラグを立て、スライド/フェード入場を発火させる
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const tone = TOAST_TONE[item.tone];
  const ToneIcon = tone.icon;
  const shown = entered && !item.closing;

  return (
    <div
      // エラーは即時通知（コンテナの polite を上書き）。他はコンテナの live region が読み上げる
      role={item.tone === 'error' ? 'alert' : undefined}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      className={`pointer-events-auto flex items-start gap-2 rounded-md border bg-surface p-3 shadow-3 transition-all duration-slow ease-out ${tone.borderClass} ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <ToneIcon size={18} className={`mt-0.5 shrink-0 ${tone.iconClass}`} />
      <p className="flex-1 text-sm text-foreground">{item.message}</p>
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="shrink-0 rounded-sm p-0.5 text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ── Alert ─────────────────────────────────────────────── */

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone: AlertTone;
  title?: string;
  children?: ReactNode;
}

const ALERT_TONE: Record<AlertTone, { icon: LucideIcon; containerClass: string; iconClass: string }> = {
  info: { icon: Info, containerClass: 'bg-info-bg border-info-border', iconClass: 'text-info' },
  success: { icon: CircleCheck, containerClass: 'bg-success-bg border-success-border', iconClass: 'text-success' },
  warning: { icon: TriangleAlert, containerClass: 'bg-warning-bg border-warning-border', iconClass: 'text-warning' },
  danger: { icon: CircleAlert, containerClass: 'bg-danger-bg border-danger-border', iconClass: 'text-danger' },
};

export function Alert({ tone, title, children }: AlertProps) {
  const def = ALERT_TONE[tone];
  const ToneIcon = def.icon;
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-md border p-3 ${def.containerClass}`}>
      <ToneIcon size={18} className={`mt-0.5 shrink-0 ${def.iconClass}`} />
      <div className="flex-1 text-sm">
        {title && <p className={`font-medium ${def.iconClass}`}>{title}</p>}
        {children && <div className="text-foreground-secondary">{children}</div>}
      </div>
    </div>
  );
}
