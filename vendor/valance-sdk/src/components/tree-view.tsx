import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/*
 * CMP-06: TreeView
 * 階層データ（勘定科目体系・部門ツリー・カテゴリ等）の表示。
 * 行クリックで選択、親ノードは同時に展開／折りたたみを切替える。
 * 子リストには字下げガイド線を表示する。
 *
 * アクセシビリティ: role="tree"/"treeitem" ＋ ローミングタブインデックス。
 * ↑↓で表示中ノードの移動、→で展開（展開済みなら先頭の子へ）、
 * ←で折りたたみ（葉・折りたたみ済みなら親へ）、Enter/Space で選択。
 */

export interface TreeNode {
  id: string;
  label: string;
  /** lucide-react アイコン要素（呼び出し側で size を指定する） */
  icon?: ReactNode;
  children?: TreeNode[];
}

export interface TreeViewProps {
  nodes: TreeNode[];
  /** 選択中ノードの id */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function isBranch(node: TreeNode): boolean {
  return node.children !== undefined && node.children.length > 0;
}

interface VisibleEntry {
  node: TreeNode;
  parentId: string | null;
}

/** 展開中のノードを表示順に平坦化する（キーボード移動用） */
function flattenVisible(
  nodes: TreeNode[],
  collapsedIds: ReadonlySet<string>,
  parentId: string | null = null,
  acc: VisibleEntry[] = [],
): VisibleEntry[] {
  for (const node of nodes) {
    acc.push({ node, parentId });
    if (isBranch(node) && !collapsedIds.has(node.id)) {
      flattenVisible(node.children!, collapsedIds, node.id, acc);
    }
  }
  return acc;
}

interface TreeNodeRowProps {
  node: TreeNode;
  collapsedIds: ReadonlySet<string>;
  tabStopId: string | null;
  itemRefs: Map<string, HTMLLIElement>;
  onToggle: (id: string) => void;
  onFocusItem: (id: string) => void;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}

function TreeNodeRow({
  node,
  collapsedIds,
  tabStopId,
  itemRefs,
  onToggle,
  onFocusItem,
  selectedId,
  onSelect,
}: TreeNodeRowProps) {
  const branch = isBranch(node);
  const isOpen = branch && !collapsedIds.has(node.id);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    if (branch) onToggle(node.id);
    onSelect?.(node.id);
  };

  return (
    <li
      role="treeitem"
      /* 子グループのテキストを読み上げ名に含めないため、名前はラベルで明示する */
      aria-label={node.label}
      aria-expanded={branch ? isOpen : undefined}
      aria-selected={isSelected}
      tabIndex={node.id === tabStopId ? 0 : -1}
      data-tree-node-id={node.id}
      ref={(el) => {
        if (el) {
          itemRefs.set(node.id, el);
        } else {
          itemRefs.delete(node.id);
        }
      }}
      onFocus={(event) => {
        /* focus は React ではバブルするため、自分自身へのフォーカスのみ扱う */
        if (event.target === event.currentTarget) onFocusItem(node.id);
      }}
      className="outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-inset [&:focus-visible>div]:ring-border-focus"
    >
      <div
        onClick={handleClick}
        className={`flex w-full cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-fast ${
          isSelected
            ? 'bg-primary-lightest font-medium text-primary-dark'
            : 'text-foreground-secondary hover:bg-surface-tertiary'
        }`}
      >
        {branch ? (
          isOpen ? (
            <ChevronDown size={16} className="shrink-0 text-foreground-tertiary" aria-hidden="true" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-foreground-tertiary" aria-hidden="true" />
          )
        ) : (
          /* 葉ノードはシェブロン分の余白で揃える */
          <span className="w-4 shrink-0" aria-hidden="true" />
        )}
        {node.icon !== undefined && <span className="flex shrink-0 items-center">{node.icon}</span>}
        <span className="truncate">{node.label}</span>
      </div>
      {branch && isOpen && (
        <ul role="group" className="ml-4 border-l border-border-strong pl-2">
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              collapsedIds={collapsedIds}
              tabStopId={tabStopId}
              itemRefs={itemRefs}
              onToggle={onToggle}
              onFocusItem={onFocusItem}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeView({ nodes, selectedId = null, onSelect, className = '' }: TreeViewProps) {
  /*
   * 折りたたみ中ノードの集合で保持する（初期状態は全親ノード展開）。
   * 「展開中の集合」ではなく補集合を持つことで、後から追加されたノードも
   * 既定で展開扱いになり、nodes の差し替えに対して頑健になる。
   */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const toggle = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visible = flattenVisible(nodes, collapsedIds);
  const isVisible = (id: string | null): boolean =>
    id !== null && visible.some((entry) => entry.node.id === id);

  /* ローミングタブインデックス: フォーカス済み > 選択中 > 先頭 の優先で Tab 到達先を1つに絞る */
  const tabStopId = isVisible(focusedId)
    ? focusedId
    : isVisible(selectedId)
      ? selectedId
      : (visible[0]?.node.id ?? null);

  const focusItem = (id: string | undefined) => {
    if (id === undefined) return;
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-node-id]');
    const currentId = target?.dataset.treeNodeId;
    if (currentId === undefined) return;
    const index = visible.findIndex((entry) => entry.node.id === currentId);
    if (index === -1) return;
    const { node, parentId } = visible[index];
    const branch = isBranch(node);
    const isOpen = branch && !collapsedIds.has(node.id);

    switch (event.key) {
      case 'ArrowDown':
        focusItem(visible[index + 1]?.node.id);
        break;
      case 'ArrowUp':
        focusItem(visible[index - 1]?.node.id);
        break;
      case 'ArrowRight':
        if (!branch) return;
        if (isOpen) {
          focusItem(node.children![0].id);
        } else {
          toggle(node.id);
        }
        break;
      case 'ArrowLeft':
        if (isOpen) {
          toggle(node.id);
        } else if (parentId !== null) {
          focusItem(parentId);
        }
        break;
      case 'Home':
        focusItem(visible[0]?.node.id);
        break;
      case 'End':
        focusItem(visible[visible.length - 1]?.node.id);
        break;
      case 'Enter':
      case ' ':
        /* クリックと同じ動作: 親ノードは展開切替＋選択、葉ノードは選択のみ */
        if (branch) toggle(node.id);
        onSelect?.(node.id);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  /* ノードが無いときに空の tree ランドマークを残さない */
  if (nodes.length === 0) return null;

  return (
    <ul role="tree" onKeyDown={handleKeyDown} className={`text-sm ${className}`}>
      {nodes.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          collapsedIds={collapsedIds}
          tabStopId={tabStopId}
          itemRefs={itemRefs.current}
          onToggle={toggle}
          onFocusItem={setFocusedId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
