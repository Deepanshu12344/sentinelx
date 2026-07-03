import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (dateStr: string) =>
  format(parseISO(dateStr), 'yyyy-MM-dd HH:mm:ss');

export const formatDateShort = (dateStr: string) =>
  format(parseISO(dateStr), 'MMM d, HH:mm');

export const timeAgo = (dateStr: string) =>
  formatDistanceToNow(parseISO(dateStr), { addSuffix: true });

export const severityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'text-red-500';
    case 'high':     return 'text-orange-500';
    case 'medium':   return 'text-yellow-500';
    case 'low':      return 'text-blue-500';
    case 'info':     return 'text-slate-400';
    default:         return 'text-slate-400';
  }
};

// These use explicit colours so they stay readable in both modes
export const severityBg = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-900/30 text-red-400 border border-red-700/60';
    case 'high':     return 'bg-orange-900/30 text-orange-400 border border-orange-700/60';
    case 'medium':   return 'bg-yellow-900/30 text-yellow-500 border border-yellow-700/60';
    case 'low':      return 'bg-blue-900/30 text-blue-400 border border-blue-700/60';
    case 'info':     return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
    default:         return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
  }
};

export const statusBg = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open':          return 'bg-red-900/30 text-red-400 border border-red-700/60';
    case 'investigating': return 'bg-yellow-900/30 text-yellow-500 border border-yellow-700/60';
    case 'contained':     return 'bg-orange-900/30 text-orange-400 border border-orange-700/60';
    case 'resolved':      return 'bg-green-900/30 text-green-400 border border-green-700/60';
    case 'closed':        return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
    case 'active':        return 'bg-green-900/30 text-green-400 border border-green-700/60';
    case 'inactive':      return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
    case 'complete':      return 'bg-green-900/30 text-green-400 border border-green-700/60';
    case 'pending':       return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
    case 'in remediation':return 'bg-blue-900/30 text-blue-400 border border-blue-700/60';
    case 'configured':    return 'bg-green-900/30 text-green-400 border border-green-700/60';
    default:              return 'bg-slate-700/40 text-slate-400 border border-slate-600/60';
  }
};

export const truncate = (str: string, n: number) =>
  str.length > n ? str.slice(0, n) + '...' : str;

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
