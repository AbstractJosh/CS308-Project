import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { StoreProvider } from './store.jsx';
import * as C from './pages/customer.jsx';
import * as S from './pages/staff.jsx';

const ROUTES = {
  login: C.Login,
  shop: C.Shop,
  product: C.Product,
  cart: C.Cart,
  checkout: C.Checkout,
  invoice: C.Invoice,
  orders: C.Orders,
  account: C.Account,
  'staff/products': S.Products,
  'staff/deliveries': S.Deliveries,
  'staff/comments': S.Comments,
  'staff/pricing': S.Pricing,
  'staff/reports': S.Reports,
  'staff/refunds': S.Refunds,
  'staff/support': S.Support,
};

// Hash routes: #/shop, #/product/P-1005, #/login?next=checkout
function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash);
      scrollTo(0, 0);
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [first, param] = path.split('/');
  const Page = ROUTES[path] || ROUTES[first] || C.Login;
  return <Page key={path} param={param} query={new URLSearchParams(query)} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);
