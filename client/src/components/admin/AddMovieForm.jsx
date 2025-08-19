import React, { useState, useEffect } from 'react';
import { Film, Clock, Calendar, Globe, Star, Link, Image, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function AddMovieForm({ editData = null, onSuccess = () => {} }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: '',
    release_date: '',
    language: '',
    rating: '',
    poster_url: '',
    trailer_url: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        title: editData.title || '',
        description: editData.description || '',
        duration_minutes: editData.duration_minutes || '',
        release_date: editData.release_date ? editData.release_date.split('T')[0] : '',
        language: editData.language || '',
        rating: editData.rating || '',
        poster_url: editData.poster_url || '',
        trailer_url: editData.trailer_url || ''
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.duration_minutes || formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0';
    }
    if (!formData.release_date) newErrors.release_date = 'Release date is required';
    if (!formData.language.trim()) newErrors.language = 'Language is required';
    if (!formData.rating) newErrors.rating = 'Rating is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      const isEditMode = editData && editData.id;
      const URL = isEditMode 
        ? `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/movie/${editData.id}`
        : `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/movie`;

      try {
        const movieData = { ...formData };

        const response = isEditMode
          ? await axios.patch(URL, movieData, { withCredentials: true })
          : await axios.post(URL, movieData, { withCredentials: true });

        if (response.data.status === "success") {
          setTimeout(() => {
            toast.success(isEditMode ? 'Movie updated successfully!' : 'Movie added successfully!');
            if (!isEditMode) {
              setFormData({
                title: '',
                description: '',
                duration_minutes: '',
                release_date: '',
                language: '',
                rating: '',
                poster_url: '',
                trailer_url: ''
              });
            }
            setIsLoading(false);
            onSuccess();
          }, 800);
        } else {
          toast.error(response.data.message || `Failed to ${isEditMode ? 'update' : 'add'} movie`);
          setIsLoading(false);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Something went wrong");
        setIsLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const ratings = ['U', 'UA', 'A', 'U/A 13+', 'U/A 16+', 'A 18+'];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Film className="w-6 h-6 text-pink-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">
          {editData ? 'Edit Movie' : 'Add New Movie'}
        </h2>
      </div>

      {/* Form */}
      <form className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700">Movie Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Enter movie title"
            className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 outline-none ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows="3"
            value={formData.description}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="Enter movie description"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none resize-none"
          />
        </div>

        {/* Duration & Release */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Duration (minutes) *</label>
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="120"
              className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 outline-none ${
                errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.duration_minutes && <p className="text-xs text-red-600 mt-1">{errors.duration_minutes}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Release Date *</label>
            <input
              type="date"
              name="release_date"
              value={formData.release_date}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 outline-none ${
                errors.release_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.release_date && <p className="text-xs text-red-600 mt-1">{errors.release_date}</p>}
          </div>
        </div>

        {/* Language & Rating */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Language *</label>
            <input
              type="text"
              name="language"
              value={formData.language}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="English, Hindi, Tamil, etc."
              className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 outline-none ${
                errors.language ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.language && <p className="text-xs text-red-600 mt-1">{errors.language}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Rating *</label>
            <select
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 outline-none ${
                errors.rating ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select rating</option>
              {ratings.map(rating => (
                <option key={rating} value={rating}>{rating}</option>
              ))}
            </select>
            {errors.rating && <p className="text-xs text-red-600 mt-1">{errors.rating}</p>}
          </div>
        </div>

        {/* Poster URL */}
        <div>
          <label className="text-sm font-medium text-gray-700">Poster URL</label>
          <input
            type="url"
            name="poster_url"
            value={formData.poster_url}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="https://example.com/poster.jpg"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
          />
        </div>

        {/* Trailer URL */}
        <div>
          <label className="text-sm font-medium text-gray-700">Trailer URL</label>
          <input
            type="url"
            name="trailer_url"
            value={formData.trailer_url}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="https://youtube.com/watch?v=..."
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`w-full flex justify-center items-center px-4 py-2 rounded-lg font-medium text-white shadow-sm transition-all ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-pink-600 hover:bg-pink-700 focus:ring-2 focus:ring-pink-500'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {editData ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                {editData ? 'Update Movie' : 'Add Movie'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
