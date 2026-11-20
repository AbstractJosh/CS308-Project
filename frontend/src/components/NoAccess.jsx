import { Link } from 'react-router-dom';

// Shown when a logged-in user opens a page their role may not use (req 17). Owner: Neslihan (SCRUM-56).
export default function NoAccess() {
  return (
    <section className="container section empty-state">
      <p className="eyebrow">403</p>
      <h3>No access</h3>
      <p className="muted">Your account does not have permission to open this page.</p>
      <Link to="/shop" className="btn btn-secondary">
        Back to shop
      </Link>
    </section>
  );
}
