import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Droplet, Calendar, ShieldCheck, Edit3, Save, X, Lock, Copy, Check, MapPin, Camera, Loader2 } from 'lucide-react';
import { divisionNamesWithSuffix, getDistrictsForDivision } from '../data/locationData';
import { uploadImageAsset } from '../lib/storage';

export const UserProfileBlock: React.FC = () => {
  const { user, updateProfile, showToast, siteConfig } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState<string | null>(null);
  const [selectedCoverPreset, setSelectedCoverPreset] = useState<string | null>(null);

  const coverPresets = siteConfig?.presetCovers?.length ? siteConfig.presetCovers : [
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
  ];

  const avatarPresets = siteConfig?.presetAvatars?.length ? siteConfig.presetAvatars : [
    'https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png'
  ];

  // Editable fields
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [emergencyContact, setEmergencyContact] = useState(user.emergencyContact || '+880 1811-998877');
  const [address, setAddress] = useState(user.address || 'Road 11, Banani, Dhaka 1213');
  const [division, setDivision] = useState(user.division || 'Dhaka Division');
  const [district, setDistrict] = useState(user.district || 'Dhaka');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup);
  const [sex, setSex] = useState(user.sex);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(user.coverUrl);

  useEffect(() => {
    if (!isEditing) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setEmergencyContact(user.emergencyContact || '');
      setAddress(user.address || '');
      setDivision(user.division || 'Dhaka Division');
      setDistrict(user.district || 'Dhaka');
      setBloodGroup(user.bloodGroup || 'A+');
      setSex(user.sex || 'Male');
      setAvatarUrl(user.avatarUrl || '');
      setCoverUrl(user.coverUrl || '');
    }
  }, [user, isEditing]);

  const getAgeString = (dob: string | undefined) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    const lastBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (lastBirthday > today) {
      lastBirthday.setFullYear(today.getFullYear() - 1);
    }
    const days = Math.floor((today.getTime() - lastBirthday.getTime()) / (1000 * 60 * 60 * 24));
    return `${years} Years, ${days} Days`;
  };

  const displayUserId = user.userId || 'RD982745';
  const isUserVerified = user.verified || user.status === 'Verified';

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(displayUserId);
    setCopiedId(true);
    showToast(`Copied User ID: ${displayUserId}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.trim() === emergencyContact.trim()) {
      showToast('WhatsApp Contact Number and Emergency Contact Number cannot be the same!', true);
      return;
    }

    updateProfile({
      fullName,
      phone,
      emergencyContact,
      address,
      division,
      district,
      bloodGroup,
      sex,
      avatarUrl,
      coverUrl,
    });
    setIsEditing(false);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      showToast('Uploading profile photo to database storage...');
      const permanentUrl = await uploadImageAsset(file, avatarUrl);
      setAvatarUrl(permanentUrl);
      updateProfile({ avatarUrl: permanentUrl });
      showToast('Profile photo saved to database permanently!');
    } catch (err: any) {
      showToast('Upload failed: ' + (err.message || 'Unknown error'), true);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      showToast('Uploading cover photo to database storage...');
      const permanentUrl = await uploadImageAsset(file, coverUrl);
      setCoverUrl(permanentUrl);
      updateProfile({ coverUrl: permanentUrl });
      showToast('Cover photo saved to database permanently!');
    } catch (err: any) {
      showToast('Upload failed: ' + (err.message || 'Unknown error'), true);
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-w-3xl mx-auto font-sans">
      {/* Cover Photo Header */}
      <div className="h-44 sm:h-52 bg-slate-200 relative group">
        <img
          src={coverUrl || user.coverUrl || siteConfig?.defaultCover || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800"}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/20">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>{user.district || 'Dhaka'}, {user.division || 'Dhaka Division'}</span>
        </div>

        {/* Change Cover Button */}
        {isEditing && (
          siteConfig?.allowCustomAvatars ? (
            <label className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all border border-white/30 shadow-md">
              {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>Change Cover</span>
              <input type="file" accept="image/*" onChange={handleCoverFileChange} disabled={isUploadingCover} className="hidden" />
            </label>
          ) : (
            <button type="button" onClick={() => setShowCoverSelector(true)} className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all border border-white/30 shadow-md">
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover</span>
            </button>
          )
        )}
      </div>

      <div className="p-5 sm:p-6 relative pt-0">
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
          <div className="relative group">
            <img
              src={avatarUrl || siteConfig?.defaultAvatar || "https://saminyeasirhasan.com/Images/PROFILE%20PHOTO.png"}
              alt={user.fullName || "User Profile"}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white object-cover shadow-md bg-white"
            />
            {isEditing && (
              siteConfig?.allowCustomAvatars ? (
                <label className="absolute bottom-0 right-0 p-2 bg-rose-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-rose-700 transition-all border-2 border-white">
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input type="file" accept="image/*" onChange={handlePhotoFileChange} disabled={isUploadingAvatar} className="hidden" />
                </label>
              ) : (
                <button type="button" onClick={() => setShowAvatarSelector(true)} className="absolute bottom-0 right-0 p-2 bg-rose-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-rose-700 transition-all border-2 border-white">
                  <Camera className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              {isEditing ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* User Identity Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{user.fullName}</h2>
              {isUserVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                  Active Member
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Last Donation: <span className="font-bold">{user.lastDonatedDate || 'No records found'}</span>
            </p>
          </div>

          {/* Prominent User ID Display */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
            <div>
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Unique User ID</span>
              <span className="font-mono font-black text-rose-600 text-sm">{displayUserId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyUserId}
              title="Copy User ID"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Email Address (Registered)
              </span>
              <strong className="text-xs font-semibold text-slate-800">{user.email}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">WhatsApp Contact Number</span>
              <strong className="text-xs font-semibold text-slate-800">{user.phone}</strong>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
              <span className="text-[10px] font-black text-rose-600 uppercase block mb-0.5 flex items-center gap-1">
                🚨 Emergency Contact Number
              </span>
              <strong className="text-xs font-black text-rose-700">{user.emergencyContact || '+880 1811-998877'}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Blood Group</span>
              <strong className="text-xs font-extrabold text-rose-600">{user.bloodGroup}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Division & District</span>
              <strong className="text-xs font-semibold text-slate-800">{user.district || 'Dhaka'}, {user.division || 'Dhaka Division'}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Residential Address</span>
              <strong className="text-xs font-semibold text-slate-800">{user.address || 'Road 11, Banani, Dhaka 1213'}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Sex</span>
              <strong className="text-xs font-semibold text-slate-800">{user.sex || 'Male'}</strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Age
              </span>
              <strong className="text-xs font-semibold text-slate-800">{getAgeString(user.dob)}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-200">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Locked User ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Unique User ID (Non-Editable)
                </label>
                <input
                  type="text"
                  disabled
                  value={displayUserId}
                  className="w-full p-2 text-xs border border-slate-200 bg-slate-100 rounded-lg font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Locked Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Email Address (Non-Editable)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full p-2 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-600 cursor-not-allowed font-medium"
                />
              </div>

              {/* Editable Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-semibold text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Editable WhatsApp Contact Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">WhatsApp Contact Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-medium text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Editable Emergency Contact */}
              <div>
                <label className="block text-[11px] font-bold text-rose-700 mb-0.5">🚨 Emergency Contact Number</label>
                <input
                  type="tel"
                  required
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full p-2 text-xs border border-rose-300 bg-rose-50/50 rounded-lg font-bold text-rose-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Editable Blood Group */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-bold text-rose-600 focus:border-rose-500 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Division */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Division</label>
                <select
                  value={division}
                  onChange={(e) => {
                    const newDiv = e.target.value;
                    setDivision(newDiv);
                    const dists = getDistrictsForDivision(newDiv);
                    if (dists.length > 0 && !dists.includes(district)) {
                      setDistrict(dists[0]);
                    }
                  }}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-medium focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  {divisionNamesWithSuffix.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable District */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-medium focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  {getDistrictsForDivision(division).map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Sex */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-medium focus:border-rose-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Locked Age */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Age (Non-Editable)
                </label>
                <input
                  type="text"
                  disabled
                  value={getAgeString(user.dob)}
                  className="w-full p-2 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-600 cursor-not-allowed font-medium"
                />
              </div>

              {/* Editable Address */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Full Residential Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg font-medium text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Editable Profile Photo Image Link */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Profile Photo Image URL (or upload above)</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg font-mono text-slate-700 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cover Presets</label>
              <div className="grid grid-cols-3 gap-2">
                {coverPresets.map((preset, idx) => (
                  <img
                    key={idx}
                    src={preset}
                    alt={`Preset ${idx}`}
                    onClick={() => setCoverUrl(preset)}
                    className={`w-full h-16 object-cover rounded-lg border-2 cursor-pointer transition-all ${
                      coverUrl === preset ? 'border-rose-600 scale-102' : 'border-slate-200 opacity-80'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Preset Selection Modals */}
      {showAvatarSelector && (
        <div style={{ display: 'flex', position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", boxSizing: 'border-box' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '18px 20px 14px 20px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', background: 'rgba(255, 241, 242, 0.9)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', border: '1px solid rgba(255, 228, 230, 0.5)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Select Avatar</h3>
              </div>
              <button type="button" onClick={() => setShowAvatarSelector(false)} style={{ width: '30px', height: '30px', background: 'rgba(248, 250, 252, 0.9)', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden', padding: '2px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
                {avatarPresets.map((preset, i) => {
                  const isSelected = selectedAvatarPreset === preset;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedAvatarPreset(preset)}
                      className="group"
                      style={{ position: 'relative', width: '68px', height: '68px', borderRadius: '50%', cursor: 'pointer', background: '#ffffff', boxSizing: 'border-box', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}
                    >
                      <img src={preset} alt={`Avatar ${i}`} className="group-hover:scale-105 transition-all duration-200" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block', border: isSelected ? 'none' : '3px solid rgba(226, 232, 240, 0.9)', pointerEvents: 'none', boxShadow: isSelected ? '0 0 0 3px rgba(244, 63, 94, 0.25), 0 6px 14px rgba(244, 63, 94, 0.2)' : '0 3px 10px rgba(0, 0, 0, 0.04)', borderColor: isSelected ? '#f43f5e' : 'rgba(226, 232, 240, 0.9)', borderWidth: '3px', borderStyle: 'solid' }} />
                      {isSelected && (
                        <div style={{ display: 'flex', position: 'absolute', bottom: '0px', right: '0px', backgroundColor: '#f43f5e', color: 'white', borderRadius: '50%', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(244, 63, 94, 0.4)', border: '2px solid white', pointerEvents: 'none' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '12px', display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowAvatarSelector(false)} style={{ flex: 1, padding: '10px 16px', background: '#ffffff', border: '1px solid rgba(203, 213, 225, 0.8)', borderRadius: '9999px', fontWeight: 600, fontSize: '13.5px', color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }} onMouseOver={(e) => e.currentTarget.style.background='#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background='#ffffff'}>
                Cancel
              </button>
              <button 
                type="button" 
                disabled={!selectedAvatarPreset}
                onClick={() => {
                  if (selectedAvatarPreset) {
                    setAvatarUrl(selectedAvatarPreset);
                    updateProfile({ avatarUrl: selectedAvatarPreset });
                    setShowAvatarSelector(false);
                    showToast('Avatar updated!');
                  }
                }}
                style={{ flex: 1, padding: '10px 16px', background: selectedAvatarPreset ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(203, 213, 225, 0.6)', border: selectedAvatarPreset ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent', borderRadius: '9999px', fontWeight: 600, fontSize: '13.5px', color: 'white', cursor: selectedAvatarPreset ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: selectedAvatarPreset ? '0 6px 16px rgba(244, 63, 94, 0.35)' : 'none' }}
                onMouseOver={(e) => { if(selectedAvatarPreset) e.currentTarget.style.background = 'linear-gradient(135deg, #e11d48, #be123c)'; }}
                onMouseOut={(e) => { if(selectedAvatarPreset) e.currentTarget.style.background = 'linear-gradient(135deg, #f43f5e, #e11d48)'; }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoverSelector && (
        <div style={{ display: 'flex', position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", boxSizing: 'border-box' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '18px 20px 14px 20px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', background: 'rgba(255, 241, 242, 0.9)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', border: '1px solid rgba(255, 228, 230, 0.5)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Select Cover Photo</h3>
              </div>
              <button type="button" onClick={() => setShowCoverSelector(false)} style={{ width: '30px', height: '30px', background: 'rgba(248, 250, 252, 0.9)', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden', padding: '2px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
              <div className="grid grid-cols-2 gap-3 justify-items-center">
                {coverPresets.map((preset, i) => {
                  const isSelected = selectedCoverPreset === preset;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedCoverPreset(preset)}
                      className="group"
                      style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '12px', cursor: 'pointer', background: '#ffffff', boxSizing: 'border-box', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}
                    >
                      <img src={preset} alt={`Cover ${i}`} className="group-hover:scale-105 transition-all duration-200" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', display: 'block', border: isSelected ? 'none' : '3px solid rgba(226, 232, 240, 0.9)', pointerEvents: 'none', boxShadow: isSelected ? '0 0 0 3px rgba(244, 63, 94, 0.25), 0 6px 14px rgba(244, 63, 94, 0.2)' : '0 3px 10px rgba(0, 0, 0, 0.04)', borderColor: isSelected ? '#f43f5e' : 'rgba(226, 232, 240, 0.9)', borderWidth: '3px', borderStyle: 'solid' }} />
                      {isSelected && (
                        <div style={{ display: 'flex', position: 'absolute', bottom: '-6px', right: '-6px', backgroundColor: '#f43f5e', color: 'white', borderRadius: '50%', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(244, 63, 94, 0.4)', border: '2px solid white', pointerEvents: 'none' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: '12px', display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowCoverSelector(false)} style={{ flex: 1, padding: '10px 16px', background: '#ffffff', border: '1px solid rgba(203, 213, 225, 0.8)', borderRadius: '9999px', fontWeight: 600, fontSize: '13.5px', color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }} onMouseOver={(e) => e.currentTarget.style.background='#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background='#ffffff'}>
                Cancel
              </button>
              <button 
                type="button" 
                disabled={!selectedCoverPreset}
                onClick={() => {
                  if (selectedCoverPreset) {
                    setCoverUrl(selectedCoverPreset);
                    updateProfile({ coverUrl: selectedCoverPreset });
                    setShowCoverSelector(false);
                    showToast('Cover photo updated!');
                  }
                }}
                style={{ flex: 1, padding: '10px 16px', background: selectedCoverPreset ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(203, 213, 225, 0.6)', border: selectedCoverPreset ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent', borderRadius: '9999px', fontWeight: 600, fontSize: '13.5px', color: 'white', cursor: selectedCoverPreset ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: selectedCoverPreset ? '0 6px 16px rgba(244, 63, 94, 0.35)' : 'none' }}
                onMouseOver={(e) => { if(selectedCoverPreset) e.currentTarget.style.background = 'linear-gradient(135deg, #e11d48, #be123c)'; }}
                onMouseOut={(e) => { if(selectedCoverPreset) e.currentTarget.style.background = 'linear-gradient(135deg, #f43f5e, #e11d48)'; }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
