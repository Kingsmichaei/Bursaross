import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function Login() {
  const navigate = useNavigate();
  const { resetBranding } = useSchoolTheme();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [role, setRole] = useState('admin'); // 'admin' or 'teacher'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    resetBranding();
  }, [resetBranding]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // We send the role along with the credentials so FastAPI knows which database table to check
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Invalid credentials');

      // 1. Save the JWT token securely to localStorage
      localStorage.setItem('bursaros_token', data.access_token);
      localStorage.setItem('bursaros_role', role);

      // 2. Redirect to the correct dashboard based on their role
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/teacher');
      }

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-2">Sign in to manage your school portal.</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex w-full mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              role === 'admin' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bursar / Admin
          </button>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
              role === 'teacher' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Teacher
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border-l-4 border-red-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <input 
              required 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange} 
              placeholder={role === 'admin' ? "admin@school.com" : "teacher@school.com"} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-gray-700">Password</label>
              <Link to={`/forgot-password?role=${role}`} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Forgot?</Link>
            </div>
            <input 
              required 
              type="password" 
              name="password" 
              value={formData.password}
              onChange={handleChange} 
              placeholder="••••••••" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-4 rounded-lg shadow-md transition-all disabled:opacity-70 mt-6 flex justify-center items-center"
          >
            {loading ? 'Authenticating...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Teacher'}`}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Is your school new to BursarOS? <Link to="/register" className="text-gray-900 font-bold hover:underline">Register Here</Link>
          </p>
        </div>

      </div>
    </div>
  );
}


