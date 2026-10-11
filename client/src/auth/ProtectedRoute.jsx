import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Shield } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
          <Shield className="w-8 h-8" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
          <span className="ml-2 font-medium">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
