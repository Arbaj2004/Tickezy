
import React, { useState, useEffect } from "react";
import { Film, Building2, Calendar, Ticket, BarChart2, LogOut, Menu, X, Edit, Plus, Layout, Trash2, RefreshCw } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import AddMovieForm from "../components/admin/AddMovieForm";
import AddTheatreForm from "../components/admin/AddTheatreForm";
import TheaterLayoutDesigner from "../components/admin/TheaterLayoutDesigner";
import AddShow from "../components/admin/AddShow";
import Avatar from "../components/Avatar";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { loginSuccess, logout } from '../redux/slices/userSlice';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Redux state
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.user);
  
  // Data states
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [screens, setScreens] = useState([]);
  const [shows, setShows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    movies: false,
    theatres: false,
    screens: false,
    shows: false
  });
  
  // For add/list toggle in each section
  const [movieMode, setMovieMode] = useState("list");
  const [theatreMode, setTheatreMode] = useState("list");
  const [screenMode, setScreenMode] = useState("list");
  const [showMode, setShowMode] = useState("list");
  
  // For edit modals
  const [editMovie, setEditMovie] = useState(null);
  const [editTheatre, setEditTheatre] = useState(null);
  const [editScreen, setEditScreen] = useState(null);
  const [editShow, setEditShow] = useState(null);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_BASEURL;

  // Fetch user data on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token && !isAuthenticated) {
      const fetchUser = async () => {
        try {
          const URL = `${API_BASE_URL}/auth/me`;
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const response = await axios.get(URL, {
            withCredentials: true,
            headers
          });

          if (response.data?.data?.user) {
            dispatch(loginSuccess({ user: response.data.data.user, token }));
          }
        } catch (err) {
          console.error("Session expired or token invalid:", err.response?.data?.message);
        }
      };

      fetchUser();
    }
  }, [API_BASE_URL, dispatch, isAuthenticated]);

  // API Functions
  const fetchMovies = async () => {
    setLoadingStates(prev => ({ ...prev, movies: true }));
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(`${API_BASE_URL}/movie`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        setMovies(response.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch movies");
      console.error("Error fetching movies:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, movies: false }));
    }
  };

  const fetchTheatres = async () => {
    setLoadingStates(prev => ({ ...prev, theatres: true }));
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(`${API_BASE_URL}/theatre`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        setTheatres(response.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch theatres");
      console.error("Error fetching theatres:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, theatres: false }));
    }
  };

  const fetchScreens = async () => {
    setLoadingStates(prev => ({ ...prev, screens: true }));
    try {
      // Get all screens across all theatres
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(`${API_BASE_URL}/theatre`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        const allScreens = [];
        const theatres = response.data.data || [];
        
        // Fetch screens for each theatre
        for (const theatre of theatres) {
          try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const screenResponse = await axios.get(`${API_BASE_URL}/theatre/${theatre.id}/screens`, { withCredentials: true, headers });
            if (screenResponse.data.status === "success" && screenResponse.data.data) {
              const theatreScreens = screenResponse.data.data.map(screen => ({
                ...screen,
                theatre_name: theatre.name,
                theatre_id: theatre.id
              }));
              allScreens.push(...theatreScreens);
            }
          } catch (screenError) {
            console.error(`Error fetching screens for theatre ${theatre.id}:`, screenError);
          }
        }
        
        setScreens(allScreens);
      }
    } catch (error) {
      toast.error("Failed to fetch screens");
      console.error("Error fetching screens:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, screens: false }));
    }
  };

  const fetchShows = async () => {
    setLoadingStates(prev => ({ ...prev, shows: true }));
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(`${API_BASE_URL}/show`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        const showsData = response.data.data || [];
        // The backend now returns all necessary data including theatre_id, movie_title, theatre_name, screen_name
        setShows(showsData);
      }
    } catch (error) {
      toast.error("Failed to fetch shows");
      console.error("Error fetching shows:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, shows: false }));
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get(`${API_BASE_URL}/bookings/analytics`, { withCredentials: true, headers });
      if (res.data.status === 'success') setAnalytics(res.data.data);
    } catch (e) {
      toast.error('Failed to load analytics');
      console.error('Analytics error:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const deleteMovie = async (movieId) => {
    if (!window.confirm("Are you sure you want to delete this movie?")) return;
    
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.delete(`${API_BASE_URL}/movie/${movieId}`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        toast.success("Movie deleted successfully");
        fetchMovies(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to delete movie");
      console.error("Error deleting movie:", error);
    }
  };

  const deleteTheatre = async (theatreId) => {
    if (!window.confirm("Are you sure you want to delete this theatre?")) return;
    
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.delete(`${API_BASE_URL}/theatre/${theatreId}`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        toast.success("Theatre deleted successfully");
        fetchTheatres(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to delete theatre");
      console.error("Error deleting theatre:", error);
    }
  };

  const deleteScreen = async (screenId) => {
    if (!window.confirm("Are you sure you want to delete this screen?")) return;
    
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.delete(`${API_BASE_URL}/screen/${screenId}`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        toast.success("Screen deleted successfully");
        fetchScreens(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to delete screen");
      console.error("Error deleting screen:", error);
    }
  };

  const deleteShow = async (showId) => {
    if (!window.confirm("Are you sure you want to delete this show?")) return;
    
    try {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.delete(`${API_BASE_URL}/show/${showId}`, { withCredentials: true, headers });
      if (response.data.status === "success") {
        toast.success("Show deleted successfully");
        fetchShows(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to delete show");
      console.error("Error deleting show:", error);
    }
  };

  // Fetch data when component mounts or when tab changes
  useEffect(() => {
    const fetchDataForTab = () => {
      switch (activeTab) {
        case "movies":
          if (movies.length === 0) fetchMovies();
          break;
        case "theaters":
          if (theatres.length === 0) fetchTheatres();
          break;
        case "screens":
          if (screens.length === 0) fetchScreens();
          if (theatres.length === 0) fetchTheatres(); // Also fetch theatres for screen creation
          break;
        case "shows":
          if (shows.length === 0) fetchShows();
          if (movies.length === 0) fetchMovies(); // Also fetch movies for show creation
          if (theatres.length === 0) fetchTheatres(); // Also fetch theatres for show creation
          break;
        case "analytics":
          if (!analytics) fetchAnalytics();
          break;
        default:
          break;
      }
    };

    fetchDataForTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Movies Section
  const renderMovies = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Movie Management</h2>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${movieMode === "list" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setMovieMode("list"); setEditMovie(null); }}
          >List</button>
          <button
            className={`px-4 py-2 rounded ${movieMode === "add" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setMovieMode("add"); setEditMovie(null); }}
          >Add Movie</button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchMovies}
            disabled={loadingStates.movies}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStates.movies ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {movieMode === "add" || editMovie ? (
        <div className="bg-white rounded-lg shadow p-6">
          <AddMovieForm editData={editMovie} onSuccess={() => {
            setMovieMode("list");
            setEditMovie(null);
            fetchMovies();
          }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {loadingStates.movies ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Title</th>
                  <th className="py-2 px-4 text-left">Language</th>
                  <th className="py-2 px-4 text-left">Release Date</th>
                  <th className="py-2 px-4 text-left">Rating</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                      No movies found. Add your first movie!
                    </td>
                  </tr>
                ) : (
                  movies.map(movie => (
                    <tr key={movie.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{movie.title}</td>
                      <td className="py-2 px-4">{movie.language}</td>
                      <td className="py-2 px-4">{new Date(movie.release_date).toLocaleDateString()}</td>
                      <td className="py-2 px-4">{movie.rating}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:underline flex items-center gap-1" 
                            onClick={() => { setEditMovie(movie); setMovieMode("add"); }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                          <button 
                            className="text-red-600 hover:underline flex items-center gap-1"
                            onClick={() => deleteMovie(movie.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // Theatres Section
  const renderTheatres = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Theatre Management</h2>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${theatreMode === "list" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setTheatreMode("list"); setEditTheatre(null); }}
          >List</button>
          <button
            className={`px-4 py-2 rounded ${theatreMode === "add" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setTheatreMode("add"); setEditTheatre(null); }}
          >Add Theatre</button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchTheatres}
            disabled={loadingStates.theatres}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStates.theatres ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {theatreMode === "add" || editTheatre ? (
        <div className="bg-white rounded-lg shadow p-6">
          <AddTheatreForm editData={editTheatre} onSuccess={() => {
            setTheatreMode("list");
            setEditTheatre(null);
            fetchTheatres();
          }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {loadingStates.theatres ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">City</th>
                  <th className="py-2 px-4 text-left">Location</th>
                  <th className="py-2 px-4 text-left">Contact Email</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {theatres.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                      No theatres found. Add your first theatre!
                    </td>
                  </tr>
                ) : (
                  theatres.map(theatre => (
                    <tr key={theatre.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{theatre.name}</td>
                      <td className="py-2 px-4">{theatre.city}</td>
                      <td className="py-2 px-4">{theatre.location}</td>
                      <td className="py-2 px-4">{theatre.contact_email || 'N/A'}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:underline flex items-center gap-1" 
                            onClick={() => { setEditTheatre(theatre); setTheatreMode("add"); }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                          <button 
                            className="text-red-600 hover:underline flex items-center gap-1"
                            onClick={() => deleteTheatre(theatre.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // Screens Section
  const renderScreens = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Screen Layouts</h2>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${screenMode === "list" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setScreenMode("list"); setEditScreen(null); }}
          >List</button>
          <button
            className={`px-4 py-2 rounded ${screenMode === "add" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setScreenMode("add"); setEditScreen(null); }}
          >Add Screen</button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchScreens}
            disabled={loadingStates.screens}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStates.screens ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {screenMode === "add" || editScreen ? (
        <div className="bg-white rounded-lg shadow p-6">
          <TheaterLayoutDesigner 
            editData={editScreen} 
            theatres={theatres}
            onSuccess={() => {
              setScreenMode("list");
              setEditScreen(null);
              fetchScreens();
            }} 
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {loadingStates.screens ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Screen Name</th>
                  <th className="py-2 px-4 text-left">Theatre</th>
                  <th className="py-2 px-4 text-left">Total Seats</th>
                  <th className="py-2 px-4 text-left">Created</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {screens.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                      No screens found. Add your first screen layout!
                    </td>
                  </tr>
                ) : (
                  screens.map(screen => (
                    <tr key={screen.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{screen.name}</td>
                      <td className="py-2 px-4">{screen.theatre_name || 'N/A'}</td>
                      <td className="py-2 px-4">{screen.total_seats}</td>
                      <td className="py-2 px-4">{screen.created_at ? new Date(screen.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:underline flex items-center gap-1" 
                            onClick={() => { setEditScreen(screen); setScreenMode("add"); }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                          <button 
                            className="text-red-600 hover:underline flex items-center gap-1"
                            onClick={() => deleteScreen(screen.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // Simple SVG chart helpers
  const BarChart = ({ data, labelKey, valueKey, height = 160 }) => {
    const max = Math.max(1, ...data.map(d => Number(d[valueKey] || 0)));
    const barW = 28, gap = 12;
    const width = data.length * (barW + gap) + gap;
    return (
      <svg width={width} height={height} className="overflow-visible">
        {data.map((d, i) => {
          const val = Number(d[valueKey] || 0);
          const h = Math.round((val / max) * (height - 30));
          const x = gap + i * (barW + gap);
          const y = height - h - 20;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={4} className="fill-pink-500" />
              <text x={x + barW / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-gray-600">
                {(d[labelKey] || '').toString().slice(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const PieChart = ({ data, valueKey, height = 160, width = 160 }) => {
    const total = data.reduce((s, d) => s + Number(d[valueKey] || 0), 0) || 1;
    const r = Math.min(width, height) / 2 - 8;
    const cx = width / 2, cy = height / 2;
    let start = 0;
    const colors = ['#ec4899','#8b5cf6','#22c55e','#f59e0b','#06b6d4','#ef4444','#6366f1'];
    return (
      <svg width={width} height={height}>
        {data.map((d, i) => {
          const value = Number(d[valueKey] || 0);
          const angle = (value / total) * Math.PI * 2;
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const end = start + angle;
          const x2 = cx + r * Math.cos(end);
          const y2 = cy + r * Math.sin(end);
          const largeArc = angle > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          start = end;
          return <path key={i} d={path} fill={colors[i % colors.length]} />;
        })}
      </svg>
    );
  };

  // Analytics Section (live)
  const renderAnalytics = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 text-gray-800">
        <BarChart2 className="w-5 h-5" />
        <b>Analytics</b>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          <p className="text-2xl font-bold text-pink-600">₹ {analytics ? analytics.totals.revenue.toLocaleString('en-IN') : '—'}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600">Total Bookings</h3>
          <p className="text-2xl font-bold text-pink-600">{analytics ? analytics.totals.bookings.toLocaleString('en-IN') : '—'}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-600">Active Shows</h3>
          <p className="text-2xl font-bold text-pink-600">{analytics ? analytics.totals.active_shows.toLocaleString('en-IN') : '—'}</p>
        </div>
      </div>

      {loadingAnalytics && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Revenue by Movie (Top 10)</h3>
            </div>
            <BarChart data={analytics.revenue_by_movie} labelKey="movie" valueKey="revenue" />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bookings by City</h3>
            </div>
            <BarChart data={analytics.bookings_by_city} labelKey="city" valueKey="bookings" />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Revenue (Last 30 days)</h3>
            </div>
            <BarChart data={analytics.revenue_by_day} labelKey="day" valueKey="revenue" />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seat Utilization</h3>
            </div>
            <div className="flex items-center gap-6">
              <PieChart data={[{label:'Sold', value: analytics.seats.sold},{label:'Available', value: analytics.seats.available}]} valueKey="value" />
              <div>
                <div className="text-sm text-gray-700"><span className="inline-block w-3 h-3 rounded-sm mr-2" style={{background:'#ec4899'}} /> Sold: {analytics.seats.sold}</div>
                <div className="text-sm text-gray-700 mt-2"><span className="inline-block w-3 h-3 rounded-sm mr-2" style={{background:'#8b5cf6'}} /> Available: {analytics.seats.available}</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Top Theatres</h3>
            </div>
            <BarChart data={analytics.top_theatres} labelKey="theatre" valueKey="revenue" />
          </div>
        </div>
      )}
    </div>
  );

  // Bookings Section (placeholder)
  const renderBookings = () => (
    <div className="p-6">🎟 <b>Bookings</b> - View and manage all ticket bookings.</div>
  );

  // Shows Section
  const renderShows = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Show Management</h2>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${showMode === "list" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setShowMode("list"); setEditShow(null); }}
          >List</button>
          <button
            className={`px-4 py-2 rounded ${showMode === "add" ? "bg-pink-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setShowMode("add"); setEditShow(null); }}
          >Add Show</button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchShows}
            disabled={loadingStates.shows}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStates.shows ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {showMode === "add" || editShow ? (
        <div className="bg-white rounded-lg shadow p-6">
          <AddShow 
            editData={editShow} 
            onSuccess={() => {
              setShowMode("list");
              setEditShow(null);
              fetchShows();
            }} 
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {loadingStates.shows ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Movie</th>
                  <th className="py-2 px-4 text-left">Theatre</th>
                  <th className="py-2 px-4 text-left">Screen</th>
                  <th className="py-2 px-4 text-left">Date & Time</th>
                  <th className="py-2 px-4 text-left">Price</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                      No shows found. Add your first show!
                    </td>
                  </tr>
                ) : (
                  shows.map(show => (
                    <tr key={show.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{show.movie_title}</td>
                      <td className="py-2 px-4">{show.theatre_name}</td>
                      <td className="py-2 px-4">{show.screen_name}</td>
                      <td className="py-2 px-4">
                        {show.show_datetime ? 
                          new Date(show.show_datetime).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata'
                          }) :
                          'N/A'
                        }
                      </td>
                      <td className="py-2 px-4">₹{show.price}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          show.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {show.status}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:underline flex items-center gap-1" 
                            onClick={() => { setEditShow(show); setShowMode("add"); }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                          <button 
                            className="text-red-600 hover:underline flex items-center gap-1"
                            onClick={() => deleteShow(show.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // Main render
  const renderContent = () => {
    switch (activeTab) {
      case "movies":
        return renderMovies();
      case "theaters":
        return renderTheatres();
      case "screens":
        return renderScreens();
      case "shows":
        return renderShows();
      case "bookings":
        return renderBookings();
      case "analytics":
      default:
        return renderAnalytics();
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out`}>
        <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-bold text-pink-400">Tickezy Admin</h2>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-10 space-y-2">
          <button onClick={() => setActiveTab("analytics")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "analytics" ? "bg-pink-600" : ""}`}>
            <BarChart2 className="w-5 h-5 mr-3" /> Analytics
          </button>
          <button onClick={() => setActiveTab("movies")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "movies" ? "bg-pink-600" : ""}`}>
            <Film className="w-5 h-5 mr-3" /> Movies
          </button>
          <button onClick={() => setActiveTab("theaters")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "theaters" ? "bg-pink-600" : ""}`}>
            <Building2 className="w-5 h-5 mr-3" /> Theaters
          </button>
          <button onClick={() => setActiveTab("screens")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "screens" ? "bg-pink-600" : ""}`}>
            <Layout className="w-5 h-5 mr-3" /> Screens
          </button>
          <button onClick={() => setActiveTab("shows")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "shows" ? "bg-pink-600" : ""}`}>
            <Calendar className="w-5 h-5 mr-3" /> Shows
          </button>
          <button onClick={() => setActiveTab("bookings")} className={`flex items-center px-4 py-2 w-full text-left hover:bg-pink-600 rounded ${activeTab === "bookings" ? "bg-pink-600" : ""}`}>
            <Ticket className="w-5 h-5 mr-3" /> Bookings
          </button>
        </nav>

        <div className="absolute bottom-4 w-full px-4">
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              dispatch(logout());
              window.location.href = '/signin';
            }}
            className="flex items-center justify-center w-full bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
          >
            <LogOut className="w-5 h-5 mr-2" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <div className="bg-white shadow flex items-center justify-between px-6 py-4">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h1>
          
          {/* Admin Info Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="text-sm flex justify-center items-center gap-2 font-medium text-gray-700">
                <div className="bg-gray-200 rounded-full flex items-center justify-center">
                  <Avatar name={user.name} imageUrl={user.profilePic} />
                </div>
                <span>Hello, {user?.name?.split(' ')[0] || 'Admin'}</span>
                <span className="text-xs text-gray-500">({user?.role || 'Admin'})</span>
              </div>
            ) : (
              <span className="text-gray-600">Welcome, Admin</span>
            )}
          </div>
        </div>

        {/* Content */}
        <main>{renderContent()}</main>
      </div>
    </div>
  );
};

export default AdminDashboard;
