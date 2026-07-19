import React from 'react';
import {
  LayoutDashboard, Activity, Search, AlertTriangle, Bell,
  Bug, Globe, Shield, Zap, Box, Microscope,
  BookOpen, FileText, Users, Settings,
  User, Menu, X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'siem', label: 'SIEM', icon: Activity },
  { id: 'threat-hunting', label: 'Threat Hunting', icon: Search },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'malware', label: 'Malware Analysis', icon: Bug },
  { id: 'osint', label: 'OSINT', icon: Globe },
  { id: 'threat-intel', label: 'Threat Intelligence', icon: Shield },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Zap },
  { id: 'assets', label: 'Assets', icon: Box },
  { id: 'forensics', label: 'Forensics', icon: Microscope },
  { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  alertCount?: number;
  incidentCount?: number;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  activePage,
  onNavigate,
  alertCount = 0,
  incidentCount = 0,
  collapsed,
  onToggle,
}: SidebarProps) {
  const itemsWithBadges = navItems.map(item => ({
    ...item,
    badge: item.id === 'alerts' ? alertCount : item.id === 'incidents' ? incidentCount : undefined,
  }));

  return (
    <aside
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
      className={`flex flex-col h-full border-r transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      /* sidebar border always dark-ish regardless of theme */
    >
      {/* Logo bar */}
      <div
        className="flex items-center h-14 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onToggle}
          className="p-1.5 rounded flex-shrink-0 transition-colors"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
        {!collapsed && (
          <span className="ml-3 text-base font-bold tracking-widest uppercase text-white">
            SentinelX
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {itemsWithBadges.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-base transition-colors relative ${
                isActive ? 'nav-active' : 'nav-inactive'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {/* badge — expanded */}
              {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {/* badge dot — collapsed */}
              {collapsed && item.badge != null && item.badge > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="p-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
            <User size={17} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>deepanshu.sharma</div>
              {/* <div className="text-sm truncate" style={{ color: '#94A3B8' }}>SOC Lead</div> */}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
