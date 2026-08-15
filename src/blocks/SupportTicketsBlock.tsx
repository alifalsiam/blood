import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, CheckCircle2, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export const SupportTicketsBlock: React.FC = () => {
  const { siteConfig, createSupportTicket, ticketsList, showToast } = useAuth();
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{ category: string; subject: string } | null>(null);

  const availableCategories = siteConfig.ticketCategories && siteConfig.ticketCategories.length > 0
    ? siteConfig.ticketCategories
    : ['Account & Verification', 'Donor Radar Match', 'Technical Bug / Glitch', 'Other Inquiry'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject || !desc) {
      showToast('Please fill out all ticket fields', true);
      return;
    }

    createSupportTicket({ category, subject, description: desc });
    setSubmittedTicket({ category, subject });
    setCategory('');
    setSubject('');
    setDesc('');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Ticket className="w-5 h-5 text-rose-600" />
          <h3 className="text-base font-bold text-slate-900">🎫 Support & Ticketing Center</h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Encountering an issue, technical glitch, or account verification query? Submit a support ticket below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="">Select category...</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Brief Title</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Unable to toggle activity status"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Please describe what happened..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Support Ticket</span>
          </button>
        </form>

        {submittedTicket && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <h4 className="font-bold text-emerald-900 mb-0.5">Ticket Submitted Successfully!</h4>
              <p>Category: <strong>{submittedTicket.category}</strong></p>
              <p>Subject: <em>"{submittedTicket.subject}"</em> — Our admin team will review it shortly.</p>
            </div>
          </div>
        )}
      </div>

      {/* Submitted Tickets Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Your Submitted Support Tickets ({ticketsList.length})</span>
        </h4>

        {ticketsList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            You have no active support tickets submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {ticketsList.map((tkt) => (
              <div key={tkt.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500">{tkt.id}</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded">
                      {tkt.category}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    tkt.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : tkt.status === 'In Progress'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {tkt.status === 'Resolved' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {tkt.status}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900">{tkt.subject}</h5>
                <p className="text-xs text-slate-600 line-clamp-2">{tkt.description}</p>
                <div className="text-[10px] text-slate-400">
                  Submitted: {new Date(tkt.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
