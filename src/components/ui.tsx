import React from 'react';
import { severityBg, statusBg } from '../lib/utils';

interface BadgeProps {
  text: string;
  type?: 'severity' | 'status' | 'default';
  className?: string;
}
export function Badge({ text, type = 'default', className = '' }: BadgeProps) {
  const cls =
    type === 'severity' ? severityBg(text) :
    type === 'status'   ? statusBg(text)   :
    '';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wide ${cls} ${className}`}
      style={type === 'default' ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' } : undefined}
    >
      {text}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  loading?: boolean;
}
export function StatCard({ label, value, sub, icon, color = 'default', loading }: StatCardProps) {
  const valueColor = {
    default:  'var(--text-primary)',
    critical: '#EF4444',
    warning:  '#F59E0B',
    success:  '#10B981',
    info:     '#3B82F6',
  }[color];

  return (
    <div className="rounded p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          {loading ? (
            <div className="h-7 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-skeleton)' }} />
          ) : (
            <div className="text-2xl font-bold font-mono" style={{ color: valueColor }}>{value}</div>
          )}
          {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
        </div>
        {icon && <div style={{ color: 'var(--text-muted)' }}>{icon}</div>}
      </div>
    </div>
  );
}

interface TableProps {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, React.ReactNode>[];
  onRowClick?: (index: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}
export function Table({ columns, rows, onRowClick, loading, emptyMessage = 'No data available' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th key={col.key} className={`text-left py-3 px-4 text-sm font-medium uppercase tracking-wider ${col.width || ''}`}
                style={{ color: 'var(--text-muted)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  {columns.map(col => (
                    <td key={col.key} className="py-3 px-4">
                      <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-skeleton)' }} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
            ? (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-base" style={{ color: 'var(--text-muted)' }}>
                    {emptyMessage}
                  </td>
                </tr>
              )
            : rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(i)}>
                  {columns.map(col => (
                    <td key={col.key} className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}
export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`border rounded px-3 py-2 text-base w-full ${className}`} />
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}
export function Select({ value, onChange, options, className = '' }: SelectProps) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`border rounded px-3 py-2 text-base ${className}`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
export function Panel({ title, children, actions, className = '' }: PanelProps) {
  return (
    <div className={`rounded ${className}`}
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-base font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}
export function Modal({ open, onClose, title, children, width = 'max-w-2xl' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={onClose} />
      <div className={`relative rounded-lg shadow-2xl w-full ${width} mx-4 max-h-[90vh] overflow-y-auto`}
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h2>
          <button onClick={onClose} className="text-lg leading-none transition-colors"
            style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" style={{ color: 'var(--text-muted)' }} width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
    </svg>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <input className={`w-full border rounded px-3 py-2 text-base ${className}`} {...props} />
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <textarea className={`w-full border rounded px-3 py-2 text-base resize-none ${className}`} {...props} />
    </div>
  );
}

export function Button({
  children, variant = 'primary', size = 'sm', className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
}) {
  const sizes = { xs: 'px-2.5 py-1.5 text-sm', sm: 'px-4 py-2 text-sm', md: 'px-5 py-2.5 text-base' };

  const styleMap: Record<string, React.CSSProperties> = {
    primary:   { backgroundColor: '#2563EB', color: '#fff', border: '1px solid #2563EB' },
    secondary: { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger:    { backgroundColor: '#DC2626', color: '#fff', border: '1px solid #DC2626' },
    ghost:     { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
  };

  return (
    <button
      style={styleMap[variant]}
      className={`rounded font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${sizes[size]} ${className}`}
      onMouseEnter={e => { if (!props.disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      {...props}
    >
      {children}
    </button>
  );
}
