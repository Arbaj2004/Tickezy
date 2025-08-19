import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Star, Clock, MapPin, Calendar, Heart, Share2, Info, Car, Utensils, Wifi } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const MovieBookingPage = () => {
  const [selectedDate, setSelectedDate] = useState(0);
  const [movie, setMovie] = useState({});
  const [allShows, setAllShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('city') || '');
  // City modal is managed globally in Navbar; we'll trigger it via a custom event
  // City options are handled in Navbar

  // Keep selectedCity in sync if user changes it from Navbar (localStorage)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'city') {
        setSelectedCity(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Generate dates for the next 7 days - memoized to prevent infinite re-renders
  const dates = useMemo(() => {
    const dateArray = [];
    
    // Get current date in IST (Indian Standard Time)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const today = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
    
    for (let i = 0; i < 7; i++) {
      // Create a new date for each iteration to avoid mutation
      const currentDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
      
      // Format date components
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const fullDate = `${year}-${month}-${day}`;
    
      dateArray.push({
        date: currentDate.getDate(),
        month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: fullDate,
        isToday: i === 0 // First date is always today
      });
    }
    
    console.log('Generated dates:', dateArray);
    console.log('Current date (today):', new Date().toISOString().split('T')[0]);
    
    return dateArray;
  }, []);

  const { id } = useParams();
  
  const fetchMovieAndShows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : '';
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show/${id}/shows${qs}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched movie data:', data);
      console.log('Generated dates for comparison:', dates.map(d => ({
        fullDate: d.fullDate,
        displayText: `${d.day}, ${d.date} ${d.month}`,
        isToday: d.isToday
      })));
      
      // Set movie details
      const { theatres, ...movieData } = data;
      setMovie(movieData || {});
      
      // Organize shows by date and theater - inline function
      const organizedData = {};
      
      // Initialize with empty arrays for all 7 dates
      dates.forEach(date => {
        organizedData[date.fullDate] = [];
      });
      
      // Group theatres and shows by date
  if (theatres) {
        theatres.forEach(theatre => {
          // Each theatre already has a show_date from the backend
          const showDate = theatre.show_date;
          
          if (showDate && organizedData[showDate]) {
            organizedData[showDate].push({
              id: theatre.id,
              name: theatre.name,
              address: theatre.address,
              showtimes: theatre.showtimes.map(showtime => ({
                id: showtime.id, // preserve show id for navigation
                screen_id: showtime.screen_id,
                time: showtime.time,
                price: showtime.price,
                datetime: showtime.datetime,
                availability: 'Available' // You can add logic for availability later
              }))
            });
          }
        });
      }
      
      console.log('Final organized shows by date:', organizedData);
      console.log('Today should be:', dates.find(d => d.isToday)?.fullDate);
      
      setAllShows(organizedData);
      
    } catch (error) {
      console.error('Error fetching movie and shows:', error);
      setError(error.message);
      setMovie({});
      setAllShows([]);
    } finally {
      setLoading(false);
    }
  }, [id, dates, selectedCity]);

  useEffect(() => {
    if (id) {
      if (!selectedCity) {
        setLoading(false);
        return; // Navbar will show the modal automatically on first load
      }
      fetchMovieAndShows();
    }
  }, [id, fetchMovieAndShows, selectedCity]);

  // Get theaters for the selected date
  const getTheatersForSelectedDate = useCallback(() => {
    const selectedDateString = dates[selectedDate]?.fullDate;
    return allShows[selectedDateString] || [];
  }, [dates, selectedDate, allShows]);

  // Handle date selection
  const handleDateSelection = (dateIndex) => {
    setSelectedDate(dateIndex);
    const selectedDateString = dates[dateIndex].fullDate;
    console.log('Selected date:', selectedDateString);
  };

  // Use theatres as returned by backend for the selected date
  const theatersForDate = useMemo(() => getTheatersForSelectedDate(), [getTheatersForSelectedDate]);

  // Prompt city selection on first visit if not chosen yet
  const openCityModal = () => window.dispatchEvent(new Event('openCityModal'));

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'Available':
        return 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100';
      case 'Fast Filling':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'Sold Out':
        return 'text-red-600 border-red-200 bg-red-50 cursor-not-allowed opacity-50';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const handleShowtimeClick = (theater, showtime) => {
    if (showtime.availability === 'Sold Out') return;
    
    // Navigate to seat selection page with specific show id
    if (showtime.id) {
      navigate(`/bookticket/${showtime.id}`);
      return;
    }
    console.warn('Missing showtime.id; cannot navigate to booking page.');
  };

  // Format the release date
  const formatReleaseDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Convert duration from minutes to hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar/>
      {/* City disclaimer */}
  {!selectedCity && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="text-sm text-yellow-800">Please select your city from the navbar to view available theatres and showtimes.</div>
    <button onClick={openCityModal} className="text-sm font-medium text-yellow-900 hover:underline">Choose City</button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-gray-600">Loading movie details...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading movie details</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchMovieAndShows}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movie Content - Only show when not loading and no error */}
      {!loading && !error && (
        <>

      {/* Movie Info Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Movie Poster */}
            <div className="flex-shrink-0">
              <img 
                src={movie.poster_url || 'https://via.placeholder.com/300x450/DC143C/FFFFFF?text=Movie+Poster'} 
                alt={movie.title || 'Movie Poster'}
                className="w-48 h-72 object-cover rounded-lg shadow-lg"
              />
            </div>
            
            {/* Movie Details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{movie.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded">
                  <Star className="w-4 h-4 mr-1" />
                  8.0/10
                </div>
                <span className="text-gray-600">{movie.rating}</span>
                <span className="text-gray-600">{movie.language}</span>
              </div>
              
              <div className="flex items-center text-gray-600 mb-4">
                <Clock className="w-4 h-4 mr-2" />
                {formatDuration(movie.duration_minutes)}
              </div>
              
              {movie.release_date && (
                <div className="flex items-center text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  Released on {formatReleaseDate(movie.release_date)}
                </div>
              )}
              
              <p className="text-gray-700 mb-4 leading-relaxed">{movie.description}</p>
              
              {movie.trailer_url && (
                <a 
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
                >
                  Watch Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Date Selection */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
            {dates.map((date, index) => (
              <button
                key={index}
                onClick={() => handleDateSelection(index)}
                className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all min-w-[80px] ${
                  selectedDate === index
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="text-sm font-medium">{date.day}</span>
                <span className="text-lg font-bold">{date.date}</span>
                <span className="text-xs">{date.month}</span>
                {date.isToday && (
                  <span className="text-xs text-pink-600 font-medium">Today</span>
                )}
                {/* Debug info - remove after fixing */}
                <span className="text-xs text-gray-400" style={{fontSize: '8px'}}>
                  {date.fullDate}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

  {/* Theaters and Showtimes */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {dates[selectedDate] ? 
              `${dates[selectedDate].day}, ${dates[selectedDate].date} ${dates[selectedDate].month}` : 
              'Loading...'
            }
          </h2>
          
          <div className="space-y-6">
  {selectedCity && theatersForDate.map(theater => (
              <div key={theater.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Theater Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{theater.name}</h3>
                      <div className="flex items-center text-gray-600 text-sm mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {theater.address}
                      </div>
                      {/* Removed redundant show date display since it's shown in the section header */}
                    </div>
                    <button className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                      Info
                    </button>
                  </div>
                  
                  {/* Showtimes */}
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-3">
                      {theater.showtimes.map((showtime, index) => (
                        <button
                          key={index}
                          onClick={() => handleShowtimeClick(theater, showtime)}
                          disabled={showtime.availability === 'Sold Out'}
                          className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${getAvailabilityColor(showtime.availability || 'Available')}`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{showtime.time}</div>
                            <div className="text-xs">₹{showtime.price}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedCity && theatersForDate.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No theaters available for the selected date.</p>
              <p className="text-gray-400 text-sm mt-2">Try selecting a different date.</p>
            </div>
          )}
      {!selectedCity && (
            <div className="text-center py-12">
              <p className="text-gray-600">Select your city to view theatres for this movie.</p>
        <button onClick={openCityModal} className="mt-3 inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700">Choose City</button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>Book tickets for the latest movies at the best prices</p>
          </div>
        </div>
      </footer>
  {/* City picker modal now lives in Navbar */}
      </>
      )}
    </div>
  );
};

export default MovieBookingPage;