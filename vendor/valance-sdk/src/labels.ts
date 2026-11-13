/*
 * CNV-05: 用語・ラベル辞書
 * ボタン文言・トースト文言・状態文言はこの辞書からのみ選ぶ。文言の造語は禁止。
 * 「送信」「実行」等の曖昧語は使わず、動作をそのまま書く（保存する・承認する・締める）。
 */

export const LABELS = {
  /** ボタン・アクション動詞 */
  action: {
    register: '登録する',
    save: '保存する',
    update: '更新する',
    cancel: '取消す',
    delete: '削除する',
    close: '締める',
    approve: '承認する',
    reject: '差戻す',
    search: '検索する',
    clearFilter: '条件をクリア',
    csvExport: 'CSV出力',
    pdfExport: 'PDF出力',
    print: '印刷する',
    detail: '詳細',
    edit: '編集する',
    add: '追加する',
    copy: '複製する',
    remove: '削除',
    back: '戻る',
    next: '次へ',
    confirm: '確認する',
    saveDraft: '一時保存する',
    reconcile: '消込む',
    withdraw: '取下げる',
    logout: 'ログアウト',
  },
  /** トースト文言（完了形・主語なし） */
  toast: {
    saved: '保存しました',
    registered: '登録しました',
    updated: '更新しました',
    deleted: '削除しました',
    approved: '承認しました',
    rejected: '差戻しました',
    canceled: '取消しました',
    csvExported: 'CSVを出力しました',
    pdfExported: 'PDFを出力しました',
    reconciled: '消込みました',
    draftSaved: '一時保存しました',
  },
  /** 確認ダイアログ定型文 */
  confirm: {
    deleteTitle: '削除の確認',
    deleteMessage: (name: string) => `「${name}」を削除します。この操作は取り消せません。`,
    cancelTitle: '取消の確認',
    cancelMessage: (name: string) => `「${name}」を取消します。よろしいですか。`,
    approveTitle: '承認の確認',
    approveMessage: (name: string) => `「${name}」を承認します。よろしいですか。`,
  },
  /** 状態表現（CNV-01） */
  state: {
    loading: '読み込み中',
    empty: 'データがありません',
    emptyFiltered: '条件に一致するデータがありません',
    error: 'エラーが発生しました',
    errorRetry: '時間をおいて再度お試しください',
    noPermission: 'この画面を表示する権限がありません',
  },
  /** フォーム共通 */
  form: {
    required: '必須',
    optional: '任意',
    requiredError: (field: string) => `${field}を入力してください`,
    selectPlaceholder: '選択してください',
  },
} as const;
