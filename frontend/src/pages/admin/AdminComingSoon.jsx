import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { menuItem } from './adminMenu.js';

// Placeholder for admin pages that are not built yet. Owner: Neslihan (SCRUM-56).
// When an owner adds the real <Route> for their page, this one stops showing for it.
export default function AdminComingSoon() {
  const { user } = useAuth();
  const { '*': rest = '' } = useParams();
  const item = menuItem(user.role, rest.split('/')[0]);

  return (
    <div className="empty-state admin-coming-soon">
      <p className="eyebrow">{item.label}</p>
      <h3>Coming soon</h3>
      <p className="muted">This page is built in Sprint {item.sprint}.</p>
    </div>
  );
}
