import { useRef, type KeyboardEvent } from 'react';
import { formatNumber } from '../format';

/*
 * CMP-18: Tabs
 * 下線型タブ。選択中はブランド色の下線＋前景色、未選択はグレー。
 * 件数バッジ（count）は任意。矢印キーでのタブ移動に対応（選択追従型）。
 */

export interface TabDef {
  key: string;
  label: string;
  /** 件数バッジ（省略時は非表示） */
  count?: number;
}

export interface TabsProps {
  tabs: TabDef[];
  /** 選択中タブの key */
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex((tab) => tab.key === active);
  /* active が不正な場合でも先頭タブが Tab キーで到達できるようにする */
  const focusIndex = activeIndex === -1 ? 0 : activeIndex;

  /* 左右矢印・Home/End でタブを移動し、フォーカスと選択を同期させる */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (focusIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (focusIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(tabs[nextIndex].key);
    buttonRefs.current[nextIndex]?.focus();
  };

  /* タブが無いときに空の tablist ランドマークを残さない */
  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`flex items-end gap-1 overflow-x-auto border-b border-border-strong ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            /* 件数バッジは装飾扱いにし、読み上げ名へ件数を織り込む */
            aria-label={tab.count !== undefined ? `${tab.label} ${formatNumber(tab.count)}件` : undefined}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors duration-fast ${
              isActive
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-foreground-tertiary hover:border-border-strong hover:text-foreground-secondary'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                aria-hidden="true"
                className={`rounded-full px-1.5 py-0.5 text-xs font-medium leading-none ${
                  isActive
                    ? 'bg-primary-lightest text-primary-dark'
                    : 'bg-surface-tertiary text-foreground-tertiary'
                }`}
              >
                {formatNumber(tab.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
