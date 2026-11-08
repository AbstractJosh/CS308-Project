import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Small pop-up messages at the bottom of the screen.
// Usage: const { notify } = useToast(); notify('Added to cart'); notify('Out of stock', 'error');
const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const notify = useCallback((message, tone = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
