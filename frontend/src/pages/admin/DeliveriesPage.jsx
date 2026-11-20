import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import OrderStatusPill from '../../components/OrderStatusPill.jsx';
import { formatPrice } from '../../utils/format.js';
import './DeliveriesPage.css';

// /admin/deliveries: the product manager's delivery list (req 12). Owner: Neslihan (SCRUM-57).
// One row per order item, with the fields of handbook 8.3. SCRUM-60: the product manager moves
// an order forward (in transit, then delivered); delivered orders mark their rows completed.
const FILTERS = [
  { label: 'To deliver', completed: false },
  { label: 'Completed', completed: true },
  { label: 'All', completed: undefined },
];

// The one button each order status gets (handbook 7.5). Delivered and cancelled orders get none.
const NEXT_ACTION = {
  PROCESSING: { status: 'IN_TRANSIT', label: 'Mark in transit' },
  IN_TRANSIT: { status: 'DELIVERED', label: 'Mark delivered' },
};

const EMPTY_TEXT = {
  false: 'Nothing to deliver right now. New orders show up here.',
  true: 'No completed deliveries yet.',
  undefined: 'No deliveries yet. They are created when a customer places an order.',
};

export default function DeliveriesPage() {
  const [filter, setFilter] = useState(FILTERS[0]);
  const [state, setState] = useState({ status: 'loading', deliveries: [], error: '' });
  const [reloadCount, setReloadCount] = useState(0);
  const [moving, setMoving] = useState(null); // order id being moved, so its buttons wait
  const [moveError, setMoveError] = useState('');

  // One order can have several rows; the button moves the whole order, then the list reloads.
  async function moveOrder(orderId, status) {
    setMoving(orderId);
    setMoveError('');
    try {
      await adminApi.updateOrderStatus(orderId, status);
      setReloadCount((n) => n + 1);
    } catch (err) {
      setMoveError(`Order #${orderId}: ${err.message}`);
    } finally {
      setMoving(null);
    }
  }

  useEffect(() => {
    let active = true; // ignore an old answer if the filter changed meanwhile
    setState((current) => ({ ...current, status: 'loading' }));
    adminApi
      .deliveries(filter.completed)
      .then((data) => active && setState({ status: 'ready', deliveries: data.deliveries ?? [], error: '' }))
      .catch((err) => active && setState({ status: 'error', deliveries: [], error: err.message }));
    return () => {
      active = false;
    };
  }, [filter, reloadCount]);

  return (
    <div className="deliveries-page">
      <p className="eyebrow">Delivery department</p>
      <h2>
        Delivery <em>list</em>
      </h2>

      <div className="deliveries-filters" role="group" aria-label="Show deliveries">
        {FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`deliveries-filter${option === filter ? ' active' : ''}`}
            aria-pressed={option === filter}
            onClick={() => setFilter(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {moveError && (
        <p className="deliveries-move-error" role="alert">
          {moveError}
        </p>
      )}

      {state.status === 'loading' && <p className="muted">Loading deliveries…</p>}

      {state.status === 'error' && (
        <div className="empty-state deliveries-message">
          <h3>Could not load the deliveries</h3>
          <p className="muted">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.deliveries.length === 0 && (
        <div className="empty-state deliveries-message">
          <h3>No deliveries</h3>
          <p className="muted">{EMPTY_TEXT[String(filter.completed)]}</p>
        </div>
      )}

      {state.status === 'ready' && state.deliveries.length > 0 && (
        <div className="deliveries-table-wrap">
          <table className="deliveries-table">
            <thead>
              <tr>
                <th scope="col">Delivery</th>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Product</th>
                <th scope="col">Qty</th>
                <th scope="col">Total</th>
                <th scope="col">Address</th>
                <th scope="col">Order status</th>
                <th scope="col">Completed</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {state.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="mono">#{delivery.id}</td>
                  <td className="mono">#{delivery.orderId}</td>
                  <td className="mono">#{delivery.customerId}</td>
                  <td>
                    {delivery.productName}
                    <span className="deliveries-sub mono">Product #{delivery.productId}</span>
                  </td>
                  <td>{delivery.quantity}</td>
                  <td>{formatPrice(delivery.totalPrice)}</td>
                  <td className="deliveries-address">{delivery.deliveryAddress}</td>
                  <td>
                    <OrderStatusPill status={delivery.orderStatus} />
                  </td>
                  <td>{delivery.completed ? 'Yes' : 'No'}</td>
                  <td>
                    {NEXT_ACTION[delivery.orderStatus] && (
                      <button
                        type="button"
                        className="btn btn-secondary deliveries-action"
                        disabled={moving === delivery.orderId}
                        aria-label={`${NEXT_ACTION[delivery.orderStatus].label}: order #${delivery.orderId}`}
                        onClick={() => moveOrder(delivery.orderId, NEXT_ACTION[delivery.orderStatus].status)}
                      >
                        {moving === delivery.orderId ? 'Saving…' : NEXT_ACTION[delivery.orderStatus].label}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
