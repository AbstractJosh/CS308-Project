import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <Link to="/" className="site-footer-logo">
          <span className="site-footer-name">CREMA &amp; CO.</span>
          <span className="site-footer-tagline">COFFEE · MACHINES · CARE</span>
        </Link>
        <p className="muted site-footer-note">CS308 Software Engineering · Team 10 · Sabancı University</p>
      </div>
    </footer>
  );
}
