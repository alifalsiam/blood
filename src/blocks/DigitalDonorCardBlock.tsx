import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Download, ShieldCheck, Heart, User, Calendar, MapPin, Phone, Mail } from 'lucide-react';

export const DigitalDonorCardBlock: React.FC = () => {
  const { user, showToast, siteConfig } = useAuth();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Clean full name removing any legacy parenthesized roles like (Donor & Receiver)
  const cleanFullName = (user.fullName || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim() || 'Verified Donor';

  const toggleCardFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const downloadPrintablePDF = () => {
    showToast("Opening print dialog. Save as PDF or print directly!");
    window.print();
  };

  const renderLogo = () => {
    if (siteConfig?.logoDisplayMode === 'textOnly') {
      return <span>{siteConfig.companyName || 'LifeDrop'}</span>;
    }
    if (siteConfig?.logoDisplayMode === 'logoOnly' || siteConfig?.logoDisplayMode === 'both') {
      return (
        <>
          {siteConfig.logoUrl ? (
            <img src={siteConfig.logoUrl} alt="Logo" className="h-[1.1rem] sm:h-5 object-contain" style={{ maxHeight: '20px' }} />
          ) : (
            <span>{siteConfig.logoSymbol || '🩸'}</span>
          )}
          {(siteConfig?.logoDisplayMode === 'both' || !siteConfig?.logoDisplayMode) && (
            <span>{siteConfig.companyName || 'LifeDrop'}</span>
          )}
        </>
      );
    }
    return (
      <>
        <span>🩸</span>
        <span>LifeDrop</span>
      </>
    );
  };

  return (
    <>
      <div className="w-full max-w-xl mx-auto py-2 px-1 print:hidden">
        
        {/* Outer Card Wrapper Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-[0_12px_35px_rgba(230,57,70,0.05)] flex flex-col items-center text-center">
          
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1d3557] mb-1">
              Digital Verified Donor Card
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tap the card to flip and view details. Download your printable A4 layout for easy laminating.
            </p>
          </div>

          {/* Flip Card Container */}
          <div 
            onClick={toggleCardFlip}
            className="w-full max-w-[420px] aspect-[1.6/1] mb-4 cursor-pointer select-none group"
            style={{ perspective: '1000px' }}
          >
            <div 
              className="relative w-full h-full text-left transition-transform duration-600 ease-[cubic-bezier(0.4,0.2,0.2,1)]"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              
              {/* FRONT SIDE */}
              <div 
                className="absolute w-full h-full bg-white text-[#1d3557] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(230,57,70,0.08)] border-[1.5px] border-[#f8d7da] flex flex-col justify-between"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Top Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#e63946] tracking-tight">
                    {renderLogo()}
                  </div>
                  <div className="text-2xl font-black text-[#e63946] leading-none tracking-tight">
                    {user.bloodGroup}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex items-center gap-3">
                  <img 
                    src={user.avatarUrl || siteConfig?.defaultAvatar || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"} 
                    alt={cleanFullName}
                    className="w-13 h-13 rounded-full object-cover border-2 border-[#e63946] shadow-[0_4px_12px_rgba(230,57,70,0.12)] flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-black text-[#1d3557] truncate tracking-tight">
                      {cleanFullName}
                    </h3>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-[0.68rem] bg-rose-100 text-rose-800 font-mono font-black px-1.5 py-0.5 rounded self-start">
                        ID: {user.userId || 'RD982745'}
                      </span>
                      <span className="text-[0.65rem] text-slate-500 font-medium ml-0.5">
                        Member Since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '01/01/2024'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[0.7rem]">
                  <div className="text-[#0d9488] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0d9488]" />
                    {user.verified || user.status === 'Verified' ? 'Verified Member' : 'Active Member'}
                  </div>
                  <div className="text-slate-400 text-[0.65rem] uppercase tracking-wider font-semibold">
                    Tap to flip ↻
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div 
                className="absolute w-full h-full bg-white text-[#1d3557] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(230,57,70,0.08)] border-[1.5px] border-[#f8d7da] flex flex-col justify-between"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div>
                  <div className="text-xs font-bold text-[#e63946] uppercase tracking-wider border-b border-slate-100 pb-1 mb-2 flex items-center justify-between">
                    <span>Emergency Credentials</span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-extrabold">24/7 Verified</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[0.72rem]">
                    <div>
                      <label className="block text-[0.58rem] text-slate-400 font-bold uppercase">Full Name</label>
                      <span className="font-semibold text-[#1d3557] truncate block">{cleanFullName}</span>
                    </div>
                    <div>
                      <label className="block text-[0.58rem] text-slate-400 font-bold uppercase">Date of Birth</label>
                      <span className="font-semibold text-[#1d3557] truncate block">{user.dob || '15 Oct 1998'}</span>
                    </div>
                    <div>
                      <label className="block text-[0.58rem] text-slate-400 font-bold uppercase">Personal Contact</label>
                      <span className="font-semibold text-[#1d3557] truncate block">{user.phone || '+880 1812-345678'}</span>
                    </div>
                    <div className="bg-rose-50/80 p-1 rounded-lg border border-rose-200">
                      <label className="block text-[0.58rem] text-rose-700 font-black uppercase flex items-center gap-1">
                        🚨 Emergency Contact
                      </label>
                      <span className="font-extrabold text-[#e63946] truncate block">{user.emergencyContact || '+880 1811-998877'}</span>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[0.58rem] text-slate-400 font-bold uppercase">Address</label>
                      <span className="font-semibold text-[#1d3557] truncate block">{user.address || 'Road 11, Banani, Dhaka 1213'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-1.5 text-[0.65rem] text-slate-400 uppercase tracking-wider font-semibold">
                  Tap to flip ↺
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full max-w-[420px]">
            <button
              type="button"
              onClick={toggleCardFlip}
              className="flex-1 bg-white hover:bg-[#fff5f6] text-[#e63946] border border-[#ffccd5] hover:border-[#e63946] py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#e63946]" />
              <span>Flip Card</span>
            </button>

            <button
              type="button"
              onClick={downloadPrintablePDF}
              className="flex-1 bg-[#e63946] hover:bg-[#c52233] text-white border border-[#e63946] py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Print / Save PDF (A4)</span>
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-donor-card, #print-donor-card * {
            visibility: visible;
          }
          #print-donor-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Print Only Layout (A4 size with exactly CR80 3.375" x 2.125" cards) */}
      <div id="print-donor-card" className="hidden flex-row items-start justify-center gap-[10px] w-full bg-white pt-[40px]">
        
        {/* Print Front Card */}
        <div style={{ width: '3.375in', height: '2.125in', background: '#ffffff', color: '#1d3557', padding: '0.15in', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #000000', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9pt', display: 'flex', alignItems: 'center', gap: '4px', color: '#e63946' }}>
              {renderLogo()}
            </div>
            <div style={{ fontSize: '14pt', fontWeight: 900, color: '#e63946', letterSpacing: '-0.5px', lineHeight: 1 }}>
              {user.bloodGroup}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={user.avatarUrl || siteConfig?.defaultAvatar || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"} 
              crossOrigin="anonymous" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e63946' }} 
            />
            <div>
              <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1d3557', lineHeight: 1.1 }}>{cleanFullName}</div>
              <div style={{ fontSize: '6.5pt', color: '#e63946', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '2px' }}>ID NO: {user.userId || 'RD982745'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '3px', fontSize: '6.5pt' }}>
            <div style={{ color: '#0d9488', fontWeight: 'bold' }}>✓ {user.verified || user.status === 'Verified' ? 'Verified Member' : 'Active Member'}</div>
            <div style={{ color: '#64748b' }}>Date: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '01/01/2024'}</div>
          </div>
        </div>

        {/* Print Back Card */}
        <div style={{ width: '3.375in', height: '2.125in', background: '#ffffff', color: '#1d3557', padding: '0.15in', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #000000', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#e63946', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Emergency Credentials</span>
            <span style={{ fontSize: '6pt', color: '#0d9488' }}>24/7 Dispatch</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: '6.5pt' }}>
            <div>
              <div style={{ fontSize: '5pt', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Full Name</div>
              <div style={{ fontWeight: 'bold', color: '#1d3557' }}>{cleanFullName}</div>
            </div>
            <div>
              <div style={{ fontSize: '5pt', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Date of Birth</div>
              <div style={{ fontWeight: 'bold', color: '#1d3557' }}>{user.dob || '15 Oct 1998'}</div>
            </div>
            <div>
              <div style={{ fontSize: '5pt', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Personal Phone</div>
              <div style={{ fontWeight: 'bold', color: '#1d3557' }}>{user.phone || '+880 1812-345678'}</div>
            </div>
            <div>
              <div style={{ fontSize: '5pt', color: '#e63946', textTransform: 'uppercase', fontWeight: 'bold' }}>🚨 Emergency Contact</div>
              <div style={{ fontWeight: 'bold', color: '#e63946' }}>{user.emergencyContact || '+880 1811-998877'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '5pt', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Address</div>
              <div style={{ fontWeight: 'bold', color: '#1d3557', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.address || 'Road 11, Banani, Dhaka 1213'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '3px', fontSize: '6pt' }}>
            <div style={{ color: '#64748b' }}>If found, please return to nearest LifeDrop center.</div>
            <div style={{ fontWeight: 'bold' }}>{siteConfig?.companyName || 'LifeDrop'}</div>
          </div>
        </div>

      </div>
    </>
  );
};
