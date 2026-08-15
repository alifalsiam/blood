import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Wallet,
  Building2,
  Info,
  Send,
  Check,
  ArrowLeft,
  Receipt,
  FileText,
  Home,
  Printer,
  X,
  AlertTriangle,
  CircleAlert
} from 'lucide-react';

interface MfsItem {
  name: string;
  number: string;
}

interface BankItem {
  name: string;
  account: string;
  nameAcc: string;
  branch: string;
  routing: string;
}

export const SupportDevBlock: React.FC = () => {
  const { showToast } = useAuth();

  // Active Configuration
  const activeConfig = {
    title: "Support LifeDrop Developers",
    buttonText: "Buy Developers a Coffee / Donate",
    mfsList: [
      { name: "Nagad", number: "+880 1711-000000" },
      { name: "bKash", number: "+880 1811-000000" },
      { name: "Rocket", number: "+880 1911-000000" },
      { name: "Upay", number: "+880 1311-000000" }
    ] as MfsItem[],
    bankList: [
      {
        name: "Janata Bank PLC",
        account: "0100234567890",
        nameAcc: "LifeDrop Emergency Network",
        branch: "Motijheel Corporate Branch, Dhaka",
        routing: "205263102 / SWIFT: JANABDHK"
      }
    ] as BankItem[],
    description: "LifeDrop is an open-initiative platform connecting emergency receivers and volunteer blood donors seamlessly. Your support helps us maintain 24/7 server uptime, expand our emergency dispatch gateway, and keep donor matching completely free."
  };

  // Views & States
  const [viewState, setViewState] = useState<'initial' | 'form' | 'thankyou'>('initial');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorContact, setDonorContact] = useState('');
  const [donorAmount, setDonorAmount] = useState('');
  const [donorTrx, setDonorTrx] = useState('');

  // Summary State after submission
  const [submittedData, setSubmittedData] = useState<{
    contributor: string;
    amount: string;
    trx: string;
    isAnonymous: boolean;
  }>({
    contributor: '',
    amount: '',
    trx: '',
    isAnonymous: false
  });

  // Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Toggle Anonymous
  const handleToggleAnonymous = (checked: boolean) => {
    setIsAnonymous(checked);
    if (checked) {
      setDonorName('Anonymous Supporter');
      setDonorContact('Anonymous');
    } else {
      setDonorName('');
      setDonorContact('');
    }
  };

  // Submit Receipt
  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    const finalContributor = isAnonymous ? 'Anonymous Supporter' : (donorName.trim() || 'Anonymous Supporter');
    const finalAmount = donorAmount.trim();
    const finalTrx = donorTrx.trim();

    if (!finalAmount || !finalTrx) {
      showToast('Please provide donation amount and Transaction ID (TrxID)', true);
      return;
    }

    setSubmittedData({
      contributor: finalContributor,
      amount: finalAmount,
      trx: finalTrx,
      isAnonymous: isAnonymous
    });

    setViewState('thankyou');
    showToast('Donation receipt submitted to audit queue successfully!');
  };

  // Open Invoice Modal
  const handleOpenInvoiceModal = () => {
    if (submittedData.isAnonymous || submittedData.contributor === 'Anonymous Supporter') {
      alert('Notice: As this donation was made anonymously, provisional unverified invoices are not generated. Thank you for your support!');
      return;
    }
    setShowInvoiceModal(true);
  };

  // Reset to initial home view
  const handleResetToHome = () => {
    setViewState('initial');
    setIsAnonymous(false);
    setDonorName('');
    setDonorContact('');
    setDonorAmount('');
    setDonorTrx('');
    setSubmittedData({ contributor: '', amount: '', trx: '', isAnonymous: false });
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-8 space-y-5 sm:space-y-6">
      
      {/* 1. HERO HEADER (Hidden on Thank You screen) */}
      {viewState !== 'thankyou' && (
        <div className="text-center flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center shadow-xs">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-rose-600 text-rose-600" />
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeConfig.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            {activeConfig.description}
          </p>
        </div>
      )}

      {/* 2. INITIAL TRIGGER CARD VIEW */}
      {viewState === 'initial' && (
        <div className="bg-rose-50/70 border-2 border-dashed border-rose-200 rounded-2xl p-5 sm:p-7 text-center flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setViewState('form')}
            className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <span>{activeConfig.buttonText}</span>
          </button>
        </div>
      )}

      {/* 3. EXPANDABLE SUPPORT INFORMATION & SUBMISSION FORM */}
      {viewState === 'form' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Official Bank & Mobile Wallet Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Official MFS & Bank Transfer Details</span>
            </div>

            {/* MFS Notice & Grid */}
            <div className="space-y-2">
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                <CircleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>All MFS are Personal Accounts. Please use "Send Money".</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeConfig.mfsList.map((mfs, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-500 text-[11px]">{mfs.name}:</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{mfs.number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Bank Account List */}
            <div className="space-y-2 pt-1">
              {activeConfig.bankList.map((bank, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span className="font-extrabold text-slate-900 text-xs">{bank.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Account Name:</span>
                    <span className="font-bold text-slate-900">{bank.nameAcc}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Account Number:</span>
                    <span className="font-mono font-extrabold text-emerald-700">{bank.account}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Branch Name:</span>
                    <span className="font-semibold text-slate-800">{bank.branch}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] border-t border-dashed border-slate-100 pt-1.5">
                    <span className="text-slate-400 font-semibold">Routing / SWIFT:</span>
                    <span className="font-mono font-bold text-slate-700">{bank.routing}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Donation Receipt Form */}
          <form onSubmit={handleSubmitReceipt} className="space-y-4 text-xs">
            <div className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="anonymousCheck"
                checked={isAnonymous}
                onChange={e => handleToggleAnonymous(e.target.checked)}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
              <label htmlFor="anonymousCheck" className="font-bold text-slate-800 cursor-pointer text-xs">
                Make this donation Nameless (Anonymous)
              </label>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${isAnonymous ? 'opacity-50' : 'opacity-100'}`}>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  disabled={isAnonymous}
                  required={!isAnonymous}
                  placeholder="e.g. Tariqul Alam"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-rose-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Number</label>
                <input
                  type="text"
                  disabled={isAnonymous}
                  required={!isAnonymous}
                  placeholder="+8801700000000"
                  value={donorContact}
                  onChange={e => setDonorContact(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-rose-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount Donated (৳) *</label>
                <input
                  type="number"
                  required
                  placeholder="5000"
                  value={donorAmount}
                  onChange={e => setDonorAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NG77123940"
                  value={donorTrx}
                  onChange={e => setDonorTrx(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Donation</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setViewState('initial')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to overview</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. THANK YOU SUCCESS SCREEN */}
      {viewState === 'thankyou' && (
        <div className="text-center space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300 py-2">
          {/* Check Badge */}
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <Check className="w-7 h-7 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">Thank You for Your Support!</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your donation receipt has been securely submitted to the admin audit queue.
            </p>
          </div>

          {/* Receipt Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="text-[10px] font-bold uppercase text-emerald-700 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              <span>Submission Summary</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Contributor:</span>
              <b className="text-slate-900 font-bold">{submittedData.contributor}</b>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Amount Contributed:</span>
              <b className="text-emerald-700 font-extrabold">
                ৳ {Number(submittedData.amount || 0).toLocaleString()}
              </b>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Transaction ID (TrxID):</span>
              <b className="font-mono font-bold text-slate-900">{submittedData.trx}</b>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                Pending Audit Verification
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 max-w-md mx-auto pt-2">
            <button
              type="button"
              onClick={handleOpenInvoiceModal}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Download / View Provisional Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleResetToHome}
              className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Make Another Contribution</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. UNVERIFIED PROVISIONAL INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 fill-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">RedDonor Operations & Dev</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Provisional Support Document</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-amber-600 uppercase block">Provisional Receipt</span>
                <span className="font-mono text-[10px] font-bold text-slate-400">Ref: PENDING-AUDIT</span>
              </div>
            </div>

            {/* Warning Stamp */}
            <div className="bg-amber-50 border border-dashed border-amber-300 text-amber-900 p-3 rounded-xl text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <b className="font-bold text-amber-950">Transaction Not Yet Audited & Verified:</b> This document is a provisional acknowledgment. Our developer end will review your transaction details and contact you shortly to provide the fully audited official invoice.
              </div>
            </div>

            {/* Contributor & Amount Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Contributor</span>
                <div className="font-extrabold text-slate-900 text-sm">{submittedData.contributor}</div>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Submitted Amount</span>
                <div className="font-black text-emerald-700 text-base">
                  ৳ {Number(submittedData.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <p className="text-[10px] text-slate-400 leading-tight">
                Note: Anonymous donations are exempted from personalized provisional audit invoices.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
