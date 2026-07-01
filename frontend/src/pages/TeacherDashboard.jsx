import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddStudentModal from '../components/AddStudentModal';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { setBranding, resetBranding } = useSchoolTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  useEffect(() => {
    const token = localStorage.getItem('bursaros_token');
    const role = localStorage.getItem('bursaros_role');

    // Security redirect if they aren't a teacher
    if (!token || role !== 'teacher') {
      navigate('/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        // Passing the token in the query string as required by our custom dependency
        // Clean Header Handoff
        const response = await fetch(`${API_BASE_URL}/api/dashboard/teacher`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const result = await response.json();
     if (!response.ok) throw new Error(result.detail || 'Failed to load dashboard');

     // THE TRIGGER: Lock them out instantly!
     if (result.is_first_login) {
         setShowPasswordModal(true);
     }

     if (result.school_branding) {
         setBranding(result.school_branding);
     } else {
         resetBranding();
     }

     setData(result);
      } catch (err) {
        setError(err.message);
        resetBranding();
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [API_BASE_URL, navigate, resetBranding, setBranding]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading Class Roster...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;

  const firstName = data.teacher_name ? data.teacher_name.split(' ') : 'Teacher';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b school-primary-border px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-widest">BursarOS</h1>
          <span className="school-primary-bg text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
            {data.assigned_class}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-gray-600">Hi, {firstName}</span>
          <button onClick={handleLogout} className="text-xs font-bold bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 mt-6">
        
        {/* Class Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border school-primary-border shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">My Students</h3>
            <p className="text-3xl font-mono font-black school-primary-text">
              {data.stats.student_count}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border school-secondary-border shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Class Outstanding Fees</h3>
            <p className="text-3xl font-mono font-black school-secondary-text">
              ₦{data.stats.total_class_debt.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Class Roster</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="school-primary-bg hover:opacity-95 text-white px-4 py-2 rounded-md text-sm font-bold transition-all"
            >
              + Add Student
            </button>
          </div>
          
          {data.students.length === 0 ? (
             <div className="p-8 text-center text-gray-500 text-sm">No students added to this class yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-4">Reg Number</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4 text-right">Fee Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {data.students.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-gray-600">{student.reg_number}</td>
                      <td className="p-4 font-bold text-gray-900">{student.full_name}</td>
                      <td className={`p-4 text-right font-mono font-bold ${student.outstanding_balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        ₦{student.outstanding_balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </main>
      <AddStudentModal 
  isOpen={isModalOpen} 
  onClose={() => setIsModalOpen(false)} 
  onSuccess={() => window.location.reload()} // Simple refresh for now!
  defaultClass={data.assigned_class} // Lock the class input for the teacher
/>

<ForcePasswordChangeModal 
     isOpen={showPasswordModal}
     onSuccess={() => setShowPasswordModal(false)} // Simply dismisses the modal!
   />
    </div>
  );
}