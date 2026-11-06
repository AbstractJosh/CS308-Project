import { Link } from 'react-router-dom';

// Placeholder from the starter project. Owner: Sidar replaces this file.
export default function NotFoundPage() {
  return (
    <section className="container section empty-state">
      <p className="eyebrow">404</p>
      <h3>Page not found</h3>
      <p className="muted">The page you are looking for does not exist.</p>
      <Link to="/shop" className="btn btn-secondary">
        Back to shop
      </Link>
    </section>
  );
}
