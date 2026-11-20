import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrderStatusPill from '../components/OrderStatusPill.jsx';
import { formatPrice } from '../utils/format.js';
import { formatOrderDate } from '../utils/orderDates.js';
import { ordersApi } from '../api/endpoints.js';
import './OrderDetailPage.css';

function BackLink() {
  return (
    <Link to="/orders" className="order-back text-link">
      <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
      All orders
    </Link>
  );
}

function PageMessage({ title, text, children }) {
  return (
    <div className="section empty-state">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {children}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [requestedId, setRequestedId] = useState(id);

  if (id !== requestedId) {
    setRequestedId(id);
    setStatus('loading');
  }

  useEffect(() => {
    let stale = false;
    setStatus('loading');
    ordersApi
      .get(id)
      .then((data) => {
        if (stale) return;
        setOrder(data.order);
        setStatus('ready');
      })
      .catch((err) => {
        if (stale) return;
        setError(err.message);
        setStatus(err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      stale = true;
    };
  }, [id, attempt]);

  if (status !== 'ready') {
    return (
      <section className="section">
        <div className="container">
          <BackLink />
          {status === 'loading' && <PageMessage title="Loading order" text="This only takes a moment." />}
          {status === 'missing' && (
            <PageMessage title="Order not found" text="This order does not exist or belongs to another account.">
              <Link to="/orders" className="btn btn-secondary">
                Back to orders
              </Link>
            </PageMessage>
          )}
          {status === 'error' && (
            <PageMessage title="Something went wrong" text={error}>
              <button type="button" className="btn btn-secondary" onClick={() => setAttempt((count) => count + 1)}>
                Try again
              </button>
            </PageMessage>
          )}
        </div>
      </section>
    );
  }

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="section">
      <div className="container">
        <BackLink />
        <div className="order-detail-head">
          <div>
            <p className="eyebrow">Placed on {formatOrderDate(order.createdAt)}</p>
            <h1>
              Order <em>#{order.id}</em>
            </h1>
          </div>
          <OrderStatusPill status={order.status} />
        </div>

        <div className="order-detail-layout">
          <div className="order-items">
            <h2 className="order-section-title">Items</h2>
            <ul className="order-item-list">
              {order.items.map((item) => (
                <li key={item.id} className="order-item">
                  <div className="order-item-info">
                    <Link to={`/products/${item.productId}`} className="order-item-name">
                      {item.name}
                    </Link>
                    <p className="order-item-model">{item.model}</p>
                  </div>
                  <p className="order-item-qty">
                    {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                  <p className="order-item-total">{formatPrice(item.quantity * item.unitPrice)}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="order-summary">
            <h2 className="order-section-title">Summary</h2>
            <dl className="order-summary-list">
              <div>
                <dt>Items</dt>
                <dd>{units}</dd>
              </div>
              <div className="order-summary-total">
                <dt>Total paid</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
              <div>
                <dt>Card</dt>
                <dd>Ending in {order.cardLast4}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
              {order.deliveredAt && (
                <div>
                  <dt>Delivered on</dt>
                  <dd>{formatOrderDate(order.deliveredAt)}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
