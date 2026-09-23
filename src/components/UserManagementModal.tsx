import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  Trash2,
  KeyRound,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Crown
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  getManagedUsers,
  approveUser,
  rejectUser,
  resetManagedUserPassword,
  deleteManagedUser
} from '../utils/authEngine';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetFor, setResetFor] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await getManagedUsers());
    } catch (e: any) {
      setError(e.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser?.isOwner) refresh();
  }, [isOpen, currentUser?.isOwner]);

  const pending = useMemo(() => users.filter(u => u.status === 'pending'), [users]);
  const recovery = useMemo(() => users.filter(u => Boolean(u.resetRequestedAt) && !u.isOwner), [users]);
  const active = useMemo(() => users.filter(u => u.status === 'approved'), [users]);

  if (!isOpen || !currentUser?.isOwner) return null;

  const run = async (action: () => Promise<any>, successText: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successText);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Action failed.');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    if (newPassword.trim().length < 4) {
      setError('Temporary password must be at least 4 characters.');
      return;
    }
    await run(
      () => resetManagedUserPassword(resetFor.id, newPassword.trim()),
      `Password reset completed for @${resetFor.username}.`
    );
    setNewPassword('');
    setResetFor(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Owner Access Control
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SYSTEM OWNER
                </span>
              </h3>
              <p className="text-xs text-slate-400">Approve accounts, handle recovery requests and revoke non-owner access.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {message && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />{message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Approved', active.length, 'bg-emerald-500/5 border-emerald-500/20'],
              ['Pending', pending.length, 'bg-amber-500/5 border-amber-500/20'],
              ['Recovery', recovery.length, 'bg-rose-500/5 border-rose-500/20'],
              ['Owner', users.filter(u => u.isOwner).length, 'bg-indigo-500/5 border-indigo-500/20']
            ].map(([label, value, cardClass]) => (
              <div key={label as string} className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                <p className="text-xl font-black text-white mt-1">{value as number}</p>
              </div>
            ))}
          </div>

          {pending.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm"><UserCheck className="w-4 h-4 text-amber-300" /> Pending Approval</div>
              <div className="space-y-2">
                {pending.map(user => (
                  <div key={user.id} className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">@{user.username} • Requested {user.createdAt}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => run(() => approveUser(user.id), `@${user.username} approved.`)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Approve</button>
                      <button onClick={() => run(() => rejectUser(user.id), `@${user.username} rejected.`)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-200 text-xs font-bold border border-slate-700">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recovery.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm"><LockKeyhole className="w-4 h-4 text-rose-300" /> Password Recovery Requests</div>
              <div className="space-y-2">
                {recovery.map(user => (
                  <div key={user.id} className="p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">{user.name} <span className="text-slate-500 font-normal">(@{user.username})</span></div>
                      <div className="text-xs text-slate-400">Requested {new Date(user.resetRequestedAt as string).toLocaleString()}</div>
                    </div>
                    <button onClick={() => setResetFor(user)} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Set New Password
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm"><Users className="w-4 h-4 text-cyan-300" /> All Accounts</div>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
              {users.map(user => (
                <div key={user.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white ${user.isOwner ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{user.name}</span>
                        {user.isOwner && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">OWNER</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">@{user.username} • {user.status} • uploads + exports only{user.isOwner ? ' • full control' : ''}</div>
                    </div>
                  </div>
                  {!user.isOwner && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setResetFor(user)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Reset password">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => run(() => deleteManagedUser(user.id), `@${user.username} removed.`)} className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" title="Revoke access">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-800/30 text-xs text-indigo-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
            <span>The <strong>admin</strong> account is the immutable system-owner account. It cannot be removed or replaced through the application.</span>
          </div>
        </div>
      </div>

      {resetFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70">
          <form onSubmit={handleReset} className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div><h4 className="text-white font-bold">Reset Password</h4><p className="text-xs text-slate-400 mt-1">@{resetFor.username}</p></div>
              <button type="button" onClick={() => setResetFor(null)} className="p-1.5 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <input autoFocus type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Temporary / new password" className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
            <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold">Save New Password</button>
          </form>
        </div>
      )}
    </div>
  );
};
