import React, { useState, useEffect } from 'react';
import { MapPin, Building, Mail, ArrowRight, Shield, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function AddTheatreForm({ editData = null, onSuccess = () => {} }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    city: '',
    contact_email: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form data when editing
  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        location: editData.location || '',
        city: editData.city || '',
        contact_email: editData.contact_email || ''
      });
    }
  }, [editData]);

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
    
    if (!formData.name.trim()) {
      newErrors.name = 'Theatre name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Theatre name must be at least 3 characters';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    } else if (formData.location.length < 10) {
      newErrors.location = 'Please provide a detailed location address';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.length < 2) {
      newErrors.city = 'Please enter a valid city name';
    }
    
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      const isEditMode = editData && editData.id;
      const URL = isEditMode 
        ? `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/theatre/${editData.id}`
        : `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/theatre`;
      
      try {
        const theatreData = {
          name: formData.name,
          location: formData.location,
          city: formData.city,
          contact_email: formData.contact_email
        };

        const response = isEditMode
          ? await axios.patch(URL, theatreData, { withCredentials: true })
          : await axios.post(URL, theatreData, { withCredentials: true });

        console.log('Theatre operation successful:', response.data);
        if (response.data.status === "success") {
          setTimeout(() => {
            console.log('Theatre data:', formData);
            toast.success(isEditMode ? 'Theatre updated successfully!' : 'Theatre added successfully!');
            
            // Reset form only if not editing
            if (!isEditMode) {
              setFormData({
                name: '',
                location: '',
                city: '',
                contact_email: ''
              });
            }
            
            setIsLoading(false);
            onSuccess(); // Call the success callback
          }, 1000);
        } else {
          toast.error(response.data.message || `Failed to ${isEditMode ? 'update' : 'add'} theatre`);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Theatre operation error:', err);
        toast.error(`An error occurred while ${isEditMode ? 'updating' : 'adding'} the theatre`);
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  // Popular Indian cities for suggestions
  const popularCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
    'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Vadodara', 'Firozabad'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-pink-600 mr-3" />
              <h2 className="text-3xl font-bold text-gray-900">Tickezy</h2>
            </div>
            <p className="text-gray-600">{editData ? 'Edit Theatre Details' : 'Add New Theatre to Your Network'}</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-6">
              {/* Theatre Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Theatre Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter theatre name (e.g., PVR Phoenix Mall)"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    rows="3"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors resize-none ${
                      errors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter complete address with landmarks (e.g., 2nd Floor, Phoenix Mall, Viman Nagar, Pune - 411014)"
                    disabled={isLoading}
                  />
                </div>
                {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Include floor, mall/building name, area, and pincode for better visibility
                </p>
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    list="cities"
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter city name"
                    disabled={isLoading}
                  />
                  <datalist id="cities">
                    {popularCities.map(city => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.contact_email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="theatre@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Contact email for theatre management and customer support
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
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
                      {editData ? 'Updating Theatre...' : 'Adding Theatre...'}
                    </>
                  ) : (
                    <>
                      {editData ? 'Update Theatre' : 'Add Theatre'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Theatre Guidelines */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">Verification Required</h3>
              </div>
              <p className="text-xs text-gray-600">
                All theatre details will be verified before going live on the platform
              </p>
            </div>

            {/* Partnership Benefits */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-3">
                <Users className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">Partnership Benefits</h3>
              </div>
              <p className="text-xs text-gray-600">
                Reach millions of movie lovers and manage bookings efficiently
              </p>
            </div>
          </div>

          {/* Theatre Requirements */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Theatre Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-1">• Valid Business License</p>
                <p className="text-blue-600">Required for partnership verification</p>
              </div>
              <div>
                <p className="font-medium mb-1">• Digital Payment Setup</p>
                <p className="text-blue-600">For seamless online transactions</p>
              </div>
              <div>
                <p className="font-medium mb-1">• Seating Chart Details</p>
                <p className="text-blue-600">Will be configured after approval</p>
              </div>
              <div>
                <p className="font-medium mb-1">• Staff Training</p>
                <p className="text-blue-600">Support provided for platform usage</p>
              </div>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help with theatre registration?{' '}
              <button className="text-pink-600 hover:text-pink-500 font-medium">
                Contact Partnership Team
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}