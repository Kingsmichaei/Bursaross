import { useState } from 'react';

export default function AddStudentModal({ isOpen, onClose, onSuccess, defaultClass = '' }) {
  const [formData, setFormData] = useState({
    full_name: '',
    reg_number: '',
    student_class: defaultClass, // If it's a teacher, this locks to their assigned class
    outstanding_balance: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


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
      const response = await fetch(`${API_BASE_URL}/api/v1/students/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            ...formData,
            outstanding_balance: parseFloat(formData.outstanding_balance)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to add student');

      onSuccess(); // Triggers the dashboard to refresh its data
      onClose();   // Closes the modal
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">Add New Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-bold">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
            <input required type="text" name="full_name" onChange={handleChange} className="w-full border p-2 rounded-md focus:ring-2 focus:ring-gray-900" placeholder="e.g. Adebayo Johnson" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registration Number</label>
            <input required type="text" name="reg_number" onChange={handleChange} className="w-full border p-2 rounded-md font-mono focus:ring-2 focus:ring-gray-900" placeholder="e.g. GRA/2026/042" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Class</label>
              <input required type="text" name="student_class" value={formData.student_class} onChange={handleChange} readOnly={!!defaultClass} className={`w-full border p-2 rounded-md ${defaultClass ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-gray-900'}`} placeholder="e.g. JSS 3" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unpaid Fees (₦)</label>
              <input required type="number" min="0" name="outstanding_balance" onChange={handleChange} className="w-full border p-2 rounded-md font-mono focus:ring-2 focus:ring-gray-900" placeholder="50000" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-black mt-4">
            {loading ? 'Adding...' : 'Save Student Record'}
          </button>
        </form>
      </div>
    </div>
  );
}