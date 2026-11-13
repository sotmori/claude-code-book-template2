import { HashRouter } from 'react-router';
import { TableDefaultsProvider } from '@valance/sdk';
import { AuthProvider } from '@/auth/auth-provider';
import { AppRoutes } from './routes';

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        {/* アプリ全体のテーブル密度。'standard' | 'comfortable' | 'dense'。各テーブルの density で個別に上書き可 */}
        <TableDefaultsProvider density="standard">
          <AppRoutes />
        </TableDefaultsProvider>
      </AuthProvider>
    </HashRouter>
  );
}
