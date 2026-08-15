import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, ShieldAlert, HeartPulse, Ambulance, Phone } from 'lucide-react';

export const EmergencyNumbersBlock: React.FC = () => {
  const { siteConfig } = useAuth();

  const contactsList = siteConfig.emergencyContacts || [];

  return (
    <div className="bg-white border-l-4 border-l-rose-600 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-rose-600" />
          <h3 className="text-base font-bold text-slate-900">
            🚨 Verified Emergency Helplines & Direct Contacts
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Server Verified • Available 24/7
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-5">
        Use these verified primary channels for critical emergency situations requiring immediate dispatch.
      </p>

      {contactsList.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
          📞 No emergency helplines listed yet. The administrator has not uploaded any emergency contact numbers.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {contactsList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border bg-rose-50/50 border-rose-200/80 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white rounded-xl shadow-2xs flex items-center justify-center text-xl flex-shrink-0 border border-slate-100">
                  {item.icon || '📞'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                  <p className="text-sm font-black text-rose-700 tracking-tight">{item.number}</p>
                  {item.category && (
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">{item.category}</span>
                  )}
                </div>
              </div>

              <a
                href={item.tel || `tel:${item.number.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
