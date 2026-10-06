import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { getReadableErrorMessage } from '@/src/utils/errors';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Nama lengkap / panggilan wajib diisi.');
        }
        await registerWithEmail(email, password, displayName);
      }
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-stone-100 antialiased selection:bg-emerald-900 selection:text-emerald-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Positioning */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F5132] border border-emerald-600/50 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60">
            <Sparkles className="w-6 h-6 text-emerald-300" />
          </div>
        </div>
        <h2 className="text-center text-2xl md:text-3xl font-extrabold tracking-tight text-stone-100">
          MarketFlow <span className="text-emerald-500">BI</span>
        </h2>
        <p className="mt-2 text-center text-xs md:text-sm text-stone-400">
          Dari data marketplace menjadi keputusan bisnis.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-stone-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-stone-800/90 sm:px-10">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-stone-950 p-1 mb-6 border border-stone-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-stone-800 text-stone-100 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-stone-800 text-stone-100 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <Input
                label="Nama Lengkap / Nama Bisnis"
                type="text"
                placeholder="Contoh: Andi Pratama"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Kata Sandi (Password)"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'login' ? 'Masuk ke MarketFlow' : 'Mulai Sekarang — Gratis'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-stone-900 px-2 text-stone-500 font-medium">atau masuk dengan</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-stone-700 rounded-lg shadow-xs text-xs font-medium text-stone-200 bg-stone-800/80 hover:bg-stone-800 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Lanjutkan dengan Google</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Multi-Tenant terisolasi dengan Firebase Security Rules</span>
          </div>
        </div>
      </div>
    </div>
  );
};
