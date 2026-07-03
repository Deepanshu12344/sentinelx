import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import SIEM from './pages/SIEM';
import ThreatHunting from './pages/ThreatHunting';
import Incidents from './pages/Incidents';
import Alerts from './pages/Alerts';
import MalwareAnalysis from './pages/MalwareAnalysis';
import OSINT from './pages/OSINT';
import ThreatIntelligence from './pages/ThreatIntelligence';
import Vulnerabilities from './pages/Vulnerabilities';
import Assets from './pages/Assets';
import Forensics from './pages/Forensics';
import Playbooks from './pages/Playbooks';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './lib/theme';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Executive Security Overview' },
  siem: { title: 'SIEM', subtitle: 'Security Information & Event Management' },
  'threat-hunting': { title: 'Threat Hunting', subtitle: 'IOC Search · YARA · Sigma · Behavior Analytics' },
  incidents: { title: 'Incident Response', subtitle: 'Case Management & IR Lifecycle' },
  alerts: { title: 'Alert Center', subtitle: 'Security Alerts & Notifications' },
  malware: { title: 'Malware Analysis', subtitle: 'Static & Dynamic Analysis · YARA · VirusTotal' },
  osint: { title: 'OSINT', subtitle: 'Open Source Intelligence Gathering' },
  'threat-intel': { title: 'Threat Intelligence', subtitle: 'IOC Repository · Feed Aggregation · APT Tracking' },
  vulnerabilities: { title: 'Vulnerability Management', subtitle: 'CVE Database · Risk Scoring · Remediation' },
  assets: { title: 'Asset Management', subtitle: 'Inventory · Discovery · Security Posture' },
  forensics: { title: 'Digital Forensics', subtitle: 'Disk · Memory · Timeline Analysis' },
  playbooks: { title: 'SOAR Playbooks', subtitle: 'Automated Response Workflows' },
  reports: { title: 'Reports', subtitle: 'Executive · SOC · Incident · Vulnerability Reports' },
  users: { title: 'User Management', subtitle: 'RBAC · Roles · Permissions' },
  settings: { title: 'Settings', subtitle: 'Integrations · SIEM Rules · API Keys · Audit' },
};

function AppShell() {
  const [page, setPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCounts() {
    const [alertRes, incidentRes] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('suppressed', false),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
    ]);
    setAlertCount(alertRes.count || 0);
    setIncidentCount(incidentRes.count || 0);
  }

  const pageInfo = PAGE_TITLES[page] || { title: page, subtitle: '' };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':       return <Dashboard />;
      case 'siem':            return <SIEM />;
      case 'threat-hunting':  return <ThreatHunting />;
      case 'incidents':       return <Incidents />;
      case 'alerts':          return <Alerts />;
      case 'malware':         return <MalwareAnalysis />;
      case 'osint':           return <OSINT />;
      case 'threat-intel':    return <ThreatIntelligence />;
      case 'vulnerabilities': return <Vulnerabilities />;
      case 'assets':          return <Assets />;
      case 'forensics':       return <Forensics />;
      case 'playbooks':       return <Playbooks />;
      case 'reports':         return <Reports />;
      case 'users':           return <Users />;
      case 'settings':        return <Settings />;
      default:                return <Dashboard />;
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        alertCount={alertCount}
        incidentCount={incidentCount}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onRefresh={fetchCounts}
        />
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
