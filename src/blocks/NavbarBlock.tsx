import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, User, Heart, Power, LogOut, LogIn } from 'lucide-react';
import { RoleToggle } from '../components/RoleToggle';

interface NavbarBlockProps {
  onToggleSidebar: () => void;
}

export const NavbarBlock: React.FC<NavbarBlockProps> = ({ onToggleSidebar }) => {
  const { 
    activeRole, 
    promptRoleShift, 
    activityStatus, 
    toggleActivityStatus, 
    activeTab,
    pendingRoleShift,
    isLoggedIn,
    logout,
    openAuthModal,
    siteConfig
  } = useAuth();

  if (pendingRoleShift) return null;

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return '';
      case 'stats': return 'Network & Operations Stats';
      case 'emergency': return '24/7 Emergency Numbers';
      case 'bloodbank': return 'Certified Blood Bank Search';
      case 'donorCard': return 'Digital Verified Donor Card';
      case 'supportDev': return 'Support Developers';
      case 'supportTickets': return 'Support & Ticketing System';
      case 'profile': return 'User Profile & Preferences';
      case 'admin': return 'System Command Center';
      case 'admin/login': return 'Admin Authentication';
      case 'notFound': return '404 Page Not Found';
      default: return '';
    }
  };

  const pageTitle = getPageTitle();

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 gap-2 min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {pageTitle && (
          <h2 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight truncate">
            {pageTitle}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Role Segmented Toggle */}
        <RoleToggle compact />

        {/* Status Button: GO ONLINE / GO OFFLINE */}
        {activeRole === 'Donor' && (
          <button
            onClick={toggleActivityStatus}
            className={`
              inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs border whitespace-nowrap
              ${activityStatus === 'online'
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'
                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200'}
            `}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{activityStatus === 'online' ? 'GO OFFLINE' : 'GO ONLINE'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
