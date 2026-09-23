import React, { useState } from 'react';
import {
  X,
  Settings,
  Palette,
  User,
  Sliders,
  Database,
  Shield,
  Check,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Layers,
  DollarSign,
  HelpCircle,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  AppSettings,
  AppTheme,
  TableDensity,
  CurrencyFormat,
  NumberNotation,
  RedistributionStrategy,
  saveStoredSettings,
  applyThemeToDocument
} from '../utils/settingsEngine';
import { updateUserProfile, changeUserPassword } from '../utils/authEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onUserUpdated?: (user: AuthUser) => void;
  settings: AppSettings;
  onSettingsUpdated: (newSettings: AppSettings) => void;
  onOpenUserManagement?: () => void;
  onResetToDefaults?: () => void;
  rawRecordsCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  settings,
  onSettingsUpdated,
  onOpenUserManagement,
  onResetToDefaults,
  rawRecordsCount
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'account' | 'analytics' | 'data'>('theme');

  // Local settings state for immediate preview
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);

  // Profile update state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileDesignation, setProfileDesignation] = useState(currentUser?.designation || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password update state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  if (!isOpen) return null;

  const handleUpdateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...currentSettings, [key]: value };
    setCurrentSettings(updated);
    saveStoredSettings(updated);
    onSettingsUpdated(updated);
  };

  const handleThemeSelect = (theme: AppTheme) => {
    handleUpdateSetting('theme', theme);
    applyThemeToDocument(theme);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    if (!currentUser) return;

    const res = updateUserProfile(currentUser.id, {
      name: profileName,
      designation: profileDesignation
    });

    if (res.success && res.user) {
      setProfileSuccess('Profile updated successfully!');
      if (onUserUpdated) onUserUpdated(res.user);
      setTimeout(() => setProfileSuccess(''), 3500);
    } else {
      setProfileError(res.error || 'Failed to update profile.');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');
    if (!currentUser) return;

    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    const res = changeUserPassword(currentUser.id, currentPass, newPass);
    if (res.success) {
      setPassSuccess('Password changed successfully! Keep your new credentials safe.');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(''), 4000);
    } else {
      setPassError(res.error || 'Failed to change password.');
    }
  };

  const handleExportConfig = () => {
    const backupData = {
      version: '2.8.0',
      exportedAt: new Date().toISOString(),
      settings: currentSettings,
      developedBy: 'MD Shahadat Hossen',
      platform: 'DWL Analytics'
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DWL_Analytics_Settings_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>DWL Analytics Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-mono">
                  Preferences
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Theme, account credentials, analytical calculation rules &amp; system options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50 overflow-x-auto gap-2 py-2">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'theme'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme &amp; Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account &amp; Security</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Analytics Engine Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'data'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data &amp; System</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: THEME & APPEARANCE */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span>Color Theme Palette</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Select the visual atmosphere best suited for your workspace, showroom lighting, or projector display.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Obsidian Dark */}
                  <div
                    onClick={() => handleThemeSelect('obsidian')}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                      currentSettings.theme === 'obsidian'
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-2 border border-slate-800 mb-2.5 flex flex-col justify-between">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">Dark Charcoal</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-100">Obsidian Slate</div>
                        <div className="text-[10px] text-slate-400">Default Luxury Dark</div>
                      </div>
                      {currentSettings.theme === 'obsidian' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  {/* Executive Light */}
                  <div
                    onClick={() => handleThemeSelect('light')}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                      currentSettings.theme === 'light'
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-gradient-to-br from-slate-100 via-white to-slate-200 p-2 border border-slate-300 mb-2.5 flex flex-col justify-between">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-900"></div>
                      </div>
                      <div className="text-[10px] text-slate-800 font-mono font-bold">Crisp Day Mode</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-100">Executive Light</div>
                        <div className="text-[10px] text-slate-400">High-Clarity Daylight</div>
                      </div>
                      {currentSettings.theme === 'light' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  {/* Midnight Indigo */}
                  <div
                    onClick={() => handleThemeSelect('midnight')}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                      currentSettings.theme === 'midnight'
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-2 border border-indigo-800/50 mb-2.5 flex flex-col justify-between">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      </div>
                      <div className="text-[10px] text-indigo-300 font-mono">Deep Royal Navy</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-100">Midnight Indigo</div>
                        <div className="text-[10px] text-slate-400">Deep Executive Navy</div>
                      </div>
                      {currentSettings.theme === 'midnight' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  {/* Emerald Monokai */}
                  <div
                    onClick={() => handleThemeSelect('emerald')}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                      currentSettings.theme === 'emerald'
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="h-16 rounded-lg bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-2 border border-emerald-800/40 mb-2.5 flex flex-col justify-between">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                        <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                      </div>
                      <div className="text-[10px] text-emerald-300 font-mono">Emerald Matrix</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-100">Emerald Jade</div>
                        <div className="text-[10px] text-slate-400">Sales Growth &amp; Profits</div>
                      </div>
                      {currentSettings.theme === 'emerald' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Density */}
              <div className="border-t border-slate-800 pt-5">
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Table Row Density</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Adjust information density in matrix tables, movement logs, and stock sheets.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'compact', name: 'Compact Density', desc: 'Maximum rows visible, tighter padding (Best for large inventory audits)' },
                    { id: 'standard', name: 'Standard Density', desc: 'Balanced row height and readability (Recommended default)' },
                    { id: 'comfortable', name: 'Comfortable Density', desc: 'Larger tap targets & spacious rows (Great for tablet screens)' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleUpdateSetting('density', d.id as TableDensity)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentSettings.density === d.id
                          ? 'bg-blue-500/10 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{d.name}</span>
                        {currentSettings.density === d.id && (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Toggles */}
              <div className="border-t border-slate-800 pt-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 mb-1">Visual Highlights &amp; Automation</h3>
                
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Highlight Deficits &amp; Stockouts in Red</div>
                    <div className="text-[11px] text-slate-400">Emphasize branches and diamonds suffering immediate inventory deficits</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.highlightDeficits}
                    onChange={(e) => handleUpdateSetting('highlightDeficits', e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Auto-Save Session State</div>
                    <div className="text-[11px] text-slate-400">Persist active filters, uploaded data, and selected timeframe across reloads</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentSettings.autoSaveSession}
                    onChange={(e) => handleUpdateSetting('autoSaveSession', e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT & SECURITY */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {currentUser ? (
                <>
                  {/* Current User Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${currentUser.avatarColor || 'from-cyan-500 to-blue-600'} flex items-center justify-center text-lg font-bold text-white shadow-md uppercase`}>
                        {currentUser.username.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{currentUser.name}</h4>
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            currentUser.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : currentUser.role === 'manager'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {currentUser.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">Username: <span className="text-cyan-300">@{currentUser.username}</span> • {currentUser.designation || 'Specialist'}</p>
                      </div>
                    </div>

                    {onOpenUserManagement && (
                      <button
                        onClick={onOpenUserManagement}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Manage All Users</span>
                      </button>
                    )}
                  </div>

                  {/* Edit Profile Form */}
                  <form onSubmit={handleSaveProfile} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Update Profile Information</span>
                    </h4>

                    {profileSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}
                    {profileError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Full Display Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="e.g. MD Shahadat Hossen"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Designation / Title</label>
                        <input
                          type="text"
                          value={profileDesignation}
                          onChange={(e) => setProfileDesignation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="e.g. Lead Inventory Strategist"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-all active:scale-95"
                      >
                        Save Profile Details
                      </button>
                    </div>
                  </form>

                  {/* Change Password Form */}
                  <form onSubmit={handlePasswordChange} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change Account Password</span>
                    </h4>

                    {passSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{passSuccess}</span>
                      </div>
                    )}
                    {passError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{passError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="Min 3 characters"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="Repeat new password"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition-all active:scale-95"
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active user session detected. Please sign in.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANALYTICS ENGINE RULES */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Redistribution &amp; Allocation Algorithm</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Define how the mathematical model calculates deserved stock and withdrawal recommendations.
                </p>

                <div className="space-y-3">
                  {[
                    {
                      id: 'proportional',
                      title: 'Sales Contribution Proportional (Standard DWL Formula)',
                      desc: 'Deserved stock is calculated strictly based on each branch’s percentage contribution to total network sales. Fair and balanced.'
                    },
                    {
                      id: 'aggressive_velocity',
                      title: 'Velocity-Boosted Aggressive Growth',
                      desc: 'Adds a +15% stock bonus to top-quartile outlets to maximize revenue capture during high-demand retail seasons.'
                    },
                    {
                      id: 'balanced_safety',
                      title: 'Baseline Protected Safety Model',
                      desc: 'Guarantees that every branch keeps at least a minimum display representation before surplus is mobilized.'
                    }
                  ].map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleUpdateSetting('strategy', s.id as RedistributionStrategy)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        currentSettings.strategy === s.id
                          ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-100">{s.title}</span>
                        {currentSettings.strategy === s.id && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency & Notation */}
              <div className="border-t border-slate-800 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Currency Symbol &amp; Valuation Unit
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Used in consignment recommendations and estimated stock values</p>
                  <select
                    value={currentSettings.currency}
                    onChange={(e) => handleUpdateSetting('currency', e.target.value as CurrencyFormat)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BDT">৳ BDT (Bangladeshi Taka)</option>
                    <option value="USD">$ USD (United States Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="INR">₹ INR (Indian Rupee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Number Format / Notation
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Display format for large quantities and financial figures</p>
                  <select
                    value={currentSettings.numberNotation}
                    onChange={(e) => handleUpdateSetting('numberNotation', e.target.value as NumberNotation)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="south_asian">South Asian (1,00,000 Lakh / Crore)</option>
                    <option value="international">International Standard (100,000 Millions)</option>
                  </select>
                </div>
              </div>

              {/* Stock Aging & Buffer Thresholds */}
              <div className="border-t border-slate-800 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Minimum Branch Safety Buffer (Pcs)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Reserved display units protected from withdrawal recommendations</p>
                  <select
                    value={currentSettings.minBranchSafetyBuffer}
                    onChange={(e) => handleUpdateSetting('minBranchSafetyBuffer', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="0">0 Pcs (Pure sales efficiency - no reserve)</option>
                    <option value="1">1 Pc (Keep at least 1 unit in active selling branches)</option>
                    <option value="2">2 Pcs (Higher buffer for prominent flagship outlets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Dormant / Aging Stock Alert Horizon
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Flag diamonds with zero velocity exceeding this age threshold</p>
                  <select
                    value={currentSettings.agingWarningDays}
                    onChange={(e) => handleUpdateSetting('agingWarningDays', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="90">90 Days (Aggressive inventory turnover)</option>
                    <option value="180">180 Days (Standard fine jewelry audit cycle)</option>
                    <option value="365">365 Days (1 Year dormant threshold)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & SYSTEM */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Data Persistence &amp; Backup</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Export complete software configuration, session parameters, and audit setups.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleExportConfig}
                    className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-emerald-500/40 text-left transition-all flex items-start gap-3 group"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                        Export Settings JSON
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Download backup file of your customized theme, thresholds &amp; preferences
                      </div>
                    </div>
                  </button>

                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-left flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Active Records Status</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <strong className="text-cyan-400">{rawRecordsCount.toLocaleString()}</strong> rows indexed in working memory
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Details */}
              <div className="border-t border-slate-800 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Specification</span>
                </h4>

                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Software Application:</span>
                    <span className="text-slate-200 font-bold">DWL Analytics</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Software Lead Architect:</span>
                    <span className="text-cyan-300 font-semibold">MD Shahadat Hossen</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Analytical Engine:</span>
                    <span className="text-slate-200">Universal Jewelry Deserved Stock &amp; Redistribution Engine</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>AI Copilot Engine:</span>
                    <span className="text-amber-400">Gemini 3.8 Flash (Server-Side)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Client Storage:</span>
                    <span className="text-emerald-400">Encrypted Local Storage (Multi-User RBAC)</span>
                  </div>
                </div>

                {onResetToDefaults && (
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Need to restore original default parameters?</span>
                    <button
                      onClick={onResetToDefaults}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset to Factory Defaults</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">DWL Analytics</span>
            <span>•</span>
            <span>Developed by <strong className="text-cyan-400">MD Shahadat Hossen</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
