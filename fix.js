const fs = require('fs');

let content = fs.readFileSync('src/blocks/AdminDashboardBlock.tsx', 'utf-8');

const oldJsxPattern = /\{\/\* Section X: Media & Avatars \(Apple Style\) \*\/\}.*?(?=\{\/\* Default Fallback Media Options \*\/)/s;

const newJsx = \{/* Section X: Media & Avatars (Apple Style) */}
              <section className="apple-card rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 mb-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-[#e5e5ea]">
                      <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#dd1335] to-[#a90e28] text-white flex items-center justify-center text-lg shadow-sm">
                              ?
                          </div>
                          <div>
                              <h3 className="text-base font-semibold text-[#1d1d1f] tracking-tight">
                                  Media & Avatars 
                              </h3>
                              <p className="text-xs text-[#86868b] font-medium">Manage preset profile options and control storage usage.</p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3.5 bg-white/80 border border-[#e5e5ea] px-4 py-2 rounded-2xl shadow-sm">
                          <div className="text-right">
                              <p className="text-[11px] font-semibold text-[#1d1d1f] leading-tight">Allow Custom Uploads</p>
                              <p className="text-[9px] text-[#dd1335] font-medium">Saves Supabase Storage</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={allowCustomAvatarsInput} onChange={e => setAllowCustomAvatarsInput(e.target.checked)} className="sr-only apple-toggle peer" />
                              <div className="w-9 h-5 bg-[#e5e5ea] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner"></div>
                          </label>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Presets Avatars List */}
                      <div className="space-y-3 apple-card p-4 rounded-2xl border border-[#e5e5ea]">
                          <div className="flex justify-between items-center mb-1">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                                  <span>Preset Avatars</span>
                                  <span className="px-2 py-0.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-md text-[9px] border border-[#d2d2d7] font-semibold">400x400</span>
                              </label>
                              <span className="text-[10px] font-medium text-[#86868b] bg-white px-2 py-0.5 rounded-full border border-[#e5e5ea] shadow-sm">{presetAvatarsInput.length} items</span>
                          </div>
                          
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {presetAvatarsInput.map((url, idx) => (
                                  <div 
                                      key={idx} 
                                      className={\\\sorting-item flex items-center gap-2 bg-white/80 p-2 border border-[#e5e5ea] rounded-2xl shadow-sm hover:border-[#d2d2d7] \\\\\\}
                                      draggable
                                      onDragStart={() => handleDragStart(idx, 'avatars')}
                                      onDragOver={(e) => { e.preventDefault(); if(draggedType === 'avatars') e.currentTarget.classList.add('drag-over'); }}
                                      onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                                      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); handleDrop(idx, 'avatars'); }}
                                  >
                                      <div className="text-[#86868b] hover:text-[#1d1d1f] cursor-grab active:cursor-grabbing px-1 text-xs font-bold select-none transition-colors" title="Drag to reorder">
                                          ??
                                      </div>
                                      <div onClick={() => openImagePopup(url, '1:1')} className="w-8 h-8 rounded-full border border-[#e5e5ea] bg-[#f5f5f7] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#86868b] text-[10px] shadow-sm cursor-pointer hover:opacity-80 transition-opacity" title="Click to view full size">
                                          {url ? <img src={url} className="w-full h-full object-cover" onError={e => e.currentTarget.style.display='none'} /> : '??'}
                                      </div>
                                      <input type="text" value={url} placeholder="Paste asset URL..." onChange={e => {
                                          const newArr = [...presetAvatarsInput];
                                          newArr[idx] = e.target.value;
                                          setPresetAvatarsInput(newArr);
                                      }} className="apple-input-box flex-1 px-2.5 py-1 rounded-xl text-xs outline-none text-[#1d1d1f] font-medium" />
                                      <button type="button" onClick={() => moveItem(presetAvatarsInput, setPresetAvatarsInput, idx, -1)} disabled={idx === 0} className={\\\pple-btn w-6 h-6 text-[#1d1d1f] rounded-lg font-semibold text-[10px] flex items-center justify-center \\\\\\}>?</button>
                                      <button type="button" onClick={() => moveItem(presetAvatarsInput, setPresetAvatarsInput, idx, 1)} disabled={idx === presetAvatarsInput.length - 1} className={\\\pple-btn w-6 h-6 text-[#1d1d1f] rounded-lg font-semibold text-[10px] flex items-center justify-center \\\\\\}>?</button>
                                      <button type="button" onClick={() => setPresetAvatarsInput(presetAvatarsInput.filter((_, i) => i !== idx))} className="apple-btn w-6 h-6 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg font-semibold text-xs flex items-center justify-center flex-shrink-0">?</button>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-1">
                              <button type="button" onClick={() => setPresetAvatarsInput([...presetAvatarsInput, ''])} className="apple-btn-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px]">+</span>
                                  <span>Add URL</span>
                              </button>
                              <button type="button" onClick={() => openBulkModal('avatars')} className="apple-btn py-2.5 rounded-xl text-xs font-semibold text-[#1d1d1f] flex items-center justify-center gap-1.5 shadow-sm">
                                  <span className="text-[#86868b]">??</span>
                                  <span>Bulk Add</span>
                              </button>
                          </div>
                      </div>

                      {/* Presets Covers List */}
                      <div className="space-y-3 apple-card p-4 rounded-2xl border border-[#e5e5ea]">
                          <div className="flex justify-between items-center mb-1">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                                  <span>Preset Covers</span>
                                  <span className="px-2 py-0.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-md text-[9px] border border-[#d2d2d7] font-semibold">1200x400</span>
                              </label>
                              <span className="text-[10px] font-medium text-[#86868b] bg-white px-2 py-0.5 rounded-full border border-[#e5e5ea] shadow-sm">{presetCoversInput.length} items</span>
                          </div>
                          
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {presetCoversInput.map((url, idx) => (
                                  <div 
                                      key={idx} 
                                      className={\\\sorting-item flex items-center gap-2 bg-white/80 p-2 border border-[#e5e5ea] rounded-2xl shadow-sm hover:border-[#d2d2d7] \\\\\\}
                                      draggable
                                      onDragStart={() => handleDragStart(idx, 'covers')}
                                      onDragOver={(e) => { e.preventDefault(); if(draggedType === 'covers') e.currentTarget.classList.add('drag-over'); }}
                                      onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                                      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); handleDrop(idx, 'covers'); }}
                                  >
                                      <div className="text-[#86868b] hover:text-[#1d1d1f] cursor-grab active:cursor-grabbing px-1 text-xs font-bold select-none transition-colors" title="Drag to reorder">
                                          ??
                                      </div>
                                      <div onClick={() => openImagePopup(url, '3:1')} className="w-8 h-8 rounded-lg border border-[#e5e5ea] bg-[#f5f5f7] overflow-hidden flex-shrink-0 flex items-center justify-center text-[#86868b] text-[10px] shadow-sm cursor-pointer hover:opacity-80 transition-opacity" title="Click to view full size">
                                          {url ? <img src={url} className="w-full h-full object-cover" onError={e => e.currentTarget.style.display='none'} /> : '???'}
                                      </div>
                                      <input type="text" value={url} placeholder="Paste asset URL..." onChange={e => {
                                          const newArr = [...presetCoversInput];
                                          newArr[idx] = e.target.value;
                                          setPresetCoversInput(newArr);
                                      }} className="apple-input-box flex-1 px-2.5 py-1 rounded-xl text-xs outline-none text-[#1d1d1f] font-medium" />
                                      <button type="button" onClick={() => moveItem(presetCoversInput, setPresetCoversInput, idx, -1)} disabled={idx === 0} className={\\\pple-btn w-6 h-6 text-[#1d1d1f] rounded-lg font-semibold text-[10px] flex items-center justify-center \\\\\\}>?</button>
                                      <button type="button" onClick={() => moveItem(presetCoversInput, setPresetCoversInput, idx, 1)} disabled={idx === presetCoversInput.length - 1} className={\\\pple-btn w-6 h-6 text-[#1d1d1f] rounded-lg font-semibold text-[10px] flex items-center justify-center \\\\\\}>?</button>
                                      <button type="button" onClick={() => setPresetCoversInput(presetCoversInput.filter((_, i) => i !== idx))} className="apple-btn w-6 h-6 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg font-semibold text-xs flex items-center justify-center flex-shrink-0">?</button>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-1">
                              <button type="button" onClick={() => setPresetCoversInput([...presetCoversInput, ''])} className="apple-btn-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px]">+</span>
                                  <span>Add URL</span>
                              </button>
                              <button type="button" onClick={() => openBulkModal('covers')} className="apple-btn py-2.5 rounded-xl text-xs font-semibold text-[#1d1d1f] flex items-center justify-center gap-1.5 shadow-sm">
                                  <span className="text-[#86868b]">??</span>
                                  <span>Bulk Add</span>
                              </button>
                          </div>
                      </div>

                      \n;

content = content.replace(oldJsxPattern, newJsx);

fs.writeFileSync('src/blocks/AdminDashboardBlock.tsx', content);
console.log('Fixed');
