import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { setBranding, resetBranding } = useSchoolTheme();
  const [status, setStatus] = useState('loading');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [school, setSchool] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Nomba often appends the order reference to the URL when it redirects back
  const schoolSlug = searchParams.get("schoolSlug");
  const orderRef = searchParams.get("orderReference") || searchParams.get("reference") || "";

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!orderRef) {
        setStatus('missing');
        setError('Transaction reference is missing from the redirect URL.');
        resetBranding();
        return;
      }

      try {
        const [statusResponse, schoolResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/webhooks/status/${orderRef}`),
          schoolSlug ? fetch(`${API_BASE_URL}/api/portal/${schoolSlug}`) : Promise.resolve(null),
        ]);

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.detail || 'Could not verify payment status.');
        }

        setDetails(statusData);
        setStatus(statusData.status === 'SUCCESS' ? 'success' : 'pending');

        if (schoolResponse) {
          const schoolData = await schoolResponse.json();
          if (schoolResponse.ok) {
            setSchool(schoolData);
            setBranding(schoolData.branding || schoolData);
          }
        }
      } catch (err) {
        setError(err.message);
        setStatus('error');
        resetBranding();
      }
    };

    fetchPaymentStatus();
  }, [API_BASE_URL, orderRef, resetBranding, schoolSlug, setBranding]);

  const isConfirmed = status === 'success';
  const isPending = status === 'pending' || status === 'loading';

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-lg shadow-lg border school-primary-border text-center">
      {/* Animated Success Checkmark */}
      <div className="flex justify-center mb-6">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center ${isConfirmed ? 'bg-green-100' : 'bg-yellow-100'}`}>
          {isConfirmed ? (
            <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-10 w-10 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16h-2a6 6 0 010-12h4z"></path>
            </svg>
          )}
        </div>
      </div>

      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        {isConfirmed ? 'Payment Successful!' : isPending ? 'Confirming Payment...' : 'Payment Status Unavailable'}
      </h2>
      <p className="text-gray-600 mb-6">
        {isConfirmed
          ? 'Thank you. Your school fee payment has been securely processed by Nomba and recorded in BursarOS.'
          : isPending
            ? 'We are checking the transaction record with BursarOS. This usually completes within a few seconds.'
            : 'We could not verify this transaction automatically. You can return to the portal and check again.'}
      </p>

      {/* Receipt Details */}
      <div className="bg-gray-50 rounded-md p-4 mb-8 border border-gray-200 text-left">
        <p className="text-sm text-gray-500 font-semibold mb-1">Transaction Reference</p>
        <p className="text-lg text-gray-800 font-mono break-all">{orderRef || 'Processing...'}</p>
        {details?.date ? (
          <p className="text-sm text-gray-500 mt-3">Recorded: {details.date}</p>
        ) : null}
        {details?.amount_paid != null ? (
          <p className="text-sm text-gray-500">Amount: ₦{Number(details.amount_paid).toLocaleString()}</p>
        ) : null}
      </div>

      {school?.logo_url ? (
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={school.logo_url} alt="School Logo" className="w-10 h-10 rounded-full border-2 school-primary-border" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">School</p>
            <p className="text-sm font-black text-gray-900">{school.school_name}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-md mb-6 text-left">
          {error}
        </div>
      ) : null}

      <Link 
        to={schoolSlug ? `/pay/${schoolSlug}` : '/'}
        className="w-full inline-flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-bold text-white school-primary-bg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors"
      >
        {isConfirmed ? 'Return to Portal' : 'Back to Portal'}
      </Link>
    </div>
  );
}