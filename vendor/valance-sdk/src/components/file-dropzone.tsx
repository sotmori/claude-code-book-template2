import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { CloudUpload, FileText, X } from 'lucide-react';
import { LABELS } from '../labels';
import { Button } from './button';

/*
 * CMP-11: FileDropzone（ファイル添付）
 * ドラッグ＆ドロップまたはクリックでファイルを選択し、一覧に積む。
 * ドロップ領域は Enter / Space でも開ける。実際のアップロードは行わない
 * （親が files を保持して送信時に処理する）。
 */

export interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** input[type=file] の accept 属性（例: '.pdf,.png'） */
  accept?: string;
  /** false で 1 ファイルのみ。既定は複数可 */
  multiple?: boolean;
  disabled?: boolean;
  /** ドロップ領域の id（FormField のラベル配線用） */
  id?: string;
  className?: string;
  /** FormField 等から渡されるヒント・エラー文の参照（ドロップ領域へ付与） */
  'aria-describedby'?: string;
}

/** ファイルサイズの表示用フォーマット（B / KB / MB） */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  files,
  onChange,
  accept,
  multiple = true,
  disabled,
  id,
  className = '',
  'aria-describedby': ariaDescribedBy,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const instructionId = `${autoId}-instruction`;

  const addFiles = (added: File[]) => {
    if (disabled || added.length === 0) return;
    onChange(multiple ? [...files, ...added] : added.slice(0, 1));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={ariaDescribedBy}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-1.5 rounded-md border-2 border-dashed p-6 text-center transition-colors duration-fast ${
          dragOver
            ? 'border-border-focus bg-primary-lightest'
            : 'border-border-strong bg-surface-secondary'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-tertiary'}`}
      >
        <CloudUpload
          size={24}
          aria-hidden="true"
          className={dragOver ? 'text-primary-dark' : 'text-foreground-tertiary'}
        />
        <p id={instructionId} className="text-sm font-medium text-foreground-secondary">
          ファイルをドラッグ＆ドロップ
        </p>
        <p className="text-xs text-foreground-tertiary">またはクリックして選択{accept ? `（${accept}）` : ''}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-labelledby={instructionId}
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          // 同じファイルを続けて選択できるようリセット
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <ul className="divide-y divide-border-strong/50 rounded-md border border-border-strong bg-surface">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
              <FileText size={16} aria-hidden="true" className="shrink-0 text-foreground-tertiary" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-foreground-tertiary">
                {formatFileSize(file.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={14} aria-hidden="true" />}
                aria-label={`${file.name}を${LABELS.action.remove}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
