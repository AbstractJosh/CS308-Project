import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import NoAccess from '../../components/NoAccess.jsx';
import NotFoundPage from '../NotFoundPage.jsx';
import { ADMIN_MENU, ROLE_LABELS, isAdminPage, menuItem } from './adminMenu.js';
import './AdminLayout.css';

// Frame of every /admin page: left sub-menu with the pages of the user's role, the page on the
// right (handbook 9.6). Owner: Neslihan (SCRUM-56). RoleRoute already let only managers in.
export default function AdminLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const section = pathname.split('/')[2] || '';
  const items = ADMIN_MENU[user.role] || [];

  // A manager opening the other manager's page (a product manager on /admin/pricing).
  let page = <Outlet />;
  if (section && !menuItem(user.role, section)) {
    page = isAdminPage(section) ? <NoAccess /> : <NotFoundPage />;
  }

  return (
    <section className="container section admin-layout">
      <aside className="admin-menu" aria-label="Admin pages">
        <p className="eyebrow">{ROLE_LABELS[user.role]}</p>
        <nav>
          {items.map((item) => (
            <NavLink key={item.path} to={`/admin/${item.path}`} className="admin-menu-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{page}</div>
    </section>
  );
}
