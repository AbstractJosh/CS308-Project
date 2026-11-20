import { useEffect, useRef, useState } from 'react';
import FormField from '../../components/FormField.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatPrice } from '../../utils/format.js';
import { EMPTY_PRODUCT_FORM, toProductBody, toProductForm, validateProductForm } from './productForm.js';
import { fakeAdminProductsApi as productsAdminApi } from './ProductsPage.fakeData.js';
import './ProductsPage.css';

function countText(count) {
  return `${count} ${count === 1 ? 'PRODUCT' : 'PRODUCTS'}`;
}

function sortById(products) {
  return [...products].sort((a, b) => a.id - b.id);
}

function ProductFormPanel({ title, form, errors, formError, saving, categories, onChange, onSubmit, onCancel }) {
  const formRef = useRef(null);

  useEffect(() => {
    formRef.current.scrollIntoView?.({ block: 'start' });
    formRef.current.querySelector('input')?.focus({ preventScroll: true });
  }, []);

  function fieldProps(field) {
    return {
      value: form[field],
      error: errors[field],
      onChange: (event) => onChange(field, event.target.value),
    };
  }

  return (
    <form ref={formRef} className="admin-products-panel" aria-label={title} noValidate onSubmit={onSubmit}>
      <h3 className="admin-products-panel-title">{title}</h3>

      <div className="admin-products-grid">
        <FormField id="product-name" label="Name" {...fieldProps('name')} />
        <FormField id="product-model" label="Model" {...fieldProps('model')} />
        <FormField id="product-serial" label="Serial number" {...fieldProps('serialNumber')} />
        <FormField id="product-category" label="Category" as="select" {...fieldProps('categoryId')}>
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </FormField>
        <FormField id="product-price" label="Price (TRY)" inputMode="decimal" {...fieldProps('price')} />
        <FormField
          id="product-cost"
          label="Cost (TRY)"
          inputMode="decimal"
          hint="Leave empty to use 50% of the price"
          {...fieldProps('cost')}
        />
        <FormField id="product-stock" label="Stock" inputMode="numeric" {...fieldProps('quantityInStock')} />
        <FormField id="product-warranty" label="Warranty" {...fieldProps('warrantyStatus')} />
        <FormField id="product-distributor" label="Distributor" {...fieldProps('distributor')} />
        <div className="admin-products-wide">
          <FormField
            id="product-description"
            label="Description"
            as="textarea"
            rows={3}
            {...fieldProps('description')}
          />
        </div>
      </div>

      {formError && (
        <p className="field-error admin-products-alert" role="alert">
          {formError}
        </p>
      )}

      <div className="admin-products-panel-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save product'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProductRow({ product, confirming, removing, onEdit, onAskRemove, onCancelRemove, onConfirmRemove }) {
  return (
    <tr>
      <td>
        {product.name}
        <span className="admin-products-sub">{product.model}</span>
      </td>
      <td className="admin-products-mono">{product.serialNumber}</td>
      <td>{product.category?.name}</td>
      <td>{formatPrice(product.price)}</td>
      <td>
        {product.quantityInStock === 0 ? (
          <span className="admin-products-sold-out">Sold out</span>
        ) : (
          product.quantityInStock
        )}
      </td>
      <td>
        {confirming ? (
          <div className="admin-products-actions">
            <span className="admin-products-confirm">Remove this product?</span>
            <button
              type="button"
              className="btn btn-secondary admin-products-small"
              disabled={removing}
              onClick={onConfirmRemove}
            >
              Yes, remove
            </button>
            <button type="button" className="btn btn-secondary admin-products-small" onClick={onCancelRemove}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="admin-products-actions">
            <button
              type="button"
              className="btn btn-secondary admin-products-small"
              aria-label={`Edit ${product.name}`}
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-secondary admin-products-small"
              aria-label={`Remove ${product.name}`}
              onClick={onAskRemove}
            >
              Remove
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ProductsPage() {
  const { notify } = useToast();
  const [state, setState] = useState({ status: 'loading', products: [], error: '' });
  const [categories, setCategories] = useState([]);
  const [reloadCount, setReloadCount] = useState(0);

  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmId, setConfirmId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    Promise.all([productsAdminApi.list(), productsAdminApi.categories()])
      .then(([productData, categoryData]) => {
        if (!active) return;
        setState({ status: 'ready', products: productData.products ?? [], error: '' });
        setCategories(categoryData.categories ?? []);
      })
      .catch((err) => active && setState({ status: 'error', products: [], error: err.message }));
    return () => {
      active = false;
    };
  }, [reloadCount]);

  function openAdd() {
    setPanel({ title: 'Add product', productId: null });
    setForm(EMPTY_PRODUCT_FORM);
    setErrors({});
    setFormError('');
  }

  function openEdit(product) {
    setPanel({ title: 'Edit product', productId: product.id });
    setForm(toProductForm(product));
    setErrors({});
    setFormError('');
  }

  function closePanel() {
    setPanel(null);
    setForm(EMPTY_PRODUCT_FORM);
    setErrors({});
    setFormError('');
  }

  function changeField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateProductForm(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      if (panel.productId) {
        const { product } = await productsAdminApi.update(panel.productId, toProductBody(form));
        setState((current) => ({
          ...current,
          products: current.products.map((item) => (item.id === product.id ? product : item)),
        }));
        notify('Product updated');
      } else {
        const { product } = await productsAdminApi.create(toProductBody(form));
        setState((current) => ({ ...current, products: sortById([...current.products, product]) }));
        notify('Product added');
      }
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function askRemove(id) {
    setConfirmId(id);
    setRemoveError('');
  }

  async function confirmRemove(product) {
    setRemoving(true);
    setRemoveError('');
    try {
      await productsAdminApi.remove(product.id);
      setState((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
      setConfirmId(null);
      if (panel && panel.productId === product.id) closePanel();
      notify(`"${product.name}" removed`);
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  const ready = state.status === 'ready';
  const hasProducts = ready && state.products.length > 0;

  return (
    <div className="admin-products-page">
      <div className="admin-products-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>
            Manage <em>products</em>
          </h2>
        </div>
        {hasProducts && (
          <div className="admin-products-header-side">
            <span className="admin-products-count">{countText(state.products.length)}</span>
            <button type="button" className="btn btn-primary" disabled={panel !== null} onClick={openAdd}>
              Add product
            </button>
          </div>
        )}
      </div>

      {panel && (
        <ProductFormPanel
          key={panel.productId ?? 'new'}
          title={panel.title}
          form={form}
          errors={errors}
          formError={formError}
          saving={saving}
          categories={categories}
          onChange={changeField}
          onSubmit={handleSubmit}
          onCancel={closePanel}
        />
      )}

      {state.status === 'loading' && <p className="muted">Loading products…</p>}

      {state.status === 'error' && (
        <div className="empty-state admin-products-message">
          <h3>Could not load the products</h3>
          <p className="muted">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setReloadCount((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {ready && state.products.length === 0 && (
        <div className="empty-state admin-products-message">
          <h3>No products yet</h3>
          <p className="muted">Add the first product and it shows up here.</p>
          <button type="button" className="btn btn-secondary" disabled={panel !== null} onClick={openAdd}>
            Add product
          </button>
        </div>
      )}

      {hasProducts && (
        <>
          {removeError && (
            <p className="field-error admin-products-alert" role="alert">
              {removeError}
            </p>
          )}
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Serial</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    confirming={confirmId === product.id}
                    removing={removing}
                    onEdit={() => openEdit(product)}
                    onAskRemove={() => askRemove(product.id)}
                    onCancelRemove={() => setConfirmId(null)}
                    onConfirmRemove={() => confirmRemove(product)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
