const fs = require('fs');
const path = 'src/blocks/ReceiverDashboardBlock.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "{/* Discovery & Matched Responses */}";
const endMarker = "{!activeRequest && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
  const replacement = `
            {/* NEW ADVANCED STATE MACHINE UI */}
            <div className="mt-6">
              {(() => {
                const stage = activeRequest.matchStage || 'broadcast';
                const selectedDonor = activeRequest.matchedDonors?.find((d: any) => d.id === activeRequest.selectedDonorId);
                const allDonors = activeRequest.matchedDonors || [];
                
                // STAGE 1: ACTIVE REQUEST & MULTIPLE MATCHED DONORS
                if (['broadcast', 'donor_declined', 'donor_withdrawn_post_chat'].includes(stage)) {
                  return (
                    <div className="space-y-4 fade-in">
                      <div className="flex items-center justify-between px-1">
                          <h4 className="font-black text-slate-800">Matched {activeRequest.bloodType} Donors <span className="text-xs text-slate-400 font-medium">({allDonors.length} Found)</span></h4>
                          <button onClick={() => allDonors.forEach((d: any) => (pingSpecificDonor as any)(activeRequest.id, d.id))} className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 uppercase tracking-wider">Ping All</button>
                      </div>
                      
                      {allDonors.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">No exact matches in radar yet. Listening...</div>
                      )}

                      {allDonors.map((donor: any) => (
                        <div key={donor.id} className="bg-white rounded-2xl border-2 border-slate-100 p-4 relative overflow-hidden transition-all shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 relative overflow-hidden">
                                    {donor.avatar ? <img src={donor.avatar} alt={donor.name} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-xl"></i>}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-1">{donor.name} {donor.isSuperDonor && <i className="fa-solid fa-circle-check text-blue-500 text-xs"></i>}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{donor.bloodGroup}</span>
                                        <span className="text-[10px] font-bold text-slate-500"><i className="fa-solid fa-location-dot"></i> {donor.distanceKm}km</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mb-3">Status: {donor.status === 'Declined' ? 'Declined' : 'Donor & Online (Exact Blood Match)'}</p>
                            
                            {donor.status === 'Notified' ? (
                              <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-2 rounded-xl text-xs border border-slate-200">
                                  <i className="fa-solid fa-spinner fa-spin mr-1"></i> Ping Sent. Awaiting Response...
                              </button>
                            ) : donor.status === 'Declined' ? (
                              <button disabled className="w-full bg-rose-50 text-rose-300 font-bold py-2 rounded-xl text-xs border border-rose-100">
                                  Declined
                              </button>
                            ) : (
                              <button onClick={() => (pingSpecificDonor as any)(activeRequest.id, donor.id)} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2 rounded-xl text-xs border border-rose-100 transition">
                                  <i className="fa-solid fa-satellite-dish mr-1"></i> Send Emergency Ping
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  );
                }

                // STAGE 2: DONOR INTERESTED (Waiting for receiver to unlock contact)
                if (stage === 'donor_interested' && selectedDonor) {
                  return (
                    <div className="space-y-4 fade-in">
                      <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-sm text-center">
                          <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                              <i className="fa-solid fa-handshake text-2xl"></i>
                          </div>
                          <h3 className="font-black text-slate-800 text-lg mb-1">{selectedDonor.name} Accepted the Ping!</h3>
                          <p className="text-xs text-slate-500 font-medium mb-4">They are ready to help. Unlock mutual contacts to coordinate commute.</p>
                          <button onClick={() => (receiverConfirmMutualContact as any)(activeRequest.id)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition text-sm shadow-md">
                              Unlock Contact Info
                          </button>
                      </div>
                    </div>
                  );
                }

                // STAGE 3: MUTUAL CONTACT SHARED
                if (stage === 'mutual_contact_shared' && selectedDonor) {
                  return (
                    <div className="space-y-4 fade-in">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                            <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                                <i className="fa-solid fa-phone-volume text-2xl"></i>
                            </div>
                            <h3 className="font-black text-slate-800 text-lg mb-1">Mutual Contact Unmasked</h3>
                            <p className="text-xs text-slate-500 font-medium mb-4">Both you and {selectedDonor.name} have each other's contact info. Coordinate externally regarding commute and details.</p>
                            
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between mb-4 text-left">
                                <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Donor Phone ({selectedDonor.name})</p>
                                    <p className="font-black text-slate-800 font-mono text-sm">{selectedDonor.phone}</p>
                                </div>
                                <a href={"tel:" + selectedDonor.phone} className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md"><i className="fa-solid fa-phone text-xs"></i></a>
                            </div>
                            
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-left">
                                <div className="flex items-center gap-2 mb-1">
                                    <i className="fa-solid fa-hourglass-half text-amber-500 animate-spin text-xs"></i>
                                    <span className="text-[11px] font-black text-amber-800">Awaiting Donor Arrival Decision</span>
                                </div>
                                <p className="text-[10px] text-amber-700">{selectedDonor.name} is reviewing the conversation & logistics before confirming arrival.</p>
                            </div>
                        </div>
                    </div>
                  );
                }

                // STAGE 4: ARRIVAL VERIFICATION
                if (stage === 'donor_arriving_pending_approval' && selectedDonor) {
                  return (
                    <div className="space-y-4 fade-in">
                        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-5 shadow-md text-center">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                                <i className="fa-solid fa-hospital-user"></i>
                            </div>
                            <h3 className="font-black text-slate-800 text-base mb-1">Donor Checked-In at Hospital</h3>
                            <p className="text-xs text-slate-500 font-medium mb-4">{selectedDonor.name} is present at {activeRequest.hospitalName}. Please verify blood cross-matching and confirm the donor's medical eligibility.</p>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button onClick={() => (receiverDeclineArrival as any)(activeRequest.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 rounded-xl text-xs border border-rose-200 transition">
                                    Cross-Match Failed
                                </button>
                                <button onClick={() => (receiverApproveArrival as any)(activeRequest.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-emerald-200">
                                    Verify & Approve
                                </button>
                            </div>
                        </div>
                    </div>
                  );
                }

                // STAGE 4.5: ARRIVAL APPROVED / DONOR COMPLETED
                if (['arrival_confirmed_and_approved', 'donor_completed'].includes(stage) && selectedDonor) {
                  if (activeRequest.receiver_completed) {
                    // STAGE 5: POST-DONATION FEEDBACK
                    return (
                      <div className="space-y-4 fade-in">
                          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                                  <i className="fa-solid fa-check-circle"></i>
                              </div>
                              <h3 className="font-black text-slate-800 text-base mb-1">Donation Logged</h3>
                              <p className="text-xs text-slate-500 font-medium mb-4">Please submit your rating and feedback about the donation experience to fully finalize the record.</p>
                              
                              <div className="flex justify-center gap-2 text-2xl text-amber-400 mb-4 cursor-pointer">
                                  <i className="fa-solid fa-star" onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 1, '')}></i>
                                  <i className="fa-solid fa-star" onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 2, '')}></i>
                                  <i className="fa-solid fa-star" onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 3, '')}></i>
                                  <i className="fa-solid fa-star" onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 4, '')}></i>
                                  <i className="fa-solid fa-star" onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 5, '')}></i>
                              </div>
                              <p className="text-[10px] text-slate-400">Click a star to quick-submit 5-star rating.</p>
                              <button onClick={() => (submitReceiverFeedback as any)(activeRequest.id, 5, 'Great donor!')} className="w-full mt-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition text-sm">
                                  Submit 5★ Rating & Finalize
                              </button>
                          </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 fade-in">
                        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-5 shadow-md text-center">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                                <i className="fa-solid fa-circle-check"></i>
                            </div>
                            <h3 className="font-black text-slate-800 text-base mb-1">Arrival Verified & Approved</h3>
                            <p className="text-xs text-slate-600 font-medium mb-4">Both parties can now mark the donation complete.</p>
                            
                            <button onClick={() => (receiverMarkComplete as any)(activeRequest.id)} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition text-sm shadow-md">
                                Mark Donation Completed
                            </button>
                        </div>
                    </div>
                  );
                }

                if (stage === 'fully_resolved' || stage === 'rating_submitted') {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm fade-in">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            <i className="fa-solid fa-check-double"></i>
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-1">Workflow Fully Resolved</h3>
                        <p className="text-xs text-slate-500 font-medium mb-4">Rating and feedback submitted successfully. Both parties now see the final completed state.</p>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        </div>
      )}
      `;
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
}

const authCallStart = content.indexOf("const {");
const authCallEnd = content.indexOf("} = useAuth();");
if (authCallStart > -1 && authCallEnd > -1) {
  const oldAuthVars = content.substring(authCallStart, authCallEnd + 14);
  const newAuthVars = `const { 
    user, 
    activeRequest, 
    createRequest, 
    cancelRequest,
    pingSpecificDonor,
    receiverConfirmMutualContact,
    receiverDeclineArrival,
    receiverApproveArrival,
    receiverMarkComplete,
    submitReceiverFeedback,
    showToast,
    siteConfig,
    isSoundMuted,
    toggleSoundMute
  } = useAuth();`;
  content = content.replace(oldAuthVars, newAuthVars);
}

fs.writeFileSync(path, content, 'utf8');
