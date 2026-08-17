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

  return (
    <>
      <style>{`
        .glass-navbar {
          background: rgba(255, 255, 255, 0.3); /* slightly more opaque for full-width legibility if needed, but keeping user's 0.13 */
          background: rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(21px);
          -webkit-backdrop-filter: blur(21px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 0 rgba(255, 255, 255, 0.1),
            inset 0 0 16px 8px rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
        }
        
        .glass-navbar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.8),
            transparent
          );
        }
        
        .glass-navbar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 1px;
          height: 100%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.8),
            transparent,
            rgba(255, 255, 255, 0.3)
          );
        }
      `}</style>
      <header className="glass-navbar px-3 sm:px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
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
    </>
  );
};
