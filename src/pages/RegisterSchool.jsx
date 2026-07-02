import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function RegisterSchool() {
  const navigate = useNavigate();
  const { resetBranding } = useSchoolTheme();
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState({
    school_name: '',
    school_slug: '',
    website_url: '',
    admin_full_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  useEffect(() => {
    resetBranding();
  }, [resetBranding]);

  // UX Magic: Auto-generate a clean URL slug as they type the school name
  const handleNameChange = (e) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
      .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens
      
    setFormData({ 
      ...formData, 
      school_name: name, 
      school_slug: generatedSlug 
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    const payload = { ...formData };

    if (!payload.website_url.trim() === '') {
      delete payload.website_url;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/schools/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      });
 
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Registration failed');

      // Success! Send them straight to the login page
      navigate('/login');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wide">BursarOS</h2>
          <p className="text-gray-500 text-sm mt-2">Register your school to start accepting digital payments instantly.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border-l-4 border-red-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* School Details Section */}
          <div className="border-b pb-4 mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Institution Details</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">School Name</label>
              <input 
                required 
                type="text" 
                name="school_name"
                value={formData.school_name}
                onChange={handleNameChange} 
                placeholder="e.g., Grace Academy" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Payment Portal URL</label>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-3 text-gray-500 text-sm font-mono">
                  bursaros.com/pay/
                </span>
                <input 
                  required 
                  type="text" 
                  name="school_slug" 
                  value={formData.school_slug}
                  onChange={handleChange} 
                  placeholder="grace-academy" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors font-mono text-sm bg-gray-50" 
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">School Website URL</label>
                <input 
                  // required 
                  type="url" 
                  name="website_url" 
                  value={formData.website_url}
                  onChange={handleChange} 
                  placeholder="https://www.graceacademy.edu.ng" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
                />
                <p className="mt-2 text-xs text-gray-500">We use this URL to detect your logo and color palette automatically.</p>
              </div>
            </div>
          </div>

          {/* Admin Details Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Administrator Account</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Full Name</label>
                <input 
                  required 
                  type="text" 
                  name="admin_full_name" 
                  onChange={handleChange} 
                  placeholder="John Doe" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Email</label>
                <input 
                  required 
                  type="email" 
                  name="admin_email" 
                  onChange={handleChange} 
                  placeholder="admin@school.com" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Secure Password</label>
                <input 
                  required 
                  type="password" 
                  name="admin_password" 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-4 rounded-lg shadow-md transition-all disabled:opacity-70 mt-6 flex justify-center items-center"
          >
            {loading ? 'Setting up infrastructure...' : 'Create School Portal'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-gray-900 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}