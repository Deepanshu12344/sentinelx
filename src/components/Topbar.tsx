import { RefreshCw, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../lib/theme';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Topbar({ title, subtitle, onRefresh, loading }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const now = new Date();

  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0"
      style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          {format(now, 'yyyy-MM-dd HH:mm:ss')} UTC
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Refresh"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Icon-only theme toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex items-center gap-2 text-sm text-green-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>Connected</span>
        </div>
      </div>
    </header>
  );
}
