import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { loginSuccess } from '../redux/slices/userSlice';

// Usage: <RequireAuth roles={["Admin"]}><AdminPage/></RequireAuth>
// If roles is omitted, any authenticated user is allowed
const RequireAuth = ({ roles, children }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.user);
  const [booting, setBooting] = useState(false);

  // Hydrate user from token if present but store not ready
  useEffect(() => {
    const hydrate = async () => {
      if (isAuthenticated) return;
      const stored = localStorage.getItem('token');
      if (!stored) return;
      try {
        setBooting(true);
        const URL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/auth/me`;
        const headers = { Authorization: `Bearer ${stored}` };
        const res = await axios.get(URL, { withCredentials: true, headers });
        if (res.data?.data?.user) {
          dispatch(loginSuccess({ user: res.data.data.user, token: stored }));
        }
      } catch {
        // ignore hydration failure; user will be redirected to signin
      }
      finally { setBooting(false); }
    };
    if (!isAuthenticated) hydrate();
  }, [isAuthenticated, dispatch]);

  const hasAuth = isAuthenticated || !!localStorage.getItem('token');
  if (!hasAuth && !booting) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const role = user?.role;
    if (!role) {
      // Still booting/hydrating
      return (
        <div className="min-h-[30vh] flex items-center justify-center text-gray-500 text-sm">Checking permissions…</div>
      );
    }
    if (!roles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default RequireAuth;
