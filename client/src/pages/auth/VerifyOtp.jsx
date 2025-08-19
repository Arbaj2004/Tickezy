import React, { useState } from 'react';
import { Mail, ArrowLeft, Shield, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';



const VerifyOtp = () => {
  const [data, setData] = useState({ otp: "" });
  const [isLoading, setIsLoading] = useState(false);
  const tokenInsertedAt = parseInt(localStorage.getItem("authTokenInsertedAt"), 10) || Date.now();
  const currentTime = Date.now();
  const elapsedTime = Math.floor((currentTime - tokenInsertedAt) / 1000);
  const initialTimeLeft = Math.max(300 - elapsedTime, 0); // 5 minutes - elapsed
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const navigate=useNavigate();
  const [canResend, setCanResend] = useState(false);

  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  const token = localStorage.getItem('token');
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/auth/verify-otp`;
    try {
      const response = await axios.post(URL, {
        Emailotp: data.otp
      }, {
        headers: { 'authorization': `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data.status === "success") {
        //const userData = response.data.data.oldUser;
        //dispatch(loginSuccess(userData));
        localStorage.removeItem('token')
        toast.success("Email verification successful!");
        setData({ otp: "" });
        setTimeout(() => {
          setData({ password: "", email: "" });
        }, 2000);
        localStorage.removeItem("authTokenInsertedAt");

        navigate('/');
      }
    } catch (error) {
      toast.error(error.response.data.message || "Verification failed. Please try again.");
      console.error("Verification error:", error);
      navigate('/signin');
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    setTimeLeft(300);
    setCanResend(false);
    setData({ otp: "" });
    alert("New OTP sent to your email!");
  };

  const handleGoBack = () => {
    console.log("Going back to signup");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="min-h-[calc(100vh-4rem)] flex justify-center items-center p-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 transform transition-all duration-300 hover:shadow-xl">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-4 transform transition-transform duration-300 hover:scale-105">
                <Mail className="w-10 h-10 text-pink-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                Email Verification
              </h1>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                We've sent a 6-digit verification code to your email address. 
                Please check your inbox and enter the code below.
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <label
                className="block text-sm font-semibold text-gray-700 mb-3"
                htmlFor="otp"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                name="otp"
                placeholder="000000"
                className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 text-center text-2xl tracking-[0.5em] font-mono transition-all duration-200 hover:border-gray-300"
                required
                value={data.otp}
                onChange={handleOnChange}
                maxLength={6}
                disabled={isLoading}
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your email
              </div>
            </div>

            {/* Timer and Security Info */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>Code expires in: {formatTime(timeLeft)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-1" />
                <span>Secure</span>
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || data.otp.length !== 6}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 transform ${
                isLoading || data.otp.length !== 6
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>

            {/* Resend OTP */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResendOTP}
                disabled={!canResend}
                className={`text-sm font-medium transition-colors ${
                  canResend
                    ? 'text-pink-600 hover:text-pink-700 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {canResend ? 'Resend OTP' : `Resend in ${formatTime(timeLeft)}`}
              </button>
            </div>

            {/* Go Back Link */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center w-full text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign Up
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Having trouble?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Check your spam or junk folder</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Make sure you entered the correct email address</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Wait a few minutes for the email to arrive</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Still need help?{' '}
                <button className="text-pink-600 hover:text-pink-700 font-medium">
                  Contact Support
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;