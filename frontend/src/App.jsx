import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PublicCheckout from './pages/PublicCheckout';
import PaymentSuccess from './pages/PaymentSuccess';
import RegisterSchool from './pages/RegisterSchool';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { SchoolThemeProvider } from './context/SchoolThemeProvider';

function App() {
  return (
    <BrowserRouter>
      <SchoolThemeProvider>
        <div className="min-h-screen bg-gray-50 py-10">
          <Routes>
            <Route path="/pay/:schoolSlug" element={<PublicCheckout />} />
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterSchool />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Routes>
        </div>
      </SchoolThemeProvider>
    </BrowserRouter>
  );
}

export default App;