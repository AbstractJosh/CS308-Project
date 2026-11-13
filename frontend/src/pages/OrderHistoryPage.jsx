import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import OrderStatusPill from '../components/OrderStatusPill.jsx';
import { formatPrice } from '../utils/format.js';
import { formatOrderDate } from '../utils/orderDates.js';
import { ordersApi } from '../api/endpoints.js';
import './OrderHistoryPage.css';

function PageMessage({ title, text, children }) {
  return (
    <div className="section empty-state">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {children}
    </div>
  );
}

function itemSummary(items) {
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const names = items.map((item) => item.name).join(', ');
  return `${units} ${units === 1 ? 'item' : 'items'} · ${names}`;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    ordersApi
      .list()
      .then((data) => {
        if (stale) return;
        setOrders(data.orders);
        setStatus('ready');
      })
      .catch((err) => {
        if (stale) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      stale = true;
    };
  }, [attempt]);

  return (
    <section className="section">
      <div className="container">
        <div className="orders-head">
          <p className="eyebrow">Your account</p>
          <h1>
            Order <em>history</em>
          </h1>
        </div>

        {status === 'loading' && <PageMessage title="Loading orders" text="This only takes a moment." />}

        {status === 'error' && (
          <PageMessage title="Something went wrong" text={error}>
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </button>
          </PageMessage>
        )}

        {status === 'ready' && orders.length === 0 && (
          <PageMessage title="No orders yet" text="Your orders will show up here after you check out.">
            <Link to="/shop" className="btn btn-secondary">
              Back to shop
            </Link>
          </PageMessage>
        )}

        {status === 'ready' && orders.length > 0 && (
          <ul className="order-list">
            {orders.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="order-row">
                  <div className="order-row-main">
                    <p className="order-row-meta">
                      Order #{order.id} · {formatOrderDate(order.createdAt)}
                    </p>
                    <h2 className="order-row-title">{itemSummary(order.items)}</h2>
                  </div>
                  <div className="order-row-side">
                    <OrderStatusPill status={order.status} />
                    <span className="order-row-total">{formatPrice(order.total)}</span>
                    <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" className="order-row-arrow" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
