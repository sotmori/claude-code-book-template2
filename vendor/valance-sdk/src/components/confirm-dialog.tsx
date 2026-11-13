import { useRef, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { LABELS } from '../labels';

/*
 * CMP-15: 確認ダイアログ
 * 破壊的操作・取り消せない操作の実行前に必ず挟む。定型文は LABELS.confirm を使う。
 * destructive 指定で実行ボタンが danger になり、誤操作防止のため
 * 初期フォーカスは安全側（キャンセル）に置く。キャンセルは常に「取消す」。
 */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      initialFocusRef={destructive ? cancelRef : undefined}
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
            {LABELS.action.cancel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {destructive && <TriangleAlert size={20} className="mt-0.5 shrink-0 text-danger" />}
        <p className="text-sm leading-relaxed text-foreground-secondary">{message}</p>
      </div>
    </Modal>
  );
}
