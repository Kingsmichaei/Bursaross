import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchoolTheme } from '../context/SchoolThemeProvider';

export default function PublicCheckout() {
  const { schoolSlug } = useParams(); // Extracts the slug from the URL!
  const { setBranding, resetBranding } = useSchoolTheme();
  const [school, setSchool] = useState(null);
  const [regNumber, setRegNumber] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [amountToPay, setAmountToPay] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // 1. Fetch School Branding on Load
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/portal/${schoolSlug}`);
        if (!res.ok) throw new Error("This payment portal does not exist or has been deactivated.");
        const data = await res.json();
        setSchool(data);
        setBranding(data.branding || data);
      } catch (err) {
        resetBranding();
        setError(err.message);
      }
    };
    fetchSchool();
  }, [API_BASE_URL, resetBranding, schoolSlug, setBranding]);

  // When invoice is loaded, pre-fill the payment amount
  useEffect(() => {
    if (invoice && invoice.breakdown) {
      setAmountToPay(invoice.breakdown.base_fee.toFixed(2));
    }
  }, [invoice]);

  // 2. Verify Student
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInvoice(null); // Reset previous invoice if any
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/portal/${schoolSlug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: regNumber })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");
      
      setInvoice(data); // Set the invoice details to move to the next step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Initiate Payment and Redirect to Nomba
  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/checkout/initiate`, {   
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_id: invoice.student_id,
            school_slug: schoolSlug,
            parent_email: parentEmail,
            amount_to_pay: parseFloat(amountToPay)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to initialize payment');

      // THE MAGIC REDIRECT: Send the parent to Nomba's secure servers!
      window.location.href = data.checkout_url;

    } catch (err) {
      setError(err.message);
      setLoading(false); // Only set loading false on error, otherwise we redirect
    }
  };

  if (error && !school) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!school) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-900">Loading Portal...</div>;

  // Calculate the final amount to be charged dynamically
  let finalAmount = 0;
  if (invoice && invoice.breakdown) {
      finalAmount = (parseFloat(amountToPay) || 0) + invoice.breakdown.platform_fee + invoice.breakdown.gateway_fee;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center py-12 px-4"
      style={{ background: 'linear-gradient(180deg, var(--school-accent) 0%, #F8FAFC 100%)' }}
    >
      
      {/* Dynamic School Branding */}
      <div className="text-center mb-8">
        <img src={school.logo_url} alt="School Logo" className="w-16 h-16 rounded-full mx-auto mb-3 shadow-sm border-4 school-secondary-border" />
        <h1 className="text-2xl font-black text-gray-900">{school.school_name}</h1>
        <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Secure Fee Portal</p>
      </div>

      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border school-primary-border">
        
        {/* Step 1: Lookup Form */}
        {!invoice ? (
          <form onSubmit={handleVerify} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-bold">{error}</div>}
            <label className="block text-sm font-bold text-gray-700 mb-2">Student Registration Number</label>
            <input 
              required 
              type="text" 
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)} 
              placeholder="e.g. GRA/2026/042" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-mono" 
            />
            <button type="submit" disabled={loading} className="w-full school-primary-bg hover:opacity-95 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-70">
              {loading ? 'Verifying...' : 'Find Student Invoice'}
            </button>
          </form>
        ) : (
          
          /* Step 2: The Invoice Breakdown */
          <div className="space-y-6">
            {invoice.status === 'cleared' ? ( // Student has no debt
              <div className="text-center text-green-600 font-bold p-6 bg-green-50 rounded-lg">
                ✅ {invoice.message}
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-400 font-bold uppercase">Student Name</p>
                  <p className="text-lg font-black text-gray-900 truncate">{invoice.student_name}</p>
                  <p className="text-sm text-gray-500 font-bold">{invoice.student_class} • {regNumber}</p>
                </div>

                <div className="space-y-2 text-sm border-b pb-4">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Base Fee</span>
                    <span>₦{invoice.breakdown.base_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Payment Gateway Fee (1.5%)</span>
                    <span>₦{invoice.breakdown.gateway_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>BursarOS Platform Fee</span>
                    <span>₦{invoice.breakdown.platform_fee.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xl font-black text-gray-900">
                  <span>Total Due</span>
                  <span>₦{invoice.breakdown.total_charged.toLocaleString()}</span>
                </div>


                <form onSubmit={handlePayment} className="space-y-4 pt-2">
                  {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-bold">{error}</div>}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Parent/Guardian Email</label>
                    <input 
                      required 
                      type="email" 
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@email.com" 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Amount to Pay (₦)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={amountToPay}
                      onChange={(e) => setAmountToPay(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-mono text-lg"
                    />
                  </div>

                  {/* New Summary Block */}
                  <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1 border border-gray-200">
                    <div className="flex justify-between font-medium text-gray-600">
                      <span>Your Payment</span>
                      <span>₦{Number(amountToPay || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Fees (Platform + Gateway)</span>
                      <span>+ ₦{(invoice.breakdown.platform_fee + invoice.breakdown.gateway_fee).toLocaleString()}</span>
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !amountToPay || finalAmount <= 0} className="w-full school-secondary-bg hover:opacity-95 text-white font-bold py-4 rounded-lg shadow-md transition-all disabled:opacity-70 flex justify-center items-center text-lg">
                    {loading ? 'Connecting...' : `Pay Total: ₦${finalAmount.toLocaleString()}`}
                  </button>
                </form>

                <div className="text-center">
                    <button onClick={() => setInvoice(null)} className="text-gray-500 hover:text-gray-900 text-sm font-bold mt-2">
                    ← Search for another student
                    </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}