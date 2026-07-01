import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetBranding } = useSchoolTheme();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    resetBranding();
  }, [resetBranding]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (!token) {
      setMessage('Reset token is missing or invalid.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to reset password');
      }

      setMessage(data.message || 'Password updated successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
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
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">New Password</p>
          <h1 className="mt-3 text-3xl font-black">Create a new password</h1>
          <p className="mt-2 text-sm text-white/70">Use the link from your email to set a secure password.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">New Password</label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
              placeholder="Enter a new password"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Confirm Password</label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
              placeholder="Repeat the new password"
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
            {loading ? 'Updating password...' : 'Update password'}
          </button>

          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="font-bold text-slate-900 hover:underline">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}