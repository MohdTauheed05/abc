import { useState, type FormEvent } from 'react';
import { Droplet, ArrowLeft, LogIn, AlertCircle, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid administrator email or password. Please verify your credentials in Firebase Authentication.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-canvas text-ink font-body flex flex-col">
      <div className="px-6 sm:px-10 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-ink/60 hover:text-ink text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to storefront
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md bg-surface border border-line/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Droplet size={24} fill="#D97B2E" className="text-[#D97B2E]" />
            <span className="font-display text-2xl uppercase tracking-wide">ABC Lubricants</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <Lock size={16} className="text-[#D97B2E]" />
            <h1 className="font-display text-2xl uppercase text-center">Admin Portal</h1>
          </div>
          <p className="text-xs text-ink/50 mb-6 text-center">
            Sign in with your Firebase Authentication user email and password to manage grades and artwork.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 mb-6 text-red-300 text-xs leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-semibold uppercase tracking-widest text-ink/50 mb-1.5"
              >
                Admin Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-tint/5 border border-line/15 px-3.5 py-2.5 text-sm focus:border-line/50 outline-none transition-colors text-ink placeholder-ink/20"
                placeholder="touheedshaikh8@gmail.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold uppercase tracking-widest text-ink/50 mb-1.5"
              >
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-tint/5 border border-line/15 px-3.5 py-2.5 text-sm focus:border-line/50 outline-none transition-colors text-ink placeholder-ink/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#D97B2E] text-ink hover:bg-[#c46b23] font-bold text-xs uppercase tracking-wider py-3 mt-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <LogIn size={15} />
              {submitting ? 'Authenticating with Firebase…' : 'Sign in with Firebase Auth'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-line/10 text-center">
            <p className="text-[11px] text-ink/40">
              Only authorized administrators registered in Firebase Authentication can log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
