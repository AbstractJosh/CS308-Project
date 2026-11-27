import { Star } from 'lucide-react';
import './StarRating.css';

// Stars for ratings (handbook 7.7: a rating is 1 to 5). Owner: Sezin (SCRUM-85).
// <StarRating value={4.5} />            shows stars, e.g. an average; read by screen readers as text.
// <StarInput value={rating} onChange={setRating} />   lets a customer pick 1 to 5.

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, size = 18 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="star-rating" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {STARS.map((star) => {
        // How much of this star is filled: 1 = full, 0.5 = half, 0 = empty.
        const fill = Math.max(0, Math.min(1, rating - (star - 1)));
        return (
          <span key={star} className="star-rating-star" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} className="star-rating-empty" aria-hidden="true" />
            <span className="star-rating-fill" style={{ width: `${fill * 100}%` }}>
              <Star size={size} strokeWidth={1.5} aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

// Five radio buttons drawn as stars, so the keyboard and screen readers work as for any radio group.
export function StarInput({ value, onChange, name = 'rating', label = 'Your rating', error }) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset className="star-input" aria-describedby={errorId}>
      <legend className="field-label">{label}</legend>
      <div className="star-input-stars">
        {STARS.map((star) => (
          <label key={star} className={`star-input-star${star <= value ? ' star-input-on' : ''}`}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            />
            <Star size={28} strokeWidth={1.5} aria-hidden="true" />
          </label>
        ))}
      </div>
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </fieldset>
  );
}
