import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function LandingPage() {
  const { resetBranding } = useSchoolTheme();

  useEffect(() => {
    resetBranding();
  }, [resetBranding]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center fixed w-full top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white font-black text-lg">B</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-widest">BursarOS</h1>
        </div>
        <nav className="space-x-4 flex items-center">
          <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-md text-sm font-bold transition-all shadow-sm">
            Register School
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-32 pb-16 px-6 md:px-12 flex flex-col items-center text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">
            Powered by Nomba Infrastructure
          </span>
          
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight">
            End the manual <br className="hidden md:block"/> reconciliation nightmare.
          </h2>
          
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            The ultimate B2B2C payment infrastructure for Nigerian primary and secondary schools. Generate white-labeled payment portals, automate your ledger, and let parents pay seamlessly.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
            <Link to="/register" className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-lg text-base font-bold transition-all shadow-lg flex items-center justify-center">
              Create Free Portal
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
            <Link to="/login" className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50 px-8 py-4 rounded-lg text-base font-bold transition-all flex items-center justify-center">
              Access Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-24">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Settlement</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Using Nomba's Split Payments API, your exact tuition goes straight to your bank account. The gateway fees are automatically passed to the payer.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Enterprise Security</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Say goodbye to fake bank tellers. Our backend mathematically verifies every transaction via cryptographic HMAC signatures directly from Nomba.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Role-Based Access</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Bursars see the global ledger, while teachers are strictly restricted to viewing and managing the payment status of their specific class roster.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 text-center mt-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          © 2026 BursarOS • DevCareer × Nomba Hackathon
        </p>
      </footer>
    </div>
  );
}