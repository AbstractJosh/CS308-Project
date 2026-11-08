// One labelled form field with its error message (handbook 9.6 "Forms"). Owner: Sezin.
// Used by the login and register pages, later by checkout.
// <FormField id="email" label="Email" error={errors.email} type="email" value=... onChange=... />
// as="textarea" renders a textarea instead of an input. hint is a small line under the field.
export default function FormField({ id, label, error, hint, as = 'input', ...inputProps }) {
  const Control = as;
  // The hint makes room for the error when there is one.
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <Control
        id={id}
        name={id}
        className={`input${error ? ' input-error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hintId && (
        <span id={hintId} className="muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
