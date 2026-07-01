import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddStudentModal from '../components/AddStudentModal';
import AddTeacherModal from '../components/AddTeacherModal';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { setBranding, resetBranding } = useSchoolTheme();
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({ total_collected: 0, pending_debt: 0, student_count: 0, teacher_count: 0 });
  const [schoolSlug, setSchoolSlug] = useState('');
  const [schoolBranding, setSchoolBranding] = useState(null);
  const [students, setStudents] = useState([]);
  const [displayStudents, setDisplayStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [displayTeachers, setDisplayTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [teacherSearchStatus, setTeacherSearchStatus] = useState('');
  const [searchMode, setSearchMode] = useState('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionMessage, setActionMessage] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL;
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const formatAmount = (value) => Number(value || 0).toLocaleString();

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem('bursaros_token');
    const role = localStorage.getItem('bursaros_role');

    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load dashboard');
      }

      setAdminName(data.admin_name);
      setStats({
        total_collected: data.stats?.total_collected || 0,
        pending_debt: data.stats?.pending_debt || 0,
        student_count: data.stats?.student_count || 0,
        teacher_count: data.stats?.teacher_count || 0,
      });
      setSchoolSlug(data.school_slug);
      setSchoolBranding(data.school_branding || null);
      setStudents(data.students || []);
      setDisplayStudents(data.students || []);
      setTeachers(data.teachers || []);
      setDisplayTeachers(data.teachers || []);
      setSearchStatus(data.students?.length ? `Loaded ${data.students.length} student records.` : 'No students found yet.');
      setTeacherSearchStatus(data.teachers?.length ? `Loaded ${data.teachers.length} staff records.` : 'No staff found yet.');

      if (data.school_branding) {
        setBranding(data.school_branding);
      } else {
        resetBranding();
      }
    } catch (error) {
      console.error(error);
      resetBranding();
      setSearchStatus(error.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, navigate, resetBranding, setBranding]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchMode('all');
    setDisplayStudents(students);
    setSearchStatus(students.length ? `Showing all ${students.length} students.` : 'No students to display.');
  };

  const handleTeacherSearch = (event) => {
    event.preventDefault();
    const term = teacherSearchQuery.trim().toLowerCase();

    if (!term) {
      setDisplayTeachers(teachers);
      setTeacherSearchStatus(teachers.length ? `Showing all ${teachers.length} staff records.` : 'No staff to display.');
      return;
    }

    const filtered = teachers.filter((teacher) => {
      return [teacher.full_name, teacher.email, teacher.assigned_class, teacher.is_first_login ? 'first login' : 'active']
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });

    setDisplayTeachers(filtered);
    setTeacherSearchStatus(filtered.length
      ? `Search matched ${filtered.length} staff member${filtered.length === 1 ? '' : 's'}.`
      : 'No staff matched that search.');
  };

  const handleKeywordSearch = (event) => {
    event.preventDefault();
    const term = searchQuery.trim().toLowerCase();

    if (!term) {
      handleClearSearch();
      return;
    }

    const filtered = students.filter((student) => {
      const balanceText = String(Number(student.outstanding_balance || 0));
      return [student.full_name, student.reg_number, student.student_class, student.status, balanceText]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });

    setSearchMode('keyword');
    setDisplayStudents(filtered);
    setSearchStatus(filtered.length
      ? `Keyword search matched ${filtered.length} student${filtered.length === 1 ? '' : 's'}.`
      : 'No students matched that search.');
  };

  const handleGeminiSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      handleClearSearch();
      return;
    }

    const token = localStorage.getItem('bursaros_token');
    setSearchLoading(true);
    setSearchStatus('Asking Gemini to interpret the search...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/students/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Gemini search failed');

      setSearchMode(data.ai_enabled ? 'gemini' : 'keyword');
      setDisplayStudents(data.students || []);
      setSearchStatus(
        data.ai_enabled
          ? (data.students?.length
              ? `Gemini matched ${data.students.length} student${data.students.length === 1 ? '' : 's'}.`
              : 'Gemini did not find any matching students.')
          : (data.students?.length
              ? `Gemini is not configured here, so we used keyword search and matched ${data.students.length} student${data.students.length === 1 ? '' : 's'}.`
              : 'Gemini is not configured here, so keyword search found no matches.')
      );
    } catch (error) {
      setSearchStatus(error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    const token = localStorage.getItem('bursaros_token');
    const confirmed = window.confirm(`Delete ${student.full_name}? This will permanently remove the record and related transaction history.`);
    if (!confirmed) {
      return;
    }

    setActionLoading(`student-${student.id}`);
    setActionMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/students/${student.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete student');
      }

      setStudents((current) => current.filter((item) => item.id !== student.id));
      setDisplayStudents((current) => current.filter((item) => item.id !== student.id));
      setStats((current) => ({
        ...current,
        student_count: Math.max(0, Number(current.student_count || 0) - 1),
        pending_debt: Math.max(0, Number(current.pending_debt || 0) - Number(student.outstanding_balance || 0)),
      }));
      setActionMessage(data.message || 'Student deleted successfully.');
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    const token = localStorage.getItem('bursaros_token');
    const confirmed = window.confirm(`Delete ${teacher.full_name}? This removes the staff account permanently.`);
    if (!confirmed) {
      return;
    }

    setActionLoading(`teacher-${teacher.id}`);
    setActionMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/staff/teachers/${teacher.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete teacher');
      }

      setTeachers((current) => current.filter((item) => item.id !== teacher.id));
      setDisplayTeachers((current) => current.filter((item) => item.id !== teacher.id));
      setStats((current) => ({
        ...current,
        teacher_count: Math.max(0, Number(current.teacher_count || 0) - 1),
      }));
      setActionMessage(data.message || 'Staff member deleted successfully.');
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleResetTeacherPassword = async (teacher) => {
    const token = localStorage.getItem('bursaros_token');
    const confirmed = window.confirm(`This will send a password reset link to ${teacher.full_name}'s email address, allowing them to set a new password. Are you sure?`);
    if (!confirmed) {
      return;
    }

    setActionLoading(`reset-${teacher.id}`);
    setActionMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/staff/teachers/${teacher.id}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset teacher password');
      }

      setActionMessage(data.message || 'Password reset email sent successfully.');
    } catch (error) {
      setActionMessage(error.message);
    } finally {
      setActionLoading('');
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordStatus('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordStatus('New password and confirmation do not match.');
      return;
    }

    const token = localStorage.getItem('bursaros_token');
    setPasswordLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to change password');
      }

      setPasswordStatus(data.message || 'Password updated successfully.');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setPasswordStatus(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    resetBranding();
    navigate('/login');
  };

  const firstName = adminName ? adminName.trim().split(' ')[0]: 'Admin';
  const paymentLink = `${FRONTEND_URL}/pay/${schoolSlug}`;
  const schoolName = schoolBranding?.name || 'Your School';
  const schoolLogo = schoolBranding?.logo_url;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-bold">Loading management dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-80 opacity-90" style={{ background: 'linear-gradient(135deg, var(--school-primary) 0%, var(--school-secondary) 55%, #0f172a 100%)' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">
        <header className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl shadow-slate-900/10 px-6 py-5 text-white flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {schoolLogo ? (
                <img src={schoolLogo} alt={schoolName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black">B</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-bold">Admin Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-black truncate">{schoolName}</h1>
              <p className="text-sm text-white/75 truncate">{schoolBranding?.website_url || 'School website not set yet'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-sm">
              <span className="block text-white/70 text-xs uppercase tracking-widest font-bold">Welcome back</span>
              <span className="font-bold">{firstName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-2xl bg-white text-slate-900 px-5 py-3 text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="mt-6 space-y-6">
          {actionMessage ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
              {actionMessage}
            </div>
          ) : null}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Total Cleared</p>
              <p className="mt-3 text-3xl font-black school-primary-text">₦{formatAmount(stats.total_collected)}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Outstanding</p>
              <p className="mt-3 text-3xl font-black school-secondary-text">₦{formatAmount(stats.pending_debt)}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Students</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{stats.student_count}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Staff</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{stats.teacher_count || teachers.length}</p>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">Management Center</h2>
                <p className="text-sm text-slate-500">Manage records, staff access, and your own credentials from one place.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['overview', 'Overview'],
                  ['students', 'Students'],
                  ['staff', 'Staff'],
                  ['security', 'Security'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeTab === key ? 'school-primary-bg text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Quick Actions</h3>
                        <p className="text-sm text-slate-500">Start common tasks quickly.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => setIsTeacherModalOpen(true)} className="rounded-2xl px-4 py-4 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <span className="block text-sm font-bold text-slate-900">Provision staff</span>
                        <span className="block text-xs text-slate-500 mt-1">Add a new teacher account</span>
                      </button>
                      <button onClick={() => setIsStudentModalOpen(true)} className="rounded-2xl px-4 py-4 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <span className="block text-sm font-bold text-slate-900">Add student</span>
                        <span className="block text-xs text-slate-500 mt-1">Create a new student fee record</span>
                      </button>
                      <button onClick={() => setActiveTab('students')} className="rounded-2xl px-4 py-4 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <span className="block text-sm font-bold text-slate-900">Review students</span>
                        <span className="block text-xs text-slate-500 mt-1">Search and manage student records</span>
                      </button>
                      <button onClick={() => setActiveTab('staff')} className="rounded-2xl px-4 py-4 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <span className="block text-sm font-bold text-slate-900">Manage staff</span>
                        <span className="block text-xs text-slate-500 mt-1">Reset passwords or delete accounts</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-base font-black text-slate-900 mb-4">Recent Students</h3>
                    <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                      {students.slice(0, 5).map((student) => (
                        <div key={student.id} className="rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{student.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{student.reg_number} · {student.student_class || 'N/A'}</p>
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-widest ${Number(student.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ₦{formatAmount(student.outstanding_balance)}
                          </span>
                        </div>
                      ))}
                      {students.length === 0 ? <p className="text-sm text-slate-500">No students yet.</p> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'students' ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <form className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3" onSubmit={handleKeywordSearch}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search students or ask Gemini: 'JSS 2 students owing above 50k'"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
                      />
                      <button type="submit" className="rounded-xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-bold hover:bg-slate-50 transition-colors">
                        Search
                      </button>
                      <button type="button" onClick={handleGeminiSearch} disabled={searchLoading} className="rounded-xl school-primary-bg text-white px-5 py-3 text-sm font-bold hover:opacity-95 transition-colors disabled:opacity-70">
                        {searchLoading ? 'Gemini...' : 'Ask Gemini'}
                      </button>
                      <button type="button" onClick={handleClearSearch} className="rounded-xl text-slate-500 px-3 py-3 text-sm font-bold hover:text-slate-900 transition-colors">
                        Clear
                      </button>
                    </form>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
                      <span>{searchStatus || `Showing ${displayStudents.length} student records.`}</span>
                      <span className="uppercase tracking-widest font-bold text-xs">Mode: {searchMode === 'gemini' ? 'Gemini AI' : searchMode === 'keyword' ? 'Keyword' : 'All Records'}</span>
                    </div>
                  </div>

                  {displayStudents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                      No student records match the current search.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                              <th className="p-4">Reg Number</th>
                              <th className="p-4">Student</th>
                              <th className="p-4">Class</th>
                              <th className="p-4 text-right">Outstanding</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Enrolled</th>
                              <th className="p-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-sm bg-white">
                            {displayStudents.map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono text-slate-600">{student.reg_number}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-900">{student.full_name}</div>
                                  <div className="text-xs text-slate-500">Updated {student.updated_at ? new Date(student.updated_at).toLocaleDateString() : 'N/A'}</div>
                                </td>
                                <td className="p-4 text-slate-700">{student.student_class || 'N/A'}</td>
                                <td className={`p-4 text-right font-mono font-bold ${Number(student.outstanding_balance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                  ₦{formatAmount(student.outstanding_balance)}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${Number(student.outstanding_balance || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {Number(student.outstanding_balance || 0) > 0 ? 'Owing' : 'Cleared'}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-500">{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}</td>
                                <td className="p-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStudent(student)}
                                    disabled={actionLoading === `student-${student.id}`}
                                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                                  >
                                    {actionLoading === `student-${student.id}` ? 'Deleting...' : 'Delete'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'staff' ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                    <form className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3" onSubmit={handleTeacherSearch}>
                      <input
                        type="text"
                        value={teacherSearchQuery}
                        onChange={(event) => setTeacherSearchQuery(event.target.value)}
                        placeholder="Search staff by name, email, class, or status"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
                      />
                      <button type="submit" className="rounded-xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-bold hover:bg-slate-50 transition-colors">
                        Search Staff
                      </button>
                    </form>
                    <div className="mt-3 text-sm text-slate-500">{teacherSearchStatus || `Showing ${displayTeachers.length} staff records.`}</div>
                  </div>

                  {displayTeachers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                      No staff records match the current search.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                              <th className="p-4">Full Name</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Class</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Created</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-sm bg-white">
                            {displayTeachers.map((teacher) => (
                              <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-900">{teacher.full_name}</td>
                                <td className="p-4 text-slate-600">{teacher.email}</td>
                                <td className="p-4 text-slate-700">{teacher.assigned_class}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${teacher.is_first_login ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                    {teacher.is_first_login ? 'Needs Password Change' : 'Active'}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-500">{teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : 'N/A'}</td>
                                <td className="p-4 text-right">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleResetTeacherPassword(teacher)}
                                      disabled={actionLoading === `reset-${teacher.id}`}
                                      className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
                                    >
                                      {actionLoading === `reset-${teacher.id}` ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTeacher(teacher)}
                                      disabled={actionLoading === `teacher-${teacher.id}`}
                                      className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                                    >
                                      {actionLoading === `teacher-${teacher.id}` ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'security' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-lg font-black text-slate-900">Change My Password</h3>
                    <p className="text-sm text-slate-500 mt-1">Update your manager credentials from here.</p>
                    <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Current Password</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.old_password}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, old_password: event.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">New Password</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
                          placeholder="Create a new password"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Confirm Password</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--school-primary)]"
                          placeholder="Repeat the new password"
                        />
                      </div>
                      {passwordStatus ? (
                        <div className={`rounded-xl px-4 py-3 text-sm ${passwordStatus.toLowerCase().includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                          {passwordStatus}
                        </div>
                      ) : null}
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="rounded-xl school-primary-bg text-white px-5 py-3 text-sm font-bold hover:opacity-95 transition-colors disabled:opacity-70"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/70">
                    <h3 className="text-lg font-black text-slate-900">Recovery and Access Control</h3>
                    <p className="text-sm text-slate-500 mt-1">Use the staff tab to reset a teacher password or remove access immediately when needed.</p>
                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <p className="font-bold text-slate-900">Teacher recovery</p>
                        <p className="mt-1">Reset a teacher password from the Staff tab to generate a temporary login and force a password change on next sign-in.</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <p className="font-bold text-slate-900">Deletion safety</p>
                        <p className="mt-1">Student deletion removes related transactions. Teacher deletion is scoped to your school and cannot affect other tenants.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="text-sm text-slate-500">
                  Share the public portal with parents: <span className="font-mono text-slate-900">{paymentLink}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsTeacherModalOpen(true)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    + Provision Staff
                  </button>
                  <button
                    onClick={() => setIsStudentModalOpen(true)}
                    className="rounded-xl school-secondary-bg px-4 py-3 text-sm font-bold text-white hover:opacity-95 transition-colors"
                  >
                    + Add Student
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Modals */}
      <AddStudentModal 
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={loadDashboard}
      />

      <AddTeacherModal 
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSuccess={loadDashboard}
      />

      </div>
    </div>
  );
}