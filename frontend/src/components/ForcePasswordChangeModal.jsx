import { useState } from 'react';

export default function ForcePasswordChangeModal({ isOpen, onSuccess }) {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // If it's not open, render nothing
  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend Security Validations
    if (formData.new_password !== formData.confirm_password) {
      return setError('New passwords do not match!');
    }
    if (formData.new_password.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }

    setLoading(true);
    const token = localStorage.getItem('bursaros_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: formData.old_password,
          new_password: formData.new_password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update password');

      // Unlocks the dashboard!
      onSuccess(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-yellow-50 text-center">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-xl font-black text-gray-900">Security Update Required</h2>
          <p className="text-xs text-yellow-800 mt-2 font-medium">
            This is your first time logging in. For security reasons, you must change your default password before accessing the school ledger.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold border-l-4 border-red-500">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current (Default) Password</label>
            <input required type="password" name="old_password" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Secure Password</label>
            <input required type="password" name="new_password" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
            <input required type="password" name="confirm_password" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-black mt-6 transition-colors">
            {loading ? 'Updating Security...' : 'Save & Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}