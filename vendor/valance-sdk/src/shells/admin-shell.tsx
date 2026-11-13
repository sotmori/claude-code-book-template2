import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router';
import {
  Check,
  ChevronDown,
  CircleUser,
  LogOut,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme } from '../theme';
import { LABELS } from '../labels';

/*
 * SHL-01: 管理コンソールシェル
 * 折りたたみ可能な左サイドナビ＋トップヘッダ＋コンテンツ領域。
 * デスクトップファースト（1280px基準）。ナビ項目はアプリ側から
 * navItems プロパティで供給する。ヘッダ右のユーザーチップは user プロパティから描画し、
 * 表示名は name → 姓 名 → email の順で採用、どれも無ければチップ自体を出さない。
 * SDK はアプリの認証層（useAuth 等）を import しない。user は構造型で受ける。
 * ログアウトも同じ考え方: onLogout を渡されたときだけヘッダに「ログアウト」ボタンを出し、
 * 実際の処理（トークン破棄・遷移）はアプリ側のコールバックが行う。
 * アクセシビリティ:
 * - 最初のフォーカス対象はスキップリンク（メインコンテンツへ）
 * - サイドナビは nav ランドマーク、現在ルートは NavLink の aria-current="page"
 * - 折りたたみトグルは aria-expanded / aria-controls を持つ
 * - テーマピッカーは ↑↓ / Home / End / Enter / Escape で操作できる
 */

export interface AdminNavItem {
  label: string;
  to: string;
  /** lucide-react アイコン要素 */
  icon?: ReactNode;
  /** この項目の配下に折りたたんで表示するナビ項目 */
  children?: AdminNavItem[];
}

