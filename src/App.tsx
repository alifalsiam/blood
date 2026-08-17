import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
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
  const [showPopupAd, setShowPopupAd] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const feedCarousel = siteConfig.adSystem?.feedCarousel;

  useEffect(() => {
    if (!feedCarousel?.active || !feedCarousel?.slides?.length) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % feedCarousel.slides.length);
    }, feedCarousel.autoSlideMs || 5000);
    return () => clearInterval(interval);
  }, [feedCarousel]);

  // Sync SEO Title, Favicon & Meta Tags
  useEffect(() => {
    if (siteConfig?.seoTitle) {
      document.title = siteConfig.seoTitle;
    }
    
    // Helper to update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMetaTag('description', siteConfig?.seoDescription || '');
    updateMetaTag('keywords', siteConfig?.seoKeywords || '');
    updateMetaTag('og:title', siteConfig?.seoTitle || '', true);
    updateMetaTag('og:description', siteConfig?.seoDescription || '', true);
    updateMetaTag('og:image', siteConfig?.ogImageUrl || '', true);

    if (siteConfig?.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteConfig.faviconUrl;
    }
  }, [siteConfig?.seoTitle, siteConfig?.faviconUrl, siteConfig?.seoDescription, siteConfig?.seoKeywords, siteConfig?.ogImageUrl]);
  
  useEffect(() => {
    const popupConfig = siteConfig.adSystem?.popupAd;
    if (!popupConfig?.active) return;
    
    const frequency = popupConfig.displayFrequency || 'once_per_session';
    
    if (frequency === 'once_per_session') {
      const hasShown = sessionStorage.getItem('popupAdShown');
      if (hasShown) return;
    }

    const timer = setTimeout(() => {
      setShowPopupAd(true);
      if (frequency === 'once_per_session') {
        sessionStorage.setItem('popupAdShown', 'true');
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [siteConfig.adSystem?.popupAd]);

  const activePopupAd = siteConfig.adSystem?.popupAd;

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

      {/* POPUP AD MODAL */}
      {showPopupAd && activePopupAd?.active && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl relative max-w-lg w-full overflow-hidden">
            <button 
              onClick={() => setShowPopupAd(false)}
              className="absolute top-3 right-3 bg-white/80 hover:bg-white text-slate-800 p-1.5 rounded-full z-10 transition shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <a href={activePopupAd.linkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full">
                <picture>
                  <source media="(min-width: 768px)" srcSet={activePopupAd.pcImageUrl} />
                  <img src={activePopupAd.mobileImageUrl || activePopupAd.pcImageUrl} alt={activePopupAd.title || "Sponsor Ad"} className="w-full object-contain" />
                </picture>
              </a>
              {(activePopupAd.title?.trim() || activePopupAd.buttonText?.trim()) && (
                <div className="p-6 text-center bg-white border-t border-slate-100 flex flex-col items-center">
                  {activePopupAd.title?.trim() && <h3 className="text-xl font-black text-slate-800 mb-4">{activePopupAd.title}</h3>}
                  {activePopupAd.buttonText?.trim() && (
                    <a href={activePopupAd.linkUrl || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-xl shadow-rose-500/30 transform hover:scale-105 transition-all duration-300 py-3.5 px-8 rounded-full font-black text-sm tracking-wide">
                      {activePopupAd.buttonText}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ControlsBarBlock />

      {/* Admin Emergency Broadcast Banner (if enabled in Admin Panel) */}
      {siteConfig.announcementActive && siteConfig.announcementText && (
        <div className="bg-rose-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex-1 overflow-hidden relative flex items-center h-full">
            <span className="flex h-2 w-2 relative flex-shrink-0 mr-3 z-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <div className="w-full overflow-hidden">
              <span className="animate-marquee inline-block whitespace-nowrap pl-4">{siteConfig.announcementText}</span>
            </div>
          </div>
          <span className="text-[10px] bg-rose-700/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0 z-10 relative">
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
          
          {/* FEED / CAROUSEL ADS */}
          {feedCarousel?.active && feedCarousel.slides?.length > 0 && (
            <div className="relative w-full mb-6 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group h-48 md:h-64 lg:h-72 bg-slate-100">
              {feedCarousel.slides.map((slide, idx) => (
                <div 
                  key={slide.id} 
                  className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <a href={slide.linkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                    <picture>
                      <source media="(min-width: 768px)" srcSet={slide.pcImageUrl} />
                      <img src={slide.mobileImageUrl || slide.pcImageUrl} alt={slide.title || "Sponsor"} className="w-full h-full object-cover" />
                    </picture>
                    {/* Gradient Overlay for Text Readability */}
                    {(slide.title?.trim() || slide.buttonText?.trim()) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent flex flex-col justify-end p-6 md:p-8">
                        {slide.title?.trim() && <h3 className="text-white text-2xl md:text-3xl font-black drop-shadow-lg mb-3">{slide.title}</h3>}
                        {slide.buttonText?.trim() && (
                          <span className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-50 transform hover:scale-105 transition-all duration-300 py-3 px-6 rounded-full font-black text-sm shadow-xl w-max">
                            {slide.buttonText}
                            <ArrowRight className="w-4 h-4 text-rose-500" />
                          </span>
                        )}
                      </div>
                    )}
                  </a>
                </div>
              ))}
              
              {/* Carousel Indicators */}
              {feedCarousel.slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {feedCarousel.slides.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
