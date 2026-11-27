import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { stockLabel } from '../../utils/format.js';
import { fakeAdminProductsApi as productsAdminApi } from './ProductsPage.fakeData.js';
import './StockPage.css';

const STOCK_ERROR = 'Stock must be a whole number, 0 or more';

function countText(count) {
  return `${count} ${count === 1 ? 'PRODUCT' : 'PRODUCTS'}`;
}

function startValues(products) {
  const values = {};
  for (const product of products) values[product.id] = String(product.quantityInStock);
  return values;
}

function StockRow({ product, value, error, saving, onChange, onSave }) {
  const label = stockLabel(product.quantityInStock);
  const unchanged = value.trim() === String(product.quantityInStock);
  const errorId = `stock-error-${product.id}`;

  return (
    <tr>
      <td>
        {product.name}
        <span className="admin-stock-sub">{product.model}</span>
      </td>
      <td className="admin-stock-mono">{product.serialNumber}</td>
      <td>
        <span className={`admin-stock-label admin-stock-${label.tone}`}>{label.text}</span>
      </td>
      <td>
        <input
          className={`input admin-stock-input${error ? ' input-error' : ''}`}
          inputMode="numeric"
          aria-label={`New stock for ${product.name}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {error && (
          <span id={errorId} className="field-error admin-stock-error" role="alert">
            {error}
          </span>
        )}
      </td>
      <td>
        <div className="admin-stock-actions">
          <button
            type="button"
            className="btn btn-secondary admin-stock-small"
            aria-label={`Save stock for ${product.name}`}
            disabled={unchanged || saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function StockPage() {
  const { notify } = useToast();
  const [state, setState] = useState({ status: 'loading', products: [], error: '' });
  const [reloadCount, setReloadCount] = useState(0);
  const [values, setValues] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [savingIds, setSavingIds] = useState({});

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    productsAdminApi
      .list()
      .then((data) => {
        if (!active) return;
        const products = data.products ?? [];
        setState({ status: 'ready', products, error: '' });
        setValues(startValues(products));
        setRowErrors({});
      })
      .catch((err) => active && setState({ status: 'error', products: [], error: err.message }));
    return () => {
      active = false;
    };
  }, [reloadCount]);

  function changeValue(id, value) {
    setValues((current) => ({ ...current, [id]: value }));
    setRowErrors((current) => ({ ...current, [id]: undefined }));
  }

  async function saveStock(product) {
    const value = (values[product.id] ?? '').trim();
    if (!/^\d+$/.test(value)) {
      setRowErrors((current) => ({ ...current, [product.id]: STOCK_ERROR }));
      return;
    }

    setSavingIds((current) => ({ ...current, [product.id]: true }));
    setRowErrors((current) => ({ ...current, [product.id]: undefined }));
    try {
      const { product: saved } = await productsAdminApi.setStock(product.id, Number(value));
      setState((current) => ({
        ...current,
        products: current.products.map((item) => (item.id === saved.id ? saved : item)),
      }));
      setValues((current) => ({ ...current, [saved.id]: String(saved.quantityInStock) }));
      notify(`Stock updated: ${saved.name}`);
    } catch (err) {
      setRowErrors((current) => ({ ...current, [product.id]: err.message }));
    } finally {
      setSavingIds((current) => ({ ...current, [product.id]: false }));
    }
  }

  const ready = state.status === 'ready';

  return (
    <div className="admin-stock-page">
      <div className="admin-stock-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>
            Stock <em>levels</em>
          </h2>
        </div>
        {ready && <span className="admin-stock-count">{countText(state.products.length)}</span>}
      </div>

      {state.status === 'loading' && <p className="muted">Loading stock…</p>}

      {state.status === 'error' && (
        <div className="empty-state admin-stock-message">
          <h3>Could not load the stock</h3>
          <p className="muted">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {ready && state.products.length === 0 && (
        <div className="empty-state admin-stock-message">
          <h3>No products yet</h3>
          <p className="muted">Products show up here once they are added.</p>
        </div>
      )}

      {ready && state.products.length > 0 && (
        <div className="admin-stock-table-wrap">
          <table className="admin-stock-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Serial</th>
                <th scope="col">In stock</th>
                <th scope="col">New quantity</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {state.products.map((product) => (
                <StockRow
                  key={product.id}
                  product={product}
                  value={values[product.id] ?? ''}
                  error={rowErrors[product.id]}
                  saving={Boolean(savingIds[product.id])}
                  onChange={(value) => changeValue(product.id, value)}
                  onSave={() => saveStock(product)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