/** ヘッダのユーザーチップに渡す最小情報。アプリの User 型をそのまま渡せる構造型 */
export interface AdminShellUser {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AdminShellProps {
  children: ReactNode;
  /** 省略時はナビ項目なし（アプリ側が業務メニューを供給する） */
  navItems?: AdminNavItem[];
  /** ヘッダに表示するアプリ名（省略時はカタログ既定） */
  title?: string;
  /** ログイン中ユーザー。null / 省略、または表示名を組み立てられない場合はチップを描画しない */
  user?: AdminShellUser | null;
  /** ログアウト処理（アプリ側の useAuth().logout 等）。省略時はボタンを描画しない */
  onLogout?: () => void;
}

/** チップの表示名: name → 「姓 名」 → email。すべて空なら null */
export function adminShellDisplayName(user: AdminShellUser | null | undefined): string | null {
  if (!user) return null;
  const name = user.name?.trim();
  if (name) return name;
  const fullName = [user.lastName, user.firstName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' ');
  if (fullName) return fullName;
  const email = user.email?.trim();
  return email ? email : null;
}

const NAV_ICON_SIZE = 18;
const MAIN_CONTENT_ID = 'vca-admin-main';
const SIDENAV_ID = 'vca-admin-sidenav';

function pathMatchesItem(pathname: string, item: AdminNavItem): boolean {
  if (item.to === '/') return pathname === '/';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function hasActiveDescendant(pathname: string, item: AdminNavItem): boolean {
  return item.children?.some(
    (child) => pathMatchesItem(pathname, child) || hasActiveDescendant(pathname, child),
  ) ?? false;
}

interface SidebarNavItemProps {
  item: AdminNavItem;
  collapsed: boolean;
  depth?: number;
}

function SidebarNavItem({ item, collapsed, depth = 0 }: SidebarNavItemProps) {
  const { pathname } = useLocation();
  const submenuId = useId();
  const hasChildren = (item.children?.length ?? 0) > 0;
  const descendantActive = hasActiveDescendant(pathname, item);
  const [open, setOpen] = useState(descendantActive);

  /* 別画面から子ルートへ遷移した場合も、現在地が見えるよう親を展開する */
  useEffect(() => {
    if (descendantActive) setOpen(true);
  }, [descendantActive]);

  const itemHeight = depth === 0 ? 'h-11' : 'h-10';

  return (
    <li>
      <div className="relative">
        <NavLink
          to={item.to}
          end={item.to === '/' || descendantActive}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            `flex ${itemHeight} items-center rounded-sm text-sm outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus ${
              collapsed ? 'justify-center' : `gap-3 px-3 ${hasChildren ? 'pr-11' : ''}`
            } ${
              isActive
                ? 'bg-primary-lightest font-medium text-primary-dark'
                : descendantActive
                  ? 'font-medium text-foreground'
                  : 'text-foreground-secondary hover:bg-surface-tertiary'
            }`
          }
        >
          {item.icon != null ? (
            <span className="shrink-0" aria-hidden="true">
              {item.icon}
            </span>
          ) : collapsed ? (
            <span className="text-xs font-bold" aria-hidden="true">
              {item.label.charAt(0)}
            </span>
          ) : (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-tertiary" aria-hidden="true" />
          )}
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        </NavLink>

        {hasChildren && !collapsed && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={submenuId}
            aria-label={`${item.label}のサブメニューを${open ? '閉じる' : '開く'}`}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-foreground-tertiary outline-none transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform duration-fast ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {hasChildren && open && !collapsed && (
        <ul id={submenuId} className="mt-1 flex flex-col gap-1 pl-7">
          {item.children!.map((child) => (
            <SidebarNavItem key={child.to} item={child} collapsed={false} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * テーマピッカー（ホワイトレーベル・プレビュー）
 * テーマ選択は data-theme 属性の付け替えのみ。ブランド色ドットは
 * テーマ定義の R G B 値から算出する（動的算出値の許容例外）。
 */
function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => getStoredTheme());
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* 開いたら選択中テーマのオプションへフォーカスを移す */
  useEffect(() => {
    if (!open) return;
    const activeIndex = THEMES.findIndex((theme) => theme.key === active);
    optionRefs.current[activeIndex >= 0 ? activeIndex : 0]?.focus();
  }, [open, active]);

  /* 外側クリックで閉じる（フォーカスは動かさない） */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (key: string) => {
    applyTheme(key);
    setActive(key);
    closeAndRestoreFocus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape' && open) {
      setOpen(false);
    }
  };

  /* リストボックス内: ↑↓ で移動（端で循環）、Home/End で先頭・末尾、
     Escape で閉じてトリガーへフォーカスを戻す。Enter はボタンの click で選択 */
  const handleListKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const count = THEMES.length;
    if (count === 0) return;
    const current = optionRefs.current.findIndex((el) => el === document.activeElement);
    let next = -1;
    if (event.key === 'ArrowDown') {
      next = current < 0 ? 0 : (current + 1) % count;
    } else if (event.key === 'ArrowUp') {
      next = current < 0 ? count - 1 : (current - 1 + count) % count;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = count - 1;
    }
    if (next >= 0) {
      event.preventDefault();
      optionRefs.current[next]?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="テーマを切り替える"
        className="flex h-9 w-9 items-center justify-center rounded-sm text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground-secondary"
      >
        <Palette size={NAV_ICON_SIZE} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-1 w-64 rounded-md border border-border-strong bg-surface py-1 shadow-2">
          <ul role="listbox" aria-label="テーマ一覧" onKeyDown={handleListKeyDown}>
            {THEMES.map((theme, index) => (
              <li key={theme.key}>
                <button
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={theme.key === active}
                  onClick={() => handleSelect(theme.key)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground-secondary transition-colors duration-fast hover:bg-surface-tertiary"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full border border-border-strong"
                    style={{ background: `rgb(${theme.previewRgb})` }}
                  />
                  <span className="flex-1 truncate">{theme.label}</span>
                  {theme.key === active && (
                    <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-border-strong px-3 pb-1 pt-2 text-xs text-foreground-tertiary">
            顧客ブランド適用はトークン差し替えのみで行われます
          </p>
        </div>
      )}
    </div>
  );
}

export function AdminShell({
  children,
  navItems = [],
  title = 'VCA デザインカタログ',
  user,
  onLogout,
}: AdminShellProps) {
  const userLabel = adminShellDisplayName(user);
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  /* スキップリンク: ハッシュ遷移に頼らず main へ直接フォーカスを移す */
  const handleSkipToContent = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface-secondary">
      {/* キーボード利用者向け: 最初のフォーカス対象。フォーカス時のみ可視化 */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-toast focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-2"
      >
        メインコンテンツへ
      </a>

      {/* 左サイドナビ（折りたたみ可能） */}
      <aside
        id={SIDENAV_ID}
        className={`flex shrink-0 flex-col border-r border-border-strong bg-surface transition-all duration-slow ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* ブランドマーク — 公式ロゴ（public/logo_valance.png はテンプレート同梱） */}
        <div
          className={`flex h-14 shrink-0 items-center justify-center border-b border-border-strong ${
            collapsed ? 'px-1' : 'px-4'
          }`}
        >
          <img
            src={`${import.meta.env.BASE_URL}logo_valance.png`}
            alt="Valance"
            className={`object-contain ${collapsed ? 'h-6 max-w-full' : 'h-8 max-w-full'}`}
          />
        </div>

        <nav aria-label="メインナビゲーション" className="flex-1 overflow-y-auto p-3">
          {navItems.length > 0 && (
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* トップヘッダ */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-strong bg-surface pl-2 pr-6 shadow-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
              aria-controls={SIDENAV_ID}
              aria-label={collapsed ? 'ナビゲーションを展開する' : 'ナビゲーションを折りたたむ'}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground-secondary"
            >
              {collapsed ? <PanelLeftOpen size={NAV_ICON_SIZE} /> : <PanelLeftClose size={NAV_ICON_SIZE} />}
            </button>
            <h1 className="text-base font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* テーマピッカー（ホワイトレーベル・プレビュー） */}
            <ThemePicker />

            {/* ユーザーチップ。表示名が組み立てられない場合は出さない（プレースホルダ名を出荷しない） */}
            {userLabel && (
              <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-surface-tertiary py-1.5 pl-2 pr-3 text-sm text-foreground-secondary">
                <CircleUser size={20} className="shrink-0 text-foreground-tertiary" aria-hidden="true" />
                <span>{userLabel}</span>
              </div>
            )}

            {/* ログアウト。処理はアプリ側。省略時は出さない */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-sm text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground-secondary"
              >
                <LogOut size={NAV_ICON_SIZE} aria-hidden="true" />
                {LABELS.action.logout}
              </button>
            )}
          </div>
        </header>

        {/* コンテンツ領域（スキップリンクの着地先として tabIndex=-1） */}
        <main
          ref={mainRef}
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 overflow-y-auto outline-none"
        >
          <div className="mx-auto max-w-content p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
