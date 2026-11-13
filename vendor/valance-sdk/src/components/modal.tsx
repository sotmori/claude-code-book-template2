import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { getFocusableIn, useScrollRegionFocusable } from '../internal/focus';

/*
 * CMP-17: モーダル・ドロワー
 * 短い確認・入力はモーダル、一覧を保ったままの詳細表示は右ドロワー。
 * オーバーレイクリック・Escape で閉じる。開いている間は背景スクロールを固定し、
 * Tab / Shift+Tab はパネル内で循環する（フォーカストラップ）。
 * 閉じたときは開いた要素（オープナー）へフォーカスを戻す。
 * 本文があふれていて中にフォーカスできる要素が無いときは、本文自体をタブ順に
 * 載せてキーボードでスクロールできるようにする（フォーカスリングは内側に描く）。
 */

/**
 * 開いている間: Escapeで閉じる・背景スクロール固定・フォーカストラップ・初期フォーカス。
 * 閉じたとき: 開いた時点のフォーカス元へ戻す。
 * onClose / initialFocusRef は ref 経由で常に最新を参照し、
 * 親の再レンダー（onClose の識別子変化）で初期フォーカスが再実行されないようにする。
 */
function useDialogBehavior(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLDivElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  const initialFocusHolder = useRef(initialFocusRef);
  useEffect(() => {
    onCloseRef.current = onClose;
    initialFocusHolder.current = initialFocusRef;
  });

  useEffect(() => {
    if (!open) return;

    // フォーカス復元先（オープナー）を開いた時点で記憶する
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // IME 変換中の Escape は変換の取消しであり、ダイアログは閉じない
        if (e.isComposing) return;
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusableIn(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && panel.contains(active);

      if (e.shiftKey) {
        if (!inside || active === first || active === panel) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const initialTarget = initialFocusHolder.current?.current ?? panelRef.current;
    initialTarget?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [open, panelRef]);
}

/** ヘッダー右端の閉じるボタン（モーダル・ドロワー共用） */
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="閉じる"
      onClick={onClose}
      className="rounded-sm p-1 text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground"
    >
      <X size={18} />
    </button>
  );
}

/* ── Modal ─────────────────────────────────────────────── */

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  size?: ModalSize;
  /** 開いた直後にフォーカスする要素（省略時はパネル自体） */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export function Modal({ open, title, onClose, footer, size = 'md', initialFocusRef, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(open, onClose, panelRef, initialFocusRef);
  const bodyFocusable = useScrollRegionFocusable(bodyRef, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-foreground/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-full w-full flex-col rounded-lg bg-surface shadow-3 outline-none ${SIZE_CLASSES[size]}`}
      >
        <div className="flex items-center justify-between border-b border-border-strong px-6 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <CloseButton onClose={onClose} />
        </div>
        <div
          ref={bodyRef}
          tabIndex={bodyFocusable ? 0 : undefined}
          role={bodyFocusable ? 'region' : undefined}
          aria-label={bodyFocusable ? title : undefined}
          className="flex-1 overflow-y-auto px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        >
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border-strong px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────── */

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** 開いた直後にフォーカスする要素（省略時はパネル自体） */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

export function Drawer({ open, title, onClose, initialFocusRef, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(open, onClose, panelRef, initialFocusRef);
  const bodyFocusable = useScrollRegionFocusable(bodyRef, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-drawer bg-foreground/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-3 outline-none"
      >
        <div className="flex items-center justify-between border-b border-border-strong px-6 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <CloseButton onClose={onClose} />
        </div>
        <div
          ref={bodyRef}
          tabIndex={bodyFocusable ? 0 : undefined}
          role={bodyFocusable ? 'region' : undefined}
          aria-label={bodyFocusable ? title : undefined}
          className="flex-1 overflow-y-auto px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
