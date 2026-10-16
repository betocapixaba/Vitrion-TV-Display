import React, { useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { resolveAdminSection, AdminSection } from './adminNavigation';
import { SectionOverview } from './sections/SectionOverview';
import { SectionScreens } from './sections/SectionScreens';
import { SectionPlaylists } from './sections/SectionPlaylists';
import { SectionMedia } from './sections/SectionMedia';
import { SectionEstablishments } from './sections/SectionEstablishments';
import { SectionCampaigns } from './sections/SectionCampaigns';
import { SectionSettings } from './sections/SectionSettings';

export interface AdminDashboardProps {
  currentHash?: string;
  onNavigateToTv?: () => void;
}

export function AdminDashboard({ currentHash, onNavigateToTv }: AdminDashboardProps) {
  // Resolve current active hash
  const activeHash = typeof currentHash === 'string'
    ? currentHash
    : (typeof window !== 'undefined' ? window.location.hash || '' : '');

  const activeSection = useMemo(() => resolveAdminSection(activeHash), [activeHash]);

  const handleNavigate = (section: AdminSection, hash: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = hash;
    }
  };

  const handleReturnToTv = () => {
    if (onNavigateToTv) {
      onNavigateToTv();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'screens':
        return <SectionScreens />;
      case 'playlists':
        return <SectionPlaylists />;
      case 'media':
        return <SectionMedia />;
      case 'establishments':
        return <SectionEstablishments />;
      case 'campaigns':
        return <SectionCampaigns />;
      case 'settings':
        return <SectionSettings onReturnToTv={handleReturnToTv} />;
      case 'overview':
      default:
        return <SectionOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <AdminLayout
      currentSection={activeSection}
      onNavigate={handleNavigate}
      onReturnToTv={handleReturnToTv}
    >
      {renderSectionContent()}
    </AdminLayout>
  );
}
