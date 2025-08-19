// src/App.jsx
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import SignupPage from './pages/auth/SignupPage';
import SigninPage from './pages/auth/SigninPage';
import VerifyOtp from './pages/auth/VerifyOtp';
import TheaterSeatBooking from './pages/TheaterSeatBooking';
import PaymentPage from './pages/PaymentPage';
import ShowsDashboard from './pages/ShowDashboard';
import LandingPage from './pages/LandingPage';
import MovieBookingPage from './pages/ShowShow';
import NotFound from './components/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import { useSelector } from 'react-redux';
import TicketPage from './pages/TicketPage';

// Route gate for /profile: admins are redirected to /dashboard
const ProfileRoute = () => {
  const { user } = useSelector((s) => s.user);
  if (user?.role === 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <ProfilePage />;
};

function App() {
  return (
    <Router>
  <div className='min-h-screen w-full overflow-x-hidden p-0 m-0 text-black'>
        <Toaster position="top-right" reverseOrder={false} />
        {/* <Navbar /> */}

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path='/:id/shows' element={<MovieBookingPage />} />
          <Route path='/dashboard' element={
            <RequireAuth roles={["Admin"]}>
              <ShowsDashboard/>
            </RequireAuth>
          } />
          <Route path='/bookticket/:showId' element={
            <RequireAuth>
              <TheaterSeatBooking />
            </RequireAuth>
          } />
          <Route path='/pay/:sessionId' element={
            <RequireAuth>
              <PaymentPage />
            </RequireAuth>
          } />
          <Route path='/ticket/:bookingId' element={
            <RequireAuth>
              <TicketPage />
            </RequireAuth>
          } />
          <Route path='/profile' element={
            <RequireAuth>
              <ProfileRoute />
            </RequireAuth>
          } />
          <Route path='*' element={ <NotFound/> }/>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
