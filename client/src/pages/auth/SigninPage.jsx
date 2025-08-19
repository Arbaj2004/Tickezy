import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, MapPin, Search, User, ArrowRight, Shield, Star } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/userSlice';


// Main Signin Component
const SigninPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/auth/login`;
        try {
        const response = await axios.post(URL, {
            email: formData.email,
            password: formData.password,
        }, {
            withCredentials: true
        });

        if (response.data.status === "success") {
            // const userData = response.data.data.user;
            // dispatch(loginSuccess(userData));
            localStorage.setItem('token', response.data.token);

            const userData = response.data.data.user;
            const token = response.data.token;
            setTimeout(() => {
              console.log("Login successful");
              toast.success("Login successful");
            }, 1000);
            dispatch(loginSuccess({ user: userData, token }));
            setFormData({ password: "", email: "" });
            console.log(userData);
            if(userData?.role === 'Admin') {
              navigate('/dashboard'); // 👈 redirect to admin dashboard
            
            } else {
              navigate('/'); // 👈 redirect to homepage
            }
        } else {
            toast.error("Login failed. Please check your credentials.");
        }
        } catch (error) {
        toast.error(error.response.data.message || "Please check your email and password");
        }

    setIsLoading(false);
      
    } else {
      setErrors(newErrors);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    alert('Forgot password functionality would redirect to reset page');
  };

  const handleSocialLogin = (provider) => {
    console.log(`${provider} login clicked`);
    alert(`${provider} login would redirect to ${provider} auth`);
  };

  return (
    <div className="min-h-screen bg-gray-50">      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your BookMyShow account</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-pink-600 hover:text-pink-500 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transform hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login Options */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSocialLogin('Google')}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="ml-2">Google</span>
                </button>

                <button
                  onClick={() => handleSocialLogin('Facebook')}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="ml-2">Facebook</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button className="text-pink-600 hover:text-pink-500 font-medium transition-colors" onClick={() => navigate('/signup')} >
                  Sign up now
                </button>
              </p>
            </div>
          </div>

          {/* Security & Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Security Info */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">Secure Login</h3>
              </div>
              <p className="text-xs text-gray-600">
                Your data is protected with industry-standard encryption
              </p>
            </div>

            {/* Quick Access */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-3">
                <Star className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">Quick Booking</h3>
              </div>
              <p className="text-xs text-gray-600">
                Book tickets instantly with saved payment methods
              </p>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Having trouble signing in?{' '}
              <button className="text-pink-600 hover:text-pink-500 font-medium">
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SigninPage;