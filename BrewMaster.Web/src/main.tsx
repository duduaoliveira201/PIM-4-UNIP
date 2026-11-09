import { createRoot } from 'react-dom/client';
import App, { AppErrorBoundary } from './App';
import './styles.css';
import './visual-identity.css';

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary><App /></AppErrorBoundary>,
);
