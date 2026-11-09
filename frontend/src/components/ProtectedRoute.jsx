import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps a page that needs login (handbook 9.7):
// <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
// Guests go to /login?redirect=<path>, so the login page can send them back.
// reason="checkout" adds &reason=checkout, so the login page can say why (handbook 7.3).
export default function ProtectedRoute({ children, reason }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();

  // Wait for the saved token check, so a logged-in user is not sent to login on reload.
  if (loading) return null;

  if (!user) {
    const redirect = encodeURIComponent(`${pathname}${search}`);
    const why = reason ? `&reason=${reason}` : '';
    return <Navigate to={`/login?redirect=${redirect}${why}`} replace />;
  }

  return children;
}
