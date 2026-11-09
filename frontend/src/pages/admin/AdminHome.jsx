import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ADMIN_MENU } from './adminMenu.js';

// /admin on its own opens the first page of the user's role. Owner: Neslihan (SCRUM-56).
export default function AdminHome() {
  const { user } = useAuth();
  return <Navigate to={`/admin/${ADMIN_MENU[user.role][0].path}`} replace />;
}
