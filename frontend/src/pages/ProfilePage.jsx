import { startTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  function handleLogout() {
    startTransition(() => {
      navigate('/', { replace: true });
      logout();
    });
    notify('You are logged out');
  }

  return (
    <section className="section">
      <div className="container profile">
        <p className="eyebrow">Your account</p>
        <h1>
          Hello, <em>{user.name.split(' ')[0]}</em>
        </h1>

        <div className="profile-layout">
          <div className="profile-card">
            <h2 className="profile-card-title">Profile</h2>
            <dl className="profile-list">
              <div>
                <dt>Name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Home address</dt>
                <dd>{user.homeAddress}</dd>
              </div>
            </dl>
          </div>

          <div className="profile-actions">
            <Link to="/orders" className="btn btn-secondary">
              <Package size={20} strokeWidth={1.5} aria-hidden="true" />
              Your orders
            </Link>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
