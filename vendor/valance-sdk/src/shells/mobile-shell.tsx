import { useRef, type ReactNode } from 'react';
import { useScrollRegionFocusable } from '../internal/focus';

/*
 * SHL-02: 現場モバイルシェル
 * 「PCの前にいない人」向けの縦一列レイアウト。中央寄せ max-w-md、
 * 大きめのタイトルバー＋下部タブバー（タップ領域は48px以上を保証）。
 * モバイルファースト。コンテンツ領域のみスクロールする。
 * 中にフォーカスできる要素が無いまま本文があふれるときは、コンテンツ領域自体を
 * タブ順に載せてキーボードでスクロールできるようにする。
 */

export interface MobileTab {
  label: string;
  /** lucide-react アイコン要素 */
  icon: ReactNode;
  key: string;
}

export interface MobileShellProps {
  children: ReactNode;
  /** タイトルバーに表示する画面名 */
  title: string;
  /** 下部タブ（3〜4件を想定）。省略時はタブバー非表示 */
  tabs?: MobileTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
}

export function MobileShell({ children, title, tabs, activeTab, onTabChange }: MobileShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const mainFocusable = useScrollRegionFocusable(mainRef);

  return (
    <div className="flex min-h-screen justify-center bg-surface-tertiary">
      <div className="flex h-screen w-full max-w-md flex-col bg-surface shadow-2">
        {/* タイトルバー（大きめ・中央寄せ） */}
        <header className="flex h-16 shrink-0 items-center justify-center border-b border-border-strong bg-surface px-4">
          <h1 className="truncate text-xl font-bold text-foreground">{title}</h1>
        </header>

        {/* コンテンツ（スクロール領域） */}
        <main
          ref={mainRef}
          tabIndex={mainFocusable ? 0 : undefined}
          className="flex-1 overflow-y-auto bg-surface-secondary p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        >
          {children}
        </main>

        {/* 下部タブバー: 各タブ h-16(64px) でタップ領域48px以上を確保 */}
        {tabs && tabs.length > 0 && (
          <nav aria-label="タブナビゲーション" className="flex shrink-0 border-t border-border-strong bg-surface">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange?.(tab.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors duration-fast ${
                    active
                      ? 'bg-primary-lightest font-medium text-primary-dark'
                      : 'text-foreground-tertiary hover:bg-surface-tertiary'
                  }`}
                >
                  <span className="shrink-0" aria-hidden="true">
                    {tab.icon}
                  </span>
                  <span className="w-full truncate px-1 text-center">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
