import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CreditCard, MapPin, Clock, Calendar, Star, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';

const SEAT_STATUS = {
  available: { color: 'bg-green-500 hover:bg-green-600', label: 'Available' },
  selected: { color: 'bg-orange-500', label: 'Selected' },
  booked: { color: 'bg-red-500 cursor-not-allowed', label: 'Booked' },
  hold: { color: 'bg-yellow-500 cursor-not-allowed', label: 'Hold' },
  blocked: { color: 'bg-gray-400 cursor-not-allowed', label: 'Blocked' }
};

const CELL_TYPES = {
  restricted: { color: 'bg-red-100', icon: '🚫' },
  path: { color: 'bg-gray-100', icon: '' },
  seat: { color: 'bg-green-500', icon: '💺' },
  door: { color: 'bg-blue-500', icon: '🚪' },
  screen: { color: 'bg-purple-600', icon: '📺' }
};

const TheaterSeatBooking = () => {
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [requestedSeats, setRequestedSeats] = useState(2);
  const [showData, setShowData] = useState({});
  const [seatAvailability, setSeatAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [maxRow, setMaxRow] = useState(0);
  const [maxCol, setMaxCol] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [showBookingError, setShowBookingError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableSeatCount, setAvailableSeatCount] = useState(0);
  
  // Read showId from the URL
  const { showId: showIdParam } = useParams();
  const showId = Number(showIdParam);
  const [, setScreenId] = useState(null);
  const [showInfo, setShowInfo] = useState(null); // holds show, movie, theatre details

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // 1) Fetch show details to get screenId, price, metadata
        if (!showId || Number.isNaN(showId)) {
          throw new Error('Invalid show id');
        }

        const showResponse = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show/${showId}`);
        if (!showResponse.ok) {
          throw new Error('Failed to fetch show details');
        }
        const showJson = await showResponse.json();
        if (showJson.status !== 'success') {
          throw new Error('Show details fetch failed');
        }
        const show = showJson.data;
        setShowInfo(show);
        setScreenId(show.screen_id);

        // 2) Fetch screen layout
        const screenResponse = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/screen/${show.screen_id}`, {
          credentials: 'include'
        });
        if (!screenResponse.ok) {
          throw new Error('Failed to fetch screen layout');
        }
        const screenData = await screenResponse.json();
        if (screenData.status === "success") {
          // merge price/meta from show
          setShowData({ ...screenData.data, price: show.price, showTime: new Date(show.show_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), date: new Date(show.show_datetime).toLocaleDateString('en-IN'), theater: show.theatre_name, screen: show.screen_name, title: show.movie_title });
        } else {
          throw new Error('Screen data fetch failed');
        }

        // 3) Fetch seat availability
        const seatsResponse = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/${showId}`, {
          credentials: 'include'
        });
        
        if (!seatsResponse.ok) {
          throw new Error('Failed to fetch seat availability');
        }
        
        const seatsData = await seatsResponse.json();
        
        if (seatsData.status === "success") {
          // Convert array to object for easier lookup
          const seatMap = {};
          let availCount = 0;
          seatsData.data.forEach(seat => {
            seatMap[seat.seat_label] = seat.status;
            if (seat.status === 'available') availCount += 1;
          });
          setSeatAvailability(seatMap);
          setAvailableSeatCount(availCount);
        } else {
          throw new Error('Seat availability fetch failed');
        }
        
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showId]);

  // Calculate grid dimensions
  useEffect(() => {
    if (showData.layout && showData.layout.length > 0) {
      const maxR = Math.max(...showData.layout.map(cell => cell.row));
      const maxC = Math.max(...showData.layout.map(cell => cell.col));
      setMaxRow(maxR);
      setMaxCol(maxC);
    }
  }, [showData.layout]);

  // Clamp requested seats to available seats (and 10 max)
  useEffect(() => {
    const cap = Math.min(10, Math.max(0, availableSeatCount));
    setRequestedSeats(prev => {
      // If sold out, set to 0; else clamp to cap
      if (cap === 0) return 0;
      return Math.min(prev || 1, cap);
    });
  }, [availableSeatCount]);

  // Refresh seat availability
  const refreshSeats = async () => {
    setIsRefreshing(true);
    try {
      const seatsResponse = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/${showId}`, {
        credentials: 'include'
      });
      
      if (seatsResponse.ok) {
        const seatsData = await seatsResponse.json();
        if (seatsData.status === "success") {
          const seatMap = {};
          let availCount = 0;
          seatsData.data.forEach(seat => {
            seatMap[seat.seat_label] = seat.status;
            if (seat.status === 'available') availCount += 1;
          });
          setSeatAvailability(seatMap);
          setAvailableSeatCount(availCount);
          
          // Check if any selected seats are no longer available
          const unavailableSeats = selectedSeats.filter(seatId => {
            const [row, col] = seatId.split('-').map(Number);
            const seat = showData.layout.find(s => s.row === row && s.col === col);
            if (seat && seatMap[seat.label] && seatMap[seat.label] !== 'available') {
              return true;
            }
            return false;
          });
          
          if (unavailableSeats.length > 0) {
            // Remove unavailable seats from selection
            setSelectedSeats(selectedSeats.filter(seatId => !unavailableSeats.includes(seatId)));
            setBookingError('Some of your selected seats are no longer available. Please select new seats.');
            setShowBookingError(true);
            closeTermsModal();
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing seats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle seat selection
  const handleSeatClick = (seat) => {
    const seatStatus = getSeatActualStatus(seat);
    if (seatStatus === 'booked' || seatStatus === 'blocked' || seatStatus === 'hold') return;

    const seatId = `${seat.row}-${seat.col}`;
    const isSelected = selectedSeats.includes(seatId);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      if (selectedSeats.length < requestedSeats) {
        setSelectedSeats([...selectedSeats, seatId]);
      }
    }
  };

  // Get actual seat status from API data
  const getSeatActualStatus = (seat) => {
    if (!seat.label) return 'available';
    
    const apiStatus = seatAvailability[seat.label];
    if (apiStatus) {
      return apiStatus;
    }
    
    return seat.status || 'available';
  };

  // Get seat status including selection
  const getSeatStatus = (seat) => {
    const seatId = `${seat.row}-${seat.col}`;
    if (selectedSeats.includes(seatId)) return 'selected';
    return getSeatActualStatus(seat);
  };

  // Auto-select best available seats
  const autoSelectSeats = () => {
    const availableSeats = showData.layout
      .filter(cell => {
        if (cell.type !== 'seat') return false;
        const actualStatus = getSeatActualStatus(cell);
        return actualStatus === 'available';
      })
      .sort((a, b) => {
        const centerCol = maxCol / 2;
        const middleRow = maxRow / 2;
        
        const aDistance = Math.abs(a.col - centerCol) + Math.abs(a.row - middleRow);
        const bDistance = Math.abs(b.col - centerCol) + Math.abs(b.row - middleRow);
        
        return aDistance - bDistance;
      });

    const bestSeats = availableSeats.slice(0, requestedSeats);
    const seatIds = bestSeats.map(seat => `${seat.row}-${seat.col}`);
    setSelectedSeats(seatIds);
  };

  // Clear selection
  // const clearSelection = () => {
  //   setSelectedSeats([]);
  // };

  // Get cell display
  const getCellDisplay = (row, col) => {
    const cell = showData.layout.find(c => c.row === row && c.col === col);
    
    if (!cell) {
      return {
        className: 'bg-gray-50',
        content: '',
        clickable: false
      };
    }

    if (cell.type === 'seat') {
      const status = getSeatStatus(cell);
      const statusConfig = SEAT_STATUS[status];
      
      return {
        className: `${statusConfig.color} text-white border-2 border-gray-300 transition-all duration-200 hover:scale-105 ${
          status === 'booked' || status === 'blocked' || status === 'hold' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-lg'
        } ${status === 'selected' ? 'border-orange-300 shadow-lg' : ''}`,
        content: cell.label,
        clickable: status !== 'booked' && status !== 'blocked' && status !== 'hold',
        cell: cell
      };
    }

    const typeConfig = CELL_TYPES[cell.type];
    let className = `${typeConfig.color}`;
    
    if (cell.type === 'screen') {
      className += ' text-white font-bold text-xs';
    }

    return {
      className: className,
      content: cell.type === 'screen' ? 'SCREEN' : 
               cell.type === 'seat' ? cell.label : typeConfig.icon,
      clickable: false
    };
  };

  // Calculate total price
  const totalPrice = selectedSeats.length * (showData.price || 0);
  const ticketOptions = availableSeatCount > 0
    ? Array.from({ length: Math.min(10, availableSeatCount) }, (_, i) => i + 1)
    : [];

  // Handle booking confirmation now happens via payment session -> PaymentPage

  // Show terms modal
  const showTermsAndConditions = () => {
    setShowTermsModal(true);
  };

  // Close terms modal
  const closeTermsModal = () => {
    setShowTermsModal(false);
  };

  // Accept terms and proceed
  const acceptTermsAndProceed = async () => {
    // Instead of holding here, create a payment session and redirect to dummy payment page
    const seatLabels = selectedSeats.map(seatId => {
      const [row, col] = seatId.split('-').map(Number);
      const seat = showData.layout.find(s => s.row === row && s.col === col);
      return seat ? seat.label : seatId;
    });

  try {
      setIsBooking(true);
      // 1) Hold seats for 5 minutes
      const holdRes = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ show_id: showId, seats: seatLabels })
      });
      const holdData = await holdRes.json().catch(() => ({}));
      if (holdRes.status === 401) {
        throw new Error('Please sign in to continue with booking.');
      }
      if (!holdRes.ok) {
        const msg = holdData?.message || (Array.isArray(holdData?.errors) ? holdData.errors.join(', ') : '') || 'Failed to hold seats';
        throw new Error(msg);
      }

      // 2) Create payment session
      const res = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/payments/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ show_id: showId, seats: seatLabels, amount: totalPrice })
      });
      const data = await res.json();
      if (!res.ok) {
        // Release holds immediately if payment session creation failed
        try {
          await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/show-seats/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ show_id: showId, seats: seatLabels })
          });
  } catch { /* best-effort */ }
        throw new Error(data.message || 'Failed to create payment session');
      }
      setShowTermsModal(false);
      // Optionally clear selection after moving to payment page
      setSelectedSeats([]);
      navigate(`/pay/${data.session_id}`);
    } catch (e) {
  // Close the review modal and show error clearly
  setShowTermsModal(false);
  setBookingError(e.message || 'Something went wrong while starting payment.');
  setShowBookingError(true);
  } finally {
      setIsBooking(false);
    }
  };

  // Close booking error modal
  const closeBookingError = () => {
    setShowBookingError(false);
    setBookingError('');
  };

  const selectedSeatLabels = selectedSeats.map(seatId => {
    const [row, col] = seatId.split('-').map(Number);
    const seat = showData.layout.find(s => s.row === row && s.col === col);
    return seat ? seat.label : seatId;
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading theater layout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Data</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Navbar/>
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{showData.title || showInfo?.movie_title || 'Movie Title'}</h1>
              <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  {showData.theater || showInfo?.theatre_name || 'Theater'} | {showData.screen || showInfo?.screen_name || 'Screen'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {showData.date || (showInfo ? new Date(showInfo.show_datetime).toLocaleDateString('en-IN') : 'Date')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {showData.showTime || (showInfo ? new Date(showInfo.show_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Time')}
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-xl font-bold text-red-600">₹{showData.price || 0}</div>
              <div className="text-xs text-gray-500">per ticket</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Number of Tickets:</span>
                {ticketOptions.length > 0 ? (
                  <>
                    <select
                      value={requestedSeats}
                      onChange={(e) => setRequestedSeats(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      {ticketOptions.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">{availableSeatCount} available</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-red-600">Sold out</span>
                )}
              </div>
              
              <button
                onClick={autoSelectSeats}
                disabled={availableSeatCount === 0}
                className={`px-4 py-2 rounded-md transition text-sm font-medium ${availableSeatCount === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                Quick Select
              </button>
              
              <button
                onClick={refreshSeats}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition text-sm font-medium"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">
                Selected: {selectedSeats.length} of {requestedSeats}
              </div>
              {selectedSeats.length > 0 && (
                <div className="text-lg font-bold text-red-600">
                  ₹{totalPrice}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded border"></div>
              <span className="text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded border"></div>
              <span className="text-gray-700">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded border"></div>
              <span className="text-gray-700">Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded border"></div>
              <span className="text-gray-700">Not Available</span>
            </div>
          </div>
        </div>

        {/* Theater Layout */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            <div className="inline-block">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-16 py-3 rounded-t-lg text-sm font-bold shadow-lg">
                ALL EYES THIS WAY PLEASE
              </div>
              <div className="bg-purple-100 h-2 rounded-b-lg shadow-inner"></div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="flex justify-center">
              <div className="inline-flex flex-col items-center">
                {/* Column headers */}
                <div className="ml-8 grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCol}, 36px)` }}>
                  {Array.from({ length: maxCol }, (_, col) => (
                    <div key={`col-${col+1}`} className="text-[10px] text-gray-500 text-center">{col+1}</div>
                  ))}
                </div>

                {/* Seat grid with row labels */}
                <div className="flex">
                  <div className="mr-2 flex flex-col items-center">
                    {Array.from({ length: maxRow }, (_, row) => (
                      <div key={`rowlbl-${row+1}`} className="h-9 flex items-center text-[10px] text-gray-500 font-medium">{row+1}</div>
                    ))}
                  </div>

                  <div 
                    className="grid gap-1" 
                    style={{ gridTemplateColumns: `repeat(${maxCol}, 36px)` }}
                  >
                    {Array.from({ length: maxRow }, (_, row) =>
                      Array.from({ length: maxCol }, (_, col) => {
                        const actualRow = row + 1;
                        const actualCol = col + 1;
                        const cellDisplay = getCellDisplay(actualRow, actualCol);
                        
                        return (
                          <div
                            key={`${actualRow}-${actualCol}`}
                            className={`
                              w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-semibold
                              transition-all duration-200 select-none
                              ${cellDisplay.className}
                            `}
                            onClick={() => cellDisplay.clickable && handleSeatClick(cellDisplay.cell)}
                            title={cellDisplay.cell ? `${cellDisplay.cell.label}` : ''}
                          >
                            {cellDisplay.content}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        {selectedSeats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Selected Seats</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSeatLabels.map((label, index) => (
                    <span key={index} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-1">₹{totalPrice}</div>
                <div className="text-sm text-gray-500 mb-4">{selectedSeats.length} Tickets</div>
                <button
                  onClick={showTermsAndConditions}
                  disabled={selectedSeats.length !== requestedSeats || requestedSeats === 0}
                  className={`
                    w-full md:w-auto px-8 py-3 rounded-lg font-bold transition-all
                    ${selectedSeats.length === requestedSeats && requestedSeats > 0 
                      ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer shadow-lg hover:shadow-xl' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  PROCEED TO PAY
                </button>
                {requestedSeats === 0 ? (
                  <div className="mt-2 text-xs text-red-600">No seats available for this show.</div>
                ) : selectedSeats.length !== requestedSeats && (
                  <div className="mt-2 text-xs text-orange-600">
                    Please select {requestedSeats - selectedSeats.length} more seat{requestedSeats - selectedSeats.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Error Modal */}
      {showBookingError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Failed</h3>
              <p className="text-sm text-gray-600 mb-6">{bookingError}</p>
              <div className="flex gap-3">
                <button
                  onClick={closeBookingError}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeBookingError();
                    refreshSeats();
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                >
                  Refresh Seats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirm Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Review your booking</h2>
              <button
                onClick={closeTermsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {/* Show details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-1">Movie</div>
                  <div className="text-sm font-semibold text-gray-900">{showData.title || showInfo?.movie_title}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-1">Theatre</div>
                  <div className="text-sm font-semibold text-gray-900">{showData.theater || showInfo?.theatre_name} • {showData.screen || showInfo?.screen_name}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-1">Show time</div>
                  <div className="text-sm font-semibold text-gray-900">{showData.date} • {showData.showTime}</div>
                </div>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-1">Tickets</div>
                  <div className="text-sm font-semibold text-gray-900">{selectedSeats.length} ticket(s)</div>
                </div>
              </div>

              {/* Selected seats */}
              <div className="mb-6">
                <div className="text-xs text-gray-500 mb-2">Selected seats</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSeatLabels.map((label, index) => (
                    <span key={index} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="border rounded-lg divide-y">
                <div className="flex items-center justify-between p-4">
                  <div className="text-sm text-gray-700">Ticket price ({selectedSeats.length} × ₹{showData.price || 0})</div>
                  <div className="text-sm font-semibold text-gray-900">₹{totalPrice}</div>
                </div>
                {/* Add fees/taxes here if needed */}
                <div className="flex items-center justify-between p-4 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">Total payable</div>
                  <div className="text-lg font-bold text-gray-900">₹{totalPrice}</div>
                </div>
                <div className="p-4 text-xs text-gray-500">
                  Seats will be held for 5 minutes after confirmation. Complete payment within the hold period.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
              <button
                onClick={closeTermsModal}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={acceptTermsAndProceed}
                disabled={isBooking}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded font-semibold transition
                  ${isBooking 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                  }
                `}
              >
                {isBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Holding seats...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Confirm & Hold Seats
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheaterSeatBooking;