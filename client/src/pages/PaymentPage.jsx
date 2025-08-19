import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, Ticket, CreditCard, Shield, AlertCircle, CheckCircle, ArrowRight, RefreshCw, Star } from 'lucide-react';

const PaymentPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [paying, setPaying] = useState(false);
  const [ttlLeft, setTtlLeft] = useState(0);
  const [showInfo, setShowInfo] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!sessionId) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/payments/session/${sessionId}`, {
          credentials: 'include',
          headers
        });
        const ct = res.headers.get('content-type') || '';
        let data = null;
        let text = '';
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          text = await res.text();
        }
        if (!res.ok) {
          const msg = data?.message || text?.trim() || (res.status === 404 ? 'Session not found or expired' : res.status === 410 ? 'Payment session expired' : 'Failed to load payment session');
          throw new Error(msg);
        }
        if (!data) {
          throw new Error('Invalid server response');
        }
        setSession(data);
        setTtlLeft(Math.max(Number(data.ttl) || 0, 0));
      } catch (e) {
        setError(e.message || 'Failed to load payment session');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sessionId]);

  // Fetch show details for richer ticket summary
  useEffect(() => {
    const fetchShow = async () => {
      const showId = session?.data?.show_id;
      if (!showId) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show/${showId}`, {
          credentials: 'include'
        });
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : null;
        if (!res.ok) return; // keep silent; base UI still works
        setShowInfo(data?.data || null);
  } catch {
        // ignore; optional enhancement
      }
    };
    fetchShow();
  }, [session]);

  // Tick down the timer once per second when we have a session
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      setTtlLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  // When time runs out, show an error view
  useEffect(() => {
    if (session && ttlLeft === 0 && !paying && !error) {
      setError('Payment session expired');
    }
  }, [ttlLeft, session, paying, error]);

  const confirmPayment = async () => {
    if (!session) return;
    setPaying(true);
    setError('');
    try {
      // 0) Validate-then-hold seats for the current user before confirming payment
      const data = session?.data || {};
      const showId = data.show_id;
      const seatLabels = (data.seats || []).map(s => String(s).trim().toUpperCase());
      if (!showId || seatLabels.length === 0) throw new Error('Invalid session data');

      const token0 = localStorage.getItem('token');
      const headers0 = { 'Content-Type': 'application/json', ...(token0 ? { Authorization: `Bearer ${token0}` } : {}) };
      const vRes = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/validate-then-hold`, {
        method: 'POST',
        headers: headers0,
        credentials: 'include',
        body: JSON.stringify({ show_id: showId, seats: seatLabels })
      });
      const vCt = vRes.headers.get('content-type') || '';
      const vJson = vCt.includes('application/json') ? await vRes.json() : null;
      if (!vRes.ok) {
        const msg = vJson?.message || (vRes.status === 409 ? 'Seats are no longer available' : 'Failed to validate seats');
        throw new Error(msg);
      }

      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/payments/confirm`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId, payment_method: 'dummy' })
      });
      const ct = res.headers.get('content-type') || '';
      let payData = null;
      let text = '';
      if (ct.includes('application/json')) {
        payData = await res.json();
      } else {
        text = await res.text();
      }
      if (!res.ok) {
        const msg = payData?.message || text?.trim() || (res.status === 410 ? 'Payment session expired' : res.status === 409 ? 'Seat already booked or hold expired' : res.status === 403 ? 'You don\'t have access to this session' : res.status === 401 ? 'Please sign in again' : 'Payment failed');
        // Try releasing holds best-effort
        try {
          const seatLabels = session?.data?.seats || [];
          const showId = session?.data?.show_id;
          if (seatLabels.length && showId) {
            await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/release`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ show_id: showId, seats: seatLabels })
            });
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      // On success, server returns booking row. Redirect to the ticket page.
      const bookingId = payData?.data?.id;
      if (bookingId) {
        navigate(`/ticket/${bookingId}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const cancelPayment = async () => {
    if (!sessionId) return;
    setPaying(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/payments/cancel`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId })
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : null;
      if (!res.ok) {
        const msg = data?.message || 'Failed to cancel payment';
        throw new Error(msg);
      }
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message || 'Failed to cancel payment');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading payment session...</p>
          <p className="text-gray-500 text-sm mt-1">Please wait while we prepare your booking</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const data = session?.data || {};
  const minutes = Math.floor(ttlLeft / 60);
  const seconds = ttlLeft % 60;
  const isLowTime = ttlLeft <= 60; // Less than 1 minute remaining

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
              <p className="text-gray-600 mt-1">Secure your seats with our encrypted payment system</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer Card */}
            <div className={`bg-white rounded-lg shadow-lg border-l-4 ${isLowTime ? 'border-l-red-500' : 'border-l-green-500'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className={`w-6 h-6 ${isLowTime ? 'text-red-500' : 'text-green-500'}`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Session Timer</h3>
                      <p className="text-sm text-gray-600">Complete payment before time expires</p>
                    </div>
                  </div>
                  <div className={`text-right ${isLowTime ? 'animate-pulse' : ''}`}>
                    <div className={`text-3xl font-bold ${isLowTime ? 'text-red-600' : 'text-green-600'}`}>
                      {minutes}:{String(seconds).padStart(2, '0')}
                    </div>
                    <div className={`text-sm ${isLowTime ? 'text-red-500' : 'text-gray-500'}`}>
                      {isLowTime ? 'Hurry up!' : 'Time remaining'}
                    </div>
                  </div>
                </div>
                {isLowTime && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">
                        Your session will expire soon. Please complete payment to secure your booking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                <Ticket className="w-5 h-5 text-pink-600" />
                <h2 className="text-xl font-semibold text-gray-900">Booking Summary</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Show Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Movie
                    </label>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold text-gray-900">{showInfo?.movie_title || '—'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Theatre</label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900">{showInfo?.theatre_name || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Screen</label>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <span className="text-gray-900">{showInfo?.screen_name || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Show Time</label>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <span className="text-gray-900">
                          {showInfo?.show_datetime ? new Date(showInfo.show_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Show ID</label>
                      <div className="p-3 bg-gray-50 rounded-md font-mono text-gray-900">#{data?.show_id}</div>
                    </div>
                  </div>
                </div>

                {/* Seats */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Seats
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(data?.seats || []).map((seat, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800 border border-pink-200"
                      >
                        {seat}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {(data?.seats || []).length} seat{(data?.seats || []).length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                {/* Amount Breakdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Details
                  </label>
                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Ticket Price × {(data?.seats || []).length}</span>
                      <span className="text-sm text-gray-900">₹{data?.amount}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Convenience Fee</span>
                      <span className="text-sm text-gray-900">₹0</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                        <span className="text-2xl font-bold text-pink-600">₹{data?.amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg sticky top-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Payment Option */}
                <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Dummy Payment</p>
                      <p className="text-sm text-gray-600">Demo payment method</p>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Secure Payment</span>
                  </div>
                  <p className="text-xs text-green-700">
                    Your payment is protected with bank-level security and SSL encryption
                  </p>
                </div>

                {/* Pay & Cancel Buttons */}
                <button
                  onClick={confirmPayment}
                  disabled={paying}
                  className={`w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition-all duration-200 ${
                    paying
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {paying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Pay ₹{data?.amount}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>

                <button
                  onClick={cancelPayment}
                  disabled={paying}
                  className="w-full mt-3 flex justify-center items-center py-3 px-6 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel Payment
                </button>

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  By clicking "Pay Now", you agree to our{' '}
                  <button className="text-pink-600 hover:text-pink-700 font-medium">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button className="text-pink-600 hover:text-pink-700 font-medium">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-white rounded-lg shadow-md p-4 mt-6">
              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Having trouble with payment? We're here to help!
                </p>
                <button className="text-pink-600 hover:text-pink-700 font-medium text-sm transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;