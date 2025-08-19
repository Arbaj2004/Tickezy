import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Film, Monitor, DollarSign, Save, ArrowLeft, AlertCircle, Check, X } from 'lucide-react';
import axios from 'axios';

const CreateShowPage = ({ editData, onSuccess }) => {
  const [formData, setFormData] = useState({
    movie_id: editData?.movie_id || '',
    theatre_id: editData?.theatre_id || '',
    screen_id: editData?.screen_id || '',
    show_datetime: editData?.show_datetime || '',
    price: editData?.price || '',
    status: editData?.status || 'active'
  });

  const [data, setData] = useState({
    movies: [],
    theatres: [],
    screens: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    movies: false,
    theatres: false,
    screens: false
  });

  const fetchMovies = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, movies: true }));
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/movie`);
      const data = await response.json();
      setData(prev => ({ ...prev, movies: data.data || [] }));
    } catch (error) {
      console.error('Error fetching movies:', error);
      setData(prev => ({ ...prev, movies: [] }));
    } finally {
      setLoadingStates(prev => ({ ...prev, movies: false }));
    }
  }, []);

  const fetchTheatres = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, theatres: true }));
    try {
      console.log('Fetching theatres...');
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/theatre`);
      const data = await response.json();
      console.log('Theatres response:', data);
      setData(prev => ({ ...prev, theatres: data.data || [] }));
    } catch (error) {
      console.error('Error fetching theatres:', error);
      setData(prev => ({ ...prev, theatres: [] }));
    } finally {
      setLoadingStates(prev => ({ ...prev, theatres: false }));
    }
  }, []);

  const fetchScreens = useCallback(async (theatreId) => {
    const targetTheatreId = theatreId;
    if (!targetTheatreId) return;
    
    setLoadingStates(prev => ({ ...prev, screens: true }));
    try {
      console.log('Fetching screens for theatre:', targetTheatreId);
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/theatre/${targetTheatreId}/screens`);
      const data = await response.json();
      console.log('Screens response:', data);
      setData(prev => ({ ...prev, screens: data.data || [] }));
    } catch (error) {
      console.error('Error fetching screens:', error);
      setData(prev => ({ ...prev, screens: [] }));
    } finally {
      setLoadingStates(prev => ({ ...prev, screens: false }));
    }
  }, []);

  // Fetch movies on component mount
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Update form data when editData changes
  useEffect(() => {
    if (editData) {
      // Set the form data first
      setFormData({
        movie_id: editData.movie_id || '',
        theatre_id: editData.theatre_id || '',
        screen_id: editData.screen_id || '',
        show_datetime: editData.show_datetime ? new Date(editData.show_datetime).toISOString().slice(0, 16) : '',
        price: editData.price || '',
        status: editData.status || 'active'
      });
      
      // Then load dependent data
      if (editData.movie_id) {
        fetchTheatres();
      }
      if (editData.theatre_id) {
        fetchScreens(editData.theatre_id);
      }
    } else {
      // Reset form for new show
      setFormData({
        movie_id: '',
        theatre_id: '',
        screen_id: '',
        show_datetime: '',
        price: '',
        status: 'active'
      });
      
      // Clear dependent data
      setData(prev => ({ ...prev, theatres: [], screens: [] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData]);

  // Fetch theatres when a movie is selected
  useEffect(() => {
    if (formData.movie_id && !editData) {
      console.log('Fetching theatres for movie:', formData.movie_id);
      fetchTheatres();
    }
  }, [formData.movie_id, fetchTheatres, editData]);

  // Fetch screens when a theatre is selected
  useEffect(() => {
    if (formData.theatre_id) {
      console.log('Fetching screens for theatre:', formData.theatre_id);
      fetchScreens(formData.theatre_id);
    } else {
      // clear screens if theatre is deselected
      setData(prev => ({ ...prev, screens: [] }));
      setFormData(prev => ({ ...prev, screen_id: '' }));
    }
  }, [formData.theatre_id, fetchScreens]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle special cases for dependent dropdowns
    if (name === 'movie_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        theatre_id: '', // Reset theatre when movie changes
        screen_id: '' // Reset screen when movie changes
      }));
      // Clear theatres and screens data
      setData(prev => ({ ...prev, theatres: [], screens: [] }));
    } else if (name === 'theatre_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        screen_id: '' // Reset screen when theatre changes
      }));
      // Clear screens data
      setData(prev => ({ ...prev, screens: [] }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
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
    
    if (!formData.movie_id) {
      newErrors.movie_id = 'Please select a movie';
    }
    
    if (!formData.theatre_id) {
      newErrors.theatre_id = 'Please select a theatre';
    }
    
    if (!formData.screen_id) {
      newErrors.screen_id = 'Please select a screen';
    }
    
    if (!formData.show_datetime) {
      newErrors.show_datetime = 'Please select a date and time';
    } else {
      const selectedDateTime = new Date(formData.show_datetime);
      const now = new Date();
      
      if (selectedDateTime <= now) {
        newErrors.show_datetime = 'Date and time must be in the future';
      }
    }    if (!formData.price) {
      newErrors.price = 'Please enter the price';
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      try {
        const isEditing = editData && editData.id;
        const url = isEditing 
          ? `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show/${editData.id}`
          : `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show`;
        
        const method = isEditing ? 'patch' : 'post';
        
        const response = await axios[method](
          url,
          {
            movie_id: parseInt(formData.movie_id),
            screen_id: parseInt(formData.screen_id),
            show_datetime: formData.show_datetime,
            price: parseFloat(formData.price),
            status: formData.status
          },
          {
            withCredentials: true,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (response.data.status === 'success') {
          // Show success message
          alert(isEditing ? 'Show updated successfully!' : 'Show created successfully!');
          
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess();
          } else {
            // Reset form only if not using callback (standalone mode)
            setFormData({
              movie_id: '',
              theatre_id: '',
              screen_id: '',
              show_datetime: '',
              price: '',
              status: 'active'
            });
            
            // Reset dependent data
            setData(prev => ({ ...prev, theatres: [], screens: [] }));
          }
        }
      } catch (error) {
        console.error('Error saving show:', error);
        alert(error.response?.data?.message || 'Error saving show. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const getSelectedMovieTitle = () => {
    const movie = data.movies.find(m => m.id === parseInt(formData.movie_id));
    return movie ? movie.title : '';
  };

  const getSelectedTheatreName = () => {
    const theatre = data.theatres.find(t => t.id === parseInt(formData.theatre_id));
    return theatre ? theatre.name : '';
  };

  const getSelectedScreenName = () => {
    const screen = data.screens.find(s => s.id === parseInt(formData.screen_id));
    return screen ? screen.name : '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <button className="flex items-center text-pink-600 hover:text-pink-500 mb-4 mx-auto transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Shows
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {editData ? 'Edit Show' : 'Create New Show'}
            </h2>
            <p className="text-gray-600">
              {editData ? 'Update the show details' : 'Set up a new movie show with all the details'}
            </p>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Movie Selection */}
              <div>
                <label htmlFor="movie_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Movie *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Film className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="movie_id"
                    name="movie_id"
                    value={formData.movie_id}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.movie_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading || loadingStates.movies}
                  >
                    <option value="">
                      {loadingStates.movies ? 'Loading movies...' : 'Choose a movie'}
                    </option>
                    {data.movies.map(movie => (
                      <option key={movie.id} value={movie.id}>
                        {movie.title} ({movie.genre})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.movie_id && <p className="mt-1 text-sm text-red-600">{errors.movie_id}</p>}
              </div>

              {/* Theatre Selection */}
              <div>
                <label htmlFor="theatre_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Theatre *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="theatre_id"
                    name="theatre_id"
                    value={formData.theatre_id}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.theatre_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading || loadingStates.theatres || !formData.movie_id}
                  >
                    <option value="">
                      {loadingStates.theatres ? 'Loading theatres...' : 
                       !formData.movie_id ? 'Select a movie first' : 'Choose a theatre'}
                    </option>
                    {data.theatres.map(theatre => (
                      <option key={theatre.id} value={theatre.id}>
                        {theatre.name} - {theatre.location}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.theatre_id && <p className="mt-1 text-sm text-red-600">{errors.theatre_id}</p>}
              </div>

              {/* Screen Selection */}
              <div>
                <label htmlFor="screen_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Screen *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Monitor className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="screen_id"
                    name="screen_id"
                    value={formData.screen_id}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.screen_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading || loadingStates.screens || !formData.theatre_id}
                  >
                    <option value="">
                      {loadingStates.screens ? 'Loading screens...' : 
                       !formData.theatre_id ? 'Select a theatre first' : 'Choose a screen'}
                    </option>
                    {data.screens.map(screen => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name} (Capacity: {screen.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.screen_id && <p className="mt-1 text-sm text-red-600">{errors.screen_id}</p>}
              </div>

              {/* Show DateTime */}
              <div>
                <label htmlFor="show_datetime" className="block text-sm font-medium text-gray-700 mb-2">
                  Show Date & Time *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="show_datetime"
                    name="show_datetime"
                    type="datetime-local"
                    value={formData.show_datetime}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                      errors.show_datetime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.show_datetime && <p className="mt-1 text-sm text-red-600">{errors.show_datetime}</p>}
              </div>

              {/* Price and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket Price (₹) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${
                        errors.price ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter ticket price"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                    disabled={isLoading}
                  >
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
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
                      {editData ? 'Updating Show...' : 'Creating Show...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editData ? 'Update Show' : 'Create Show'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Show Preview */}
          {(formData.movie_id || formData.theatre_id || formData.screen_id) && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
                Show Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Film className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Movie:</span>
                    <span className="ml-2 font-medium">{getSelectedMovieTitle() || 'Not selected'}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Theatre:</span>
                    <span className="ml-2 font-medium">{getSelectedTheatreName() || 'Not selected'}</span>
                  </div>
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Screen:</span>
                    <span className="ml-2 font-medium">{getSelectedScreenName() || 'Not selected'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="ml-2 font-medium">
                      {formData.show_datetime ? 
                        new Date(formData.show_datetime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'Asia/Kolkata'
                        }) : 
                        'Not selected'
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Price:</span>
                    <span className="ml-2 font-medium">{formData.price ? `₹${formData.price}` : 'Not entered'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Tips:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Select a movie first to see available theatres</li>
              <li>• Choose a theatre to view its screens</li>
              <li>• Set the date and time carefully - they cannot be changed later</li>
              <li>• Price should be in Indian Rupees (₹)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateShowPage;