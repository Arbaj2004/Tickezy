import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, Star, MapPin, Search, LogOut, Crosshair, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux'; // 👈 import selector
import Avatar from './Avatar';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { loginSuccess, logout } from '../redux/slices/userSlice';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // 👇 get user and auth status from redux
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state) => state.user);
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const [openCityMenu, setOpenCityMenu] = useState(false);
  const [showCityModal, setShowCityModal] = useState(() => !localStorage.getItem('city'));
  const cityMenuRef = useRef(null);
  const [detecting, setDetecting] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cities = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 }
  ];
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('city') || '');
  useEffect(() => {
    // If no city chosen yet, show the modal once on first load
    if (!localStorage.getItem('city')) {
      setShowCityModal(true);
    }
  const openHandler = () => setShowCityModal(true);
  window.addEventListener('openCityModal', openHandler);
  return () => window.removeEventListener('openCityModal', openHandler);
  }, []);
  useEffect(() => {
  const token = localStorage.getItem('token');

  if (token && !isAuthenticated) {
    const fetchUser = async () => {
      try {
        const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/auth/me`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(URL, { withCredentials: true, headers });
        // console.log("User fetched successfully:", response.data.data.user);

        if (response.data?.data?.user) {
          dispatch(loginSuccess({ user: response.data.data.user, token }));
        }
      } catch (err) {
        console.error("Session expired or token invalid:", err.response?.data?.message);
        // localStorage.removeItem('token');
        // dispatch(logout());
      }
    };

    fetchUser(); // call the async function
  }
}, [dispatch, isAuthenticated, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
  }
      if (cityMenuRef.current && !cityMenuRef.current.contains(e.target)) {
        setOpenCityMenu(false);
      }
    };
    if (openMenu) document.addEventListener('mousedown', onClick);
    if (openCityMenu) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenu, openCityMenu]);

  const handleLogout = async () => {
    try {
      const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/auth/logout`;
      await axios.post(URL, {}, { withCredentials: true });
    } catch {
      // ignore logout failures
    }
    localStorage.removeItem('token');
    dispatch(logout());
    setOpenMenu(false);
    navigate('/signin');
  };

  const setCity = (name) => {
    setSelectedCity(name);
    localStorage.setItem('city', name);
    setOpenCityMenu(false);
    setShowCityModal(false);
  };

  const toRad = (x) => (x * Math.PI) / 180;
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = cities[0];
        let minD = Infinity;
        for (const c of cities) {
          const d = haversineKm(latitude, longitude, c.lat, c.lng);
          if (d < minD) { minD = d; nearest = c; }
        }
        setCity(nearest.name);
        setDetecting(false);
      },
      (err) => {
        console.warn('Location error:', err);
        toast.error('Could not determine your location. Please allow location access.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };


  return (
    <>
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold text-pink-600 cursor-pointer" onClick={() => navigate('/')}>
              Tickezy
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-md px-3 py-2 w-96">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <input
                type="text"
                placeholder="Search for Movies, Events, Plays, Sports and Activities"
                className="bg-transparent outline-none text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-6">
            {/* City Dropdown */}
      <div className="relative" ref={cityMenuRef}>
              <button
        onClick={() => setOpenCityMenu((o) => !o)}
                className="flex items-center text-sm text-gray-700 hover:text-pink-600"
                title="Select City"
              >
                <MapPin className="w-4 h-4 mr-1" />
        <span>{selectedCity || 'Select City'}</span>
              </button>
              {openCityMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="px-3 py-2 text-xs text-gray-500">Select your city</div>
                  <div className="max-h-64 overflow-y-auto">
                    {cities.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setCity(c.name)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedCity === c.name ? 'text-pink-600 font-medium' : 'text-gray-700'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200" />
                  <button
                    onClick={detectLocation}
                    disabled={detecting}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${detecting ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
                  >
                    {detecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4" />
                    )}
                    {detecting ? 'Detecting…' : 'Detect Location'}
                  </button>
                </div>
              )}
            </div>

            {/* 👇 Conditionally render user name or Sign In */}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpenMenu((o) => !o)}
                  className="text-sm flex justify-center items-center gap-2 font-medium text-gray-700 hover:text-pink-600"
                  title="Account"
                >
                  <div className=" bg-gray-200 rounded-full flex items-center justify-center">
                    <Avatar name={user.name} imageUrl={user.profilePic}/>
                  </div>
                  Hello, {user?.name?.split(' ')[0] || 'User'}
                </button>

                {openMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    {user?.role === 'Admin' ? (
                      <button
                        onClick={() => { setOpenMenu(false); navigate('/dashboard'); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" /> Dashboard
                      </button>
                    ) : (
                      <button
                        onClick={() => { setOpenMenu(false); navigate('/profile'); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" /> Profile
                      </button>
                    )}
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="text-sm text-gray-700 hover:text-pink-600 transition-colors"
                onClick={() => navigate('/signin')}
              >
                Sign In
              </button>
            )}

          </div>
        </div>
      </div>
  </nav>
    
    {/* First-time City Selection Modal */}
  {showCityModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink-600" />
              <h2 className="text-lg font-semibold">Choose your city</h2>
            </div>
            <button
              onClick={() => setShowCityModal(false)}
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Search city"
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {cities
                .filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                .map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCity(c.name)}
                    className={`text-left px-3 py-2 rounded border hover:border-pink-300 hover:bg-pink-50 ${selectedCity === c.name ? 'border-pink-400 bg-pink-50' : 'border-gray-200'}`}
                  >
                    {c.name}
                  </button>
                ))}
            </div>

            <div className="mt-4">
              <button
                onClick={detectLocation}
                disabled={detecting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border ${detecting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'} `}
              >
                {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                {detecting ? 'Detecting your location…' : 'Use my location'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">We'll pick the nearest city to you.</p>
            </div>
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2 rounded-b-lg">
            <button
              onClick={() => setShowCityModal(false)}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Navbar;
