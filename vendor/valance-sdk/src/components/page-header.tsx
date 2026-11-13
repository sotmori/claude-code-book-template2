import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

/*
 * CMP-21: PageHeader
 * 画面上部の共通ヘッダー。パンくず（react-router Link）＋タイトル＋
 * 任意の説明文と、右寄せのアクション領域で構成する。
 */

export interface PageHeaderProps {
  title: string;
  /** パンくず。to があるものはリンク、無いものは現在地として表示 */
  breadcrumbs?: { label: string; to?: string }[];
  /** 右寄せで表示するアクション（Button 等） */
  actions?: ReactNode;
  description?: string;
  className?: string;
}

export function PageHeader({ title, breadcrumbs, actions, description, className = '' }: PageHeaderProps) {
  return (
    <header className={`border-b border-border-strong bg-surface px-6 py-4 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="パンくず" className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs">
            {breadcrumbs.map((crumb, index) => {
              /* 末尾のパンくず＝現在地。aria-current で読み上げに現在位置を伝える */
              const isLeaf = index === breadcrumbs.length - 1;
              return (
                <li key={`${index}-${crumb.label}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight size={12} aria-hidden="true" className="text-foreground-disabled" />
                  )}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      aria-current={isLeaf ? 'page' : undefined}
                      className="text-foreground-tertiary transition-colors duration-fast hover:text-foreground-secondary hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isLeaf ? 'page' : undefined} className="text-foreground-secondary">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-foreground-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
