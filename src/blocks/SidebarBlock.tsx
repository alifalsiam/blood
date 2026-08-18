import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';
import { 
  PhoneCall, 
  Building2, 
  LayoutDashboard, 
  BarChart2,
  CreditCard, 
  Heart, 
  Ticket, 
  User, 
  X,
  Droplets,
  LogIn,
  LogOut,
  ShieldAlert
} from 'lucide-react';

interface SidebarBlockProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarBlock: React.FC<SidebarBlockProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, user, isLoggedIn, openAuthModal, logout, siteConfig } = useAuth();

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'bloodbank', label: 'Blood Bank Search', icon: <Building2 className="w-4 h-4" /> },
    { id: 'emergency', label: 'Emergency Numbers', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'donorcard', label: 'My Donor Card', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'supportdev', label: 'Support Developers', icon: <Heart className="w-4 h-4" /> },
    { id: 'supporttickets', label: 'Support / Tickets', icon: <Ticket className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Panel', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50
        w-64 bg-white border-r border-slate-200 flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand header in sidebar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2 text-left cursor-pointer hover:opacity-90 transition-opacity"
            >
              {siteConfig.logoDisplayMode === 'logoOnly' ? (
                <>
                  {siteConfig.logoUrl ? (
                    <img src={siteConfig.logoUrl} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <div className="p-1.5 bg-rose-600 text-white rounded-lg flex items-center justify-center text-base font-bold leading-none min-w-[28px] min-h-[28px]">
                      {siteConfig.logoSymbol || '🩸'}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 text-base">{siteConfig.companyName || 'LifeDrop'}</span>
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-1.5 py-0.5 rounded ml-1 border border-rose-100">
                      Network
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="font-bold text-slate-900 text-base">{siteConfig.companyName || 'LifeDrop'}</span>
                  <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-1.5 py-0.5 rounded ml-1 border border-rose-100">
                    Network
                  </span>
                </div>
              )}
            </button>
            <button 
              onClick={onClose} 
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items list */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-rose-50 text-rose-700 border-r-4 border-rose-600 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <span className={isActive ? 'text-rose-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR ADS */}
        {siteConfig.adSystem?.sidebarAd?.active && (
          <div className="px-3 mb-3">
            <a href={siteConfig.adSystem.sidebarAd.linkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border border-slate-100">
              <picture>
                <source media="(min-width: 768px)" srcSet={siteConfig.adSystem.sidebarAd.pcImageUrl} />
                <img src={siteConfig.adSystem.sidebarAd.mobileImageUrl || siteConfig.adSystem.sidebarAd.pcImageUrl} alt="Sponsor" className="w-full h-auto object-cover" />
              </picture>
            </a>
          </div>
        )}

        {/* User Profile / Auth Footer Card */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => handleNavClick('profile')}
                className={`
                  w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer
                  ${activeTab === 'profile'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'}
                `}
              >
                <img
                  src={user.avatarUrl || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"}
                  alt={user.fullName || "User Profile"}
                  className="w-9 h-9 rounded-full object-cover border border-white shadow-xs flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <User className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <span className="truncate">View & Edit Profile</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-sm font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                openAuthModal();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
