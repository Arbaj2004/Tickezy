import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Calendar, MapPin, Star, Clock, Ticket, CheckCircle, XCircle, Edit3, Save, AlertCircle, Shield, Heart } from 'lucide-react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess } from '../redux/slices/userSlice';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.user);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const base = import.meta.env.VITE_REACT_APP_BACKEND_BASEURL;
        const localToken = token || localStorage.getItem('token');
        const headers = localToken ? { Authorization: `Bearer ${localToken}` } : {};
        const cfg = { withCredentials: true, headers };
        const [meRes, bookingsRes] = await Promise.all([
          axios.get(`${base}/auth/me`, cfg),
          axios.get(`${base}/bookings/my`, cfg)
        ]);

        if (!isMounted) return;
        const user = meRes?.data?.data?.user;
        setMe(user);
        setBookings(bookingsRes?.data?.data || []);
      } catch (e) {
        console.error('Failed to load profile data', e);
        if (!isMounted) return;
        setError(e?.response?.data?.message || 'Failed to load profile data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [token]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return (bookings || []).filter(b => new Date(b.show_datetime) >= now);
  }, [bookings]);

  const past = useMemo(() => {
    const now = new Date();
    return (bookings || []).filter(b => new Date(b.show_datetime) < now);
  }, [bookings]);

  const onSave = async () => {
    if (!me?.name || !me.name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
  const base = import.meta.env.VITE_REACT_APP_BACKEND_BASEURL;
  const localToken = token || localStorage.getItem('token');
  const headers = localToken ? { Authorization: `Bearer ${localToken}` } : {};
  const cfg = { withCredentials: true, headers };
  const res = await axios.patch(`${base}/auth/me`, { name: me.name.trim() }, cfg);
      const updatedUser = res?.data?.data?.user;
      if (updatedUser) {
        setMe(updatedUser);
        const existingToken = token || localStorage.getItem('token');
        if (existingToken) {
          dispatch(loginSuccess({ user: updatedUser, token: existingToken }));
        }
      }
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-1">Manage your account and view booking history</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-pink-600" />
              <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-md transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={me?.name || ''}
                    onChange={(e) => setMe(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing || saving}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md transition-colors ${
                      isEditing 
                        ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={me?.email || ''}
                    disabled
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                    placeholder="your.email@example.com"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-md text-sm font-medium text-white transition-all duration-200 ${
                    saving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Booking Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
              </div>
              <Ticket className="w-8 h-8 text-pink-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Shows</p>
                <p className="text-3xl font-bold text-green-600">{upcoming.length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Movies Watched</p>
                <p className="text-3xl font-bold text-blue-600">{past.length}</p>
              </div>
              <Star className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Booking History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Bookings */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Bookings</h2>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {upcoming.length}
              </span>
            </div>
            
            <div className="p-6">
              {upcoming.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No upcoming bookings</p>
                  <p className="text-gray-400 text-xs mt-1">Book your next movie experience!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{booking.movie_title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <p className="text-sm text-gray-600">{booking.theatre_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(booking.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Show Time</p>
                          <p className="font-medium text-gray-900">
                            {new Date(booking.show_datetime).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="font-medium text-gray-900">₹{booking.total_amount}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-xs">Seats</p>
                            <p className="font-medium text-gray-900 text-sm">
                              {(booking.seats || []).join(', ')}
                            </p>
                          </div>
                          <button className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Past Bookings */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
              <Heart className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Watch History</h2>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {past.length}
              </span>
            </div>
            
            <div className="p-6">
              {past.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No movie history yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your watched movies will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {past.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{booking.movie_title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <p className="text-sm text-gray-600">{booking.theatre_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(booking.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Watched On</p>
                          <p className="font-medium text-gray-900">
                            {new Date(booking.show_datetime).toLocaleString('en-IN', {
                              dateStyle: 'medium'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="font-medium text-gray-900">₹{booking.total_amount}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-xs">Seats</p>
                            <p className="font-medium text-gray-900 text-sm">
                              {(booking.seats || []).join(', ')}
                            </p>
                          </div>
                          <button className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors">
                            Rate Movie
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Our support team is here to assist you with any questions or issues.
            </p>
            <button className="inline-flex items-center space-x-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-md transition-colors">
              <span>Contact Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;