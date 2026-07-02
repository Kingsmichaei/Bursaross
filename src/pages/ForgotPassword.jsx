import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetBranding } = useSchoolTheme();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [role, setRole] = useState(searchParams.get('role') === 'teacher' ? 'teacher' : 'admin');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    resetBranding();
  }, [resetBranding]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to request password reset');
      }

      setMessage(data.message || 'Check your email for the reset link.');
      setEmail('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">Account Recovery</p>
          <h1 className="mt-3 text-3xl font-black">Reset your password</h1>
          <p className="mt-2 text-sm text-white/70">We’ll email a secure reset link to the address on the account.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button type="button" onClick={() => setRole('admin')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Admin
            </button>
            <button type="button" onClick={() => setRole('teacher')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Teacher
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={role === 'admin' ? 'admin@school.com' : 'teacher@school.com'}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
            />
          </div>

          {message ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl school-primary-bg px-4 py-3 text-sm font-bold text-white hover:opacity-95 transition-colors disabled:opacity-70"
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Remembered it? <Link to="/login" className="font-bold text-slate-900 hover:underline">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}