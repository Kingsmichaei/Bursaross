import { useState } from 'react';

export default function AddTeacherModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    assigned_class: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Holds the temporary password returned by the backend
  const [successData, setSuccessData] = useState(null); 

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('bursaros_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/staff/add-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to add teacher');

      // Shift to the success screen to show the generated password
      setSuccessData({
        password: data.temporary_password,
        email: formData.email
      });
      
      onSuccess(); // Triggers dashboard refresh in the background
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setSuccessData(null);
    setFormData({ full_name: '', email: '', assigned_class: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">Create Staff Account</h2>
          <button onClick={closeAndReset} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
        </div>

        {/* If Successful, show the Password Screen */}
        {successData ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Teacher Provisioned!</h3>
            <p className="text-sm text-gray-500">Account created for <span className="font-bold text-gray-800">{successData.email}</span></p>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
              <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">Temporary Password</p>
              <p className="text-2xl font-mono font-black text-gray-900 select-all">{successData.password}</p>
              <p className="text-xs text-yellow-700 mt-2">Copy this and send it to the teacher. They will be forced to change it on their first login.</p>
            </div>

            <button onClick={closeAndReset} className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-black mt-4">
              Done
            </button>
          </div>
        ) : (
          
          /* The Provisioning Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold border-l-4 border-red-500">{error}</div>}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teacher Full Name</label>
              <input required type="text" name="full_name" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="e.g. Sarah Williams" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Official Email</label>
              <input required type="email" name="email" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="teacher@school.com" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigned Class</label>
              <select required name="assigned_class" onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">-- Select Class --</option>
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
                <option value="SSS 1">SSS 1</option>
                <option value="SSS 2">SSS 2</option>
                <option value="SSS 3">SSS 3</option>
                <option value="Primary 1">Primary 1</option>
                <option value="Primary 2">Primary 2</option>
                <option value="Primary 3">Primary 3</option>
                <option value="Primary 4">Primary 4</option>
                <option value="Primary 5">Primary 5</option>
                <option value="Primary 6">Primary 6</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-black mt-6 transition-colors">
              {loading ? 'Creating Account...' : 'Create Teacher Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}