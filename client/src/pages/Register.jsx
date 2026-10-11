import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Real-time password requirement checklist
  const criteria = useMemo(() => {
    return [
      { label: 'At least 10 characters', met: password.length >= 10 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains a number', met: /[0-9]/.test(password) },
      { label: 'Contains a special character', met: /[^A-Za-z0-9]/.test(password) }
    ];
  }, [password]);

  const score = criteria.filter((c) => c.met).length;

  const strengthColor = score <= 2 ? 'bg-rose-500' : score <= 4 ? 'bg-amber-500' : 'bg-emerald-500';

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/20 mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
          Create an Account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Join SecureCloud for zero-knowledge encrypted storage
        </p>
      </div>

      {/* Register Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 10 characters"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-2 pt-1.5">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300`}
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                    {criteria.map((c, i) => (
                      <div key={i} className="flex items-center space-x-1">
                        {c.met ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className={c.met ? 'text-slate-200' : 'text-slate-500'}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-confirm"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/40'
                        : 'border-rose-500/60 focus:ring-2 focus:ring-rose-500/40'
                      : 'border-slate-700/80 focus:ring-2 focus:ring-indigo-500/50'
                  }`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !passwordsMatch || password.length < 10}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
