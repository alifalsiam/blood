import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavbarBlock } from './blocks/NavbarBlock';
import { SidebarBlock } from './blocks/SidebarBlock';
import { ControlsBarBlock } from './blocks/ControlsBarBlock';
import { EmergencyNumbersBlock } from './blocks/EmergencyNumbersBlock';
import { BloodBankSearchBlock } from './blocks/BloodBankSearchBlock';
import { ReceiverDashboardBlock } from './blocks/ReceiverDashboardBlock';
import { DonorStreamBlock } from './blocks/DonorStreamBlock';
import { DigitalDonorCardBlock } from './blocks/DigitalDonorCardBlock';
import { SupportDevBlock } from './blocks/SupportDevBlock';
import { SupportTicketsBlock } from './blocks/SupportTicketsBlock';
import { UserProfileBlock } from './blocks/UserProfileBlock';
import { StatsBlock } from './blocks/StatsBlock';
import { NotFoundBlock } from './blocks/NotFoundBlock';
import { AdminDashboardBlock } from './blocks/AdminDashboardBlock';
import { AdminLoginBlock } from './blocks/AdminLoginBlock';
import { SupabaseAuthModalBlock } from './blocks/SupabaseAuthModalBlock';
import { ProtectedRouteBlock } from './components/ProtectedRouteBlock';
import { ToastContainer } from './components/ToastContainer';
import { AuthBlock } from './blocks/AuthBlock';

function MainAppContent() {
  const { activeTab, activeRole, siteConfig, isLoggedIn } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dedicated full-screen layout for Admin Panel & Admin Login
  if (activeTab === 'admin' || activeTab === 'admin/login') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
        <ToastContainer />
        <div className="flex-1 w-full">
          {activeTab === 'admin' ? <AdminDashboardBlock /> : <AdminLoginBlock />}
        </div>
      </div>
    );
  }

  // If user is not logged in, show ONLY the Sign In & Register page first
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen font-sans">
        <ToastContainer />
        <AuthBlock />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <ToastContainer />
      <SupabaseAuthModalBlock />
      <ControlsBarBlock />

      {/* Admin Emergency Broadcast Banner (if enabled in Admin Panel) */}
      {siteConfig.announcementActive && siteConfig.announcementText && (
        <div className="bg-rose-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="truncate">{siteConfig.announcementText}</span>
          </div>
          <span className="text-[10px] bg-rose-700/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">
            Live Alert
          </span>
        </div>
      )}

      {/* Top Navbar Block */}
      <NavbarBlock onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation Block */}
        <SidebarBlock
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {/* VIEW ROUTING BY BLOCKS */}
          {activeTab === 'dashboard' && (
            <div>
              {activeRole === 'Receiver' ? (
                <ProtectedRouteBlock
                  blockTitle="Receiver Operations Dashboard"
                  blockDescription="Post emergency blood requests and track volunteer donor bids in real-time"
                  requiredRole="Receiver"
                >
                  <ReceiverDashboardBlock />
                </ProtectedRouteBlock>
              ) : (
                <ProtectedRouteBlock
                  blockTitle="Donor Operations Stream"
                  blockDescription="View live urgent blood requests within your radar radius"
                  requiredRole="Donor"
                >
                  <DonorStreamBlock />
                </ProtectedRouteBlock>
              )}
            </div>
          )}

          {activeTab === 'stats' && <StatsBlock />}

          {activeTab === 'emergency' && <EmergencyNumbersBlock />}

          {activeTab === 'bloodbank' && <BloodBankSearchBlock />}

          {activeTab === 'donorCard' && (
            <ProtectedRouteBlock
              blockTitle="Digital Verified Donor Card"
              blockDescription="Access and download your verified donor ID credential"
            >
              <DigitalDonorCardBlock />
            </ProtectedRouteBlock>
          )}

          {activeTab === 'supportDev' && <SupportDevBlock />}

          {activeTab === 'supportTickets' && <SupportTicketsBlock />}

          {activeTab === 'profile' && (
            <ProtectedRouteBlock
              blockTitle="User Profile Preferences"
              blockDescription="Manage personal contact info and blood group records"
            >
              <UserProfileBlock />
            </ProtectedRouteBlock>
          )}

          {activeTab === 'notFound' && <NotFoundBlock />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
