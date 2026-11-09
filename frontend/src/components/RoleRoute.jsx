import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import NoAccess from './NoAccess.jsx';

// The role version of ProtectedRoute (handbook 9.7). Owner: Neslihan (SCRUM-56).
// <Route path="/admin" element={<RoleRoute roles={ADMIN_ROLES}><AdminLayout /></RoleRoute>}>
// Guests go to login like in ProtectedRoute; logged-in users with another role see "No access".
// This only hides pages. The backend still checks the role on every /admin API call (requireRole).
export default function RoleRoute({ roles, children }) {
  return (
    <ProtectedRoute>
      <RoleCheck roles={roles}>{children}</RoleCheck>
    </ProtectedRoute>
  );
}

function RoleCheck({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <NoAccess />;
}
