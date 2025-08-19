import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Calendar, Clock, Filter, Play, Heart, Share2, User, Menu, X } from 'lucide-react';
import Navbar from '../components/Navbar';

const LandingPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  // const genres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
  const languages = ['All', 'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'];
  const fetchMovies = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/movie`);
      const data = await response.json();
      setMovies(data.data || []);
      console.log('Movies fetched:', data.data);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setMovies([]);
    }
  };
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    // const matchesGenre = selectedGenre === 'All' || movie.genre === selectedGenre;
    const matchesLanguage = selectedLanguage === 'All' || movie.language === selectedLanguage;
    return matchesSearch  && matchesLanguage;
  });
  useEffect(() => {
    fetchMovies();
    }, []);

  const MovieCard = ({ movie }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <div className="relative">
        <img 
          src={movie.poster_url || 'https://img.freepik.com/free-vector/word-bang-comic-cloud_1308-54664.jpg?w=2000'} 
          alt={movie.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          {movie.rating}
        </div>
        <div className="absolute bottom-3 left-3 bg-pink-600 text-white px-2 py-1 rounded text-sm">
          {movie.language}
        </div>

      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{movie.title}</h3>
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Clock className="w-4 h-4 mr-1" />
          {movie.duration_minutes} min
          <span className="mx-2">•</span>
          {/* <span>{movie.genre}</span> */}
        </div>
        <p className="text-sm text-gray-600 mb-3 line-clamp-1">{movie.description}</p>
        
        {/* <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>{movie.theaters} theaters</span>
          <span>{movie.shows} shows</span>
        </div> */}
        
        <button className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors font-medium" onClick={() => navigate(`/${movie.id}/shows`)} >
          Book Tickets
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Book Movie Tickets Online
            </h2>
            <p className="text-xl mb-8 text-pink-100">
              Your favorite movies, just a click away
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* City Selection moved to Navbar */}
                  
                  
                  {/* Search Input */}
                  <div className="flex items-center min-w-0 flex-1">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                      type="text"
                      placeholder="Search for movies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border-0 focus:ring-0 text-gray-700 placeholder-gray-400"
                    />
                  </div>
                  
                  <button className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 transition-colors font-medium">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-gray-700 font-medium">Filters:</span>
            </div>
            
            {/* <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select> */}
            
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {languages.map(language => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            
            <span className="text-gray-500 text-sm ml-auto">
              {filteredMovies.length} movies found
            </span>
          </div>
        </div>
      </section>

      {/* Movies Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Now Showing</h2>
            <button className="text-pink-600 hover:text-pink-700 font-medium">
              View All
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
          
          {filteredMovies.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No movies found matching your criteria</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                //   setSelectedGenre('All');
                  setSelectedLanguage('All');
                }}
                className="mt-4 text-pink-600 hover:text-pink-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
          <footer className="border-t border-gray-800 py-4 bg-gray-900 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BookMyShow. All rights reserved.</p>
        </footer>
    </div>
  );
};

export default LandingPage;