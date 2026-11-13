import { useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Button, ConfirmDialog } from '@valance/sdk';
import { currentDemoUser, DEMO_USERS, resetDemoData, switchDemoUser } from './demo-backend';

/** デモ版の上部バー: 利用者の切り替えとデモデータの初期化 */
export default function DemoBanner() {
  const user = currentDemoUser();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-lightest px-4 py-2 text-sm">
      <FlaskConical size={16} className="text-warning" aria-hidden="true" />
      <span className="font-medium">デモ版（ログイン不要・データはこのブラウザ内にのみ保存）</span>
      <label className="ml-auto flex items-center gap-2">
        <span className="text-foreground-secondary">利用者を切り替え</span>
        <select
          className="h-8 rounded border border-border-strong bg-surface px-2"
          value={user.principalId}
          onChange={e => switchDemoUser(e.target.value)}
        >
          {DEMO_USERS.map(u => <option key={u.principalId} value={u.principalId}>{u.name}（{u.label}）</option>)}
        </select>
      </label>
      <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>データを初期化</Button>
      <ConfirmDialog
        open={confirmReset}
        title="デモデータを初期化しますか？"
        message="作成した申請と添付した領収書をすべて削除し、サンプルデータに戻します。"
        confirmLabel="初期化する"
        destructive
        onConfirm={resetDemoData}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
