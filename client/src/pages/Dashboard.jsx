import { useAuth } from '../auth/AuthContext';
import {
  Shield,
  HardDrive,
  Lock,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Share2,
  FileText,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();

  const quotaMB = Math.round((user?.storageQuotaBytes || 104857600) / (1024 * 1024));
  const usedMB = Math.round((user?.storageUsedBytes || 0) / (1024 * 1024));
  const usedPercent = Math.min(100, Math.round((usedMB / (quotaMB || 1)) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              SecureCloud
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-slate-200">{user?.email}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition flex items-center space-x-1.5 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Security Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Zero-knowledge vault and controlled file sharing manager
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4" />
            <span>Session Active (HttpOnly JWT + Rotating Refresh)</span>
          </div>
        </div>

        {/* Analytics & Quota Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Storage Quota Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Storage Allocation
              </span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {usedMB} MB{' '}
                <span className="text-sm text-slate-400 font-normal">/ {quotaMB} MB</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Free-Tier Enforced Quota</p>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{usedPercent}% Used</span>
                <span>{quotaMB - usedMB} MB Remaining</span>
              </div>
            </div>
          </div>

          {/* Encryption State Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Client Encryption
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>AES-256-GCM</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Web Crypto Zero-Knowledge</p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Keys are generated client-side and never reach the server in plaintext.
            </div>
          </div>

          {/* Sharing Controls Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Controlled Sharing
              </span>
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">SHA-256 Hashed</div>
              <p className="text-xs text-slate-400 mt-0.5">URL Fragment Key Injection</p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              Raw tokens shown once; access revocable instantly with expiration limits.
            </div>
          </div>
        </div>

        {/* Upcoming Phases Roadmap Card */}
        <div className="glass-panel p-8 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Project Roadmap Status</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-300">
                  Phase 0: Workspace Scaffolding
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Vite, Express, Tailwind, Mongoose connection, Supabase config, and Windows docs
                  verified.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-indigo-300">
                  Phase 1: Hardened Authentication
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Argon2id, rotating refresh tokens, reuse detection, httpOnly cookies, CSRF
                  double-submit, and ProtectedRoute.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start space-x-3 text-slate-500">
              <FileText className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-400">Phase 2: File Management</span>
                <p className="text-xs text-slate-500 mt-1">
                  Multipart uploads to Supabase private storage, quota enforcement, MIME sniffing,
                  and scoped queries.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start space-x-3 text-slate-500">
              <Activity className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-400">
                  Phase 3-6: Sharing, Crypto, Audit
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Expiring share links, AES-256-GCM zero-knowledge client crypto, audit logs, and
                  viva documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
