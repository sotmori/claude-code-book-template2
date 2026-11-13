/*
 * 内部ユーティリティ（公開バレルには載せない）: フォーカス関連の共有ロジック。
 * モーダルのフォーカストラップと、スクロール領域のキーボード到達性の判定で
 * 同じ「フォーカスできる要素」の定義を使うためにここへ置く。
 */
import { useEffect, useState, type RefObject } from 'react';

/** Tab で到達できる要素のセレクタ */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** root の子孫のうち、Tab で到達できる要素 */
export function getFocusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * スクロール領域自体をタブ順に載せるべきかを返す。
 *
 * あふれているのに中にフォーカスできる要素が無い領域は、キーボードだけでは
 * 最後の行まで読めない（axe: scrollable-region-focusable / WCAG 2.1.1）。
 * 逆に中に入力やボタンがあるなら、それらをたどる過程でスクロールするので、
 * 領域自体は余計なタブ停止になるだけ。両方を満たすときだけ true を返す。
 *
 * 枠の伸縮（ウィンドウのリサイズ）と中身の増減の両方で判定し直す。
 */
export function useScrollRegionFocusable(ref: RefObject<HTMLElement | null>, active = true): boolean {
  const [focusable, setFocusable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) {
      setFocusable(false);
      return;
    }
    const update = () => {
      setFocusable(el.scrollHeight > el.clientHeight && getFocusableIn(el).length === 0);
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(el);
    const mutate = new MutationObserver(update);
    mutate.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      resize.disconnect();
      mutate.disconnect();
    };
  }, [ref, active]);

  return focusable;
}
