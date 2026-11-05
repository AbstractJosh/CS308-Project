import { useState } from 'react';
import { go, useStore } from '../store.jsx';
import { Dialog, Price, Qty, StatusBadge, Stock, StoreLayout } from '../ui.jsx';
import { DENIZ, STATUS, addDays, daysSince, fmt, fmt2, fmtDate, orderTotal, priceOf, todayISO, totals } from '../data.js';

const SignInFirst = ({ active, next, what }) => (
  <StoreLayout active={active}>
    <p className="notice">Please <a href={`#/login?next=${next}`}>sign in</a> to {what}.</p>
  </StoreLayout>
);

export function Login({ query }) {
  const { setUser } = useStore();
  const [tab, setTab] = useState('signin');
  const next = query.get('next') || 'shop';
  const done = (u) => {
    setUser(u);
    go(next);
  };
  const register = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    done({ id: 'C-0100', name: f.name, email: f.email, taxId: f.taxId, address: f.address });
  };
  return (
    <div className="login-bg">
      <div className="card login stack">
        <div className="logo center">Crema &amp; Co.</div>
        {next !== 'shop' && <p className="notice">Please sign in to continue. Your cart is kept.</p>}
        <div role="tablist" aria-label="Account" className="tabs">
          <button type="button" role="tab" aria-selected={tab === 'signin'} onClick={() => setTab('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={tab === 'register'} onClick={() => setTab('register')}>Create account</button>
        </div>
        {tab === 'signin' ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); done(DENIZ); }}>
            <label className="field">Email<input type="email" autoComplete="email" defaultValue={DENIZ.email} required /></label>
            <label className="field">Password<input type="password" autoComplete="current-password" required /></label>
            <button className="btn btn-primary">Sign in</button>
            <p className="muted small">Prototype: any password signs you in as {DENIZ.name}.</p>
          </form>
        ) : (
          <form className="stack" onSubmit={register}>
            <label className="field">Full name<input name="name" autoComplete="name" required /></label>
            <label className="field">Email<input name="email" type="email" autoComplete="email" required /></label>
            <label className="field">Tax ID<input name="taxId" inputMode="numeric" required /></label>
            <label className="field">Home address<textarea name="address" rows="2" autoComplete="street-address" required /></label>
            <label className="field">Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <button className="btn btn-primary">Create account</button>
          </form>
        )}
        <div className="divider">or</div>
        <a className="btn" href="#/shop">Continue as guest</a>
        <p className="muted small center">Guests can browse and add to the cart. You sign in at checkout and your cart is kept.</p>
        <p className="muted small center rule">Staff member? <a href="#/staff/products">Open the staff portal</a></p>
      </div>
    </div>
  );
}

const SORTS = {
  popular: (a, b) => b.sold - a.sold,
  'price-asc': (a, b) => priceOf(a) - priceOf(b),
  'price-desc': (a, b) => priceOf(b) - priceOf(a),
};

export function Shop() {
  const { products, categories, catName, addToCart } = useStore();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [msg, setMsg] = useState('');
  const onSale = products.filter((p) => p.price != null);
  const needle = q.trim().toLowerCase();
  const list = onSale
    .filter((p) => (cat === 'all' || p.cat === cat) && (p.name + ' ' + p.desc).toLowerCase().includes(needle))
    .sort(SORTS[sort]);
  const add = (p) => setMsg(addToCart(p.id) ? `${p.name} added to your cart.` : `No more ${p.name} in stock.`);
  return (
    <StoreLayout active="shop">
      <h1>Shop</h1>
      <div role="group" aria-label="Categories" className="row">
        {[{ id: 'all', name: 'All products' }, ...categories].map((c) => (
          <button key={c.id} type="button" className="pill" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '1 1 320px' }}>Search
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product name or description" />
        </label>
        <label className="field">Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular">Popularity</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>
      <p role="status" className="muted">{list.length} of {onSale.length} products</p>
      {msg && <p role="status" className="notice">{msg} <a href="#/cart">View cart</a></p>}
      {list.length === 0 && <p className="empty">No products match your search.</p>}
      <div className="grid-cards">
        {list.map((p) => (
          <article key={p.id} className="pcard">
            <a className="img" style={{ height: 150 }} href={`#/product/${p.id}`} aria-label={`View ${p.name}`}>Product image</a>
            <div className="stack pbody">
              <span className="muted small">{catName(p.cat)}</span>
              <a className="pname" href={`#/product/${p.id}`}>{p.name}</a>
              <p className="small">{p.desc}</p>
              <span className="muted small">★ {p.rating.toFixed(1)} ({p.ratings} ratings)</span>
              <Price p={p} />
              <Stock p={p} />
              <button type="button" className="btn btn-primary" disabled={!p.stock} onClick={() => add(p)}>
                {p.stock ? 'Add to cart' : 'Out of stock'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </StoreLayout>
  );
}

export function Product({ param }) {
  const { product, catName, cart, addToCart, wishlist, setWishlist, comments } = useStore();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const p = product(param);
  if (!p || p.price == null) {
    return <StoreLayout><p>Product not found. <a href="#/shop">Back to the shop</a></p></StoreLayout>;
  }
  const room = Math.max(0, p.stock - (cart[p.id] || 0));
  const wished = wishlist.includes(p.id);
  const reviews = comments.filter((c) => c.pid === p.id && c.state === 'approved');
  const toggleWish = () => {
    setWishlist((w) => (wished ? w.filter((id) => id !== p.id) : [...w, p.id]));
    setMsg(wished ? 'Removed from your wishlist.' : 'Saved to your wishlist. You will be notified if the price drops.');
  };
  const add = () => {
    addToCart(p.id, qty);
    setMsg(`${Math.min(qty, room)} × ${p.name} added to your cart.`);
    setQty(1);
  };
  return (
    <StoreLayout active="shop">
      <nav aria-label="Breadcrumb" className="muted small"><a href="#/shop">Shop</a> / {catName(p.cat)} / {p.name}</nav>
      <div className="row" style={{ alignItems: 'flex-start', gap: 32 }}>
        <div className="img" style={{ flex: '1 1 420px', height: 420 }}>Product image</div>
        <div className="stack" style={{ flex: '1 1 420px' }}>
          <span className="muted small">{catName(p.cat)}</span>
          <h1>{p.name}</h1>
          <span className="muted">★ {p.rating.toFixed(1)} · {p.ratings} ratings · {reviews.length} reviews</span>
          <Price p={p} big />
          <span className="muted small">VAT included</span>
          <Stock p={p} />
          <div className="row">
            <Qty value={qty} min={1} max={Math.max(1, room)} onChange={setQty} label="Quantity" />
            <button type="button" className="btn btn-primary" disabled={!room} onClick={add}>
              {!p.stock ? 'Out of stock' : room ? 'Add to cart' : 'All stock is in your cart'}
            </button>
            <button type="button" className="btn" aria-pressed={wished} onClick={toggleWish}>{wished ? '♥ In wishlist' : '♡ Add to wishlist'}</button>
          </div>
          {msg && <p role="status" className="notice">{msg} <a href="#/cart">View cart</a></p>}
          <dl className="kv card">
            <dt>Product ID</dt><dd>{p.id}</dd>
            <dt>Model</dt><dd>{p.model}</dd>
            <dt>Serial number</dt><dd>{p.serial}</dd>
            <dt>Warranty</dt><dd>{p.warranty}</dd>
            <dt>Distributor</dt><dd>{p.dist}</dd>
            <dt>Quantity in stock</dt><dd>{p.stock}</dd>
          </dl>
        </div>
      </div>
      <section className="stack">
        <h2>Description</h2>
        <p>{p.desc}</p>
      </section>
      <section className="stack">
        <h2>Reviews</h2>
        <p className="notice">You can rate and comment after your order is delivered: go to <a href="#/orders">My orders</a>. Ratings show up right away; comments appear after a product manager approves them.</p>
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {reviews.map((c) => (
          <article key={c.id} className="stack line" style={{ gap: 6 }}>
            <span className="small"><b>{'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}</b> · {c.customer} · {fmtDate(c.date)}</span>
            <p>{c.text}</p>
          </article>
        ))}
      </section>
    </StoreLayout>
  );
}

function Summary({ t, lines, children }) {
  return (
    <aside aria-label="Order summary" className="card stack summary">
      <h2>Summary</h2>
      {lines?.map(({ p, qty }) => (
        <div key={p.id} className="kvrow small"><span>{qty} × {p.name}</span><span>{fmt(priceOf(p) * qty)}</span></div>
      ))}
      <div className="kvrow"><span>Subtotal</span><span>{fmt(t.list)}</span></div>
      {t.saved > 0 && <div className="kvrow bad"><span>Discounts</span><span>−{fmt(t.saved)}</span></div>}
      <div className="kvrow"><span>Shipping</span><span>{t.ship ? fmt(t.ship) : 'Free'}</span></div>
      <div className="kvrow total"><span>Total</span><span>{fmt(t.total)}</span></div>
      <span className="muted small">VAT included. Free shipping over ₺1,000.</span>
      {children}
    </aside>
  );
}

export function Cart() {
  const { cartLines, setQty, user } = useStore();
  return (
    <StoreLayout active="cart">
      <h1>Your cart</h1>
      {!user && <p className="notice">You are shopping as a guest. <a href="#/login?next=cart">Sign in</a> before placing your order. Your cart is kept.</p>}
      {cartLines.length === 0 ? (
        <p className="empty">Your cart is empty. <a href="#/shop">Continue shopping</a></p>
      ) : (
        <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: '999 1 560px', minWidth: 0 }}>
            {cartLines.map(({ p, qty }) => (
              <div key={p.id} className="row line">
                <div className="img" style={{ width: 80, height: 80 }} />
                <div className="stack" style={{ flex: '1 1 220px', gap: 4 }}>
                  <a className="pname" href={`#/product/${p.id}`}>{p.name}</a>
                  <span className="muted small">
                    {fmt(priceOf(p))} each{p.discount > 0 && <> · <s>{fmt(p.price)}</s> <b className="bad">on sale</b></>}
                  </span>
                  <span className={'small ' + (qty >= p.stock ? 'bad' : 'muted')}>
                    {qty >= p.stock ? `Max reached: only ${p.stock} in stock` : `${p.stock} in stock`}
                  </span>
                </div>
                <Qty value={qty} min={0} max={p.stock} onChange={(n) => setQty(p.id, n)} label={`Quantity of ${p.name}`} />
                <strong style={{ width: 100, textAlign: 'right' }}>{fmt(priceOf(p) * qty)}</strong>
                <button type="button" className="btn btn-sm" onClick={() => setQty(p.id, 0)}>Remove</button>
              </div>
            ))}
            <p style={{ padding: '16px 0' }}><a href="#/shop">← Continue shopping</a></p>
          </div>
          <Summary t={totals(cartLines)}>
            <button type="button" className="btn btn-primary" onClick={() => go(user ? 'checkout' : 'login?next=checkout')}>
              {user ? 'Checkout' : 'Sign in to check out'}
            </button>
          </Summary>
        </div>
      )}
    </StoreLayout>
  );
}

export function Checkout() {
  const { user, cartLines, placeOrder } = useStore();
  const [address, setAddress] = useState(user?.address || '');
  const [card, setCard] = useState(null); // last 4 digits while the bank confirms
  const [error, setError] = useState('');
  if (!user) return <SignInFirst next="checkout" what="check out. Your cart is kept" />;
  if (cartLines.length === 0) return <StoreLayout><p className="empty">Your cart is empty. <a href="#/shop">Go to the shop</a></p></StoreLayout>;
  const t = totals(cartLines);
  const submit = (e) => {
    e.preventDefault();
    const digits = String(new FormData(e.target).get('card')).replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return setError('Enter a valid card number.');
    setError('');
    setCard(digits.slice(-4));
  };
  const approve = () => {
    const result = placeOrder(address, card);
    setCard(null);
    if (result.error) setError(result.error);
    else go(`invoice/${result.id}?new=1`);
  };
  return (
    <StoreLayout>
      <h1>Checkout</h1>
      {error && <p role="alert" className="notice bad">{error}</p>}
      <form className="row" style={{ alignItems: 'flex-start', gap: 24 }} onSubmit={submit}>
        <div className="stack" style={{ flex: '999 1 560px', minWidth: 0, gap: 24 }}>
          <fieldset className="card stack">
            <legend>Delivery address</legend>
            <label className="field">Full name<input defaultValue={user.name} autoComplete="name" required /></label>
            <label className="field">Address<textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" required /></label>
          </fieldset>
          <fieldset className="card stack">
            <legend>Payment</legend>
            <label className="field">Name on card<input name="holder" autoComplete="cc-name" required /></label>
            <label className="field">Card number<input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" required /></label>
            <div className="row">
              <label className="field" style={{ flex: '1 1 140px' }}>Expiry (MM/YY)<input name="exp" autoComplete="cc-exp" placeholder="08/29" pattern="\d{2}/\d{2}" required /></label>
              <label className="field" style={{ flex: '1 1 140px' }}>CVC<input name="cvc" type="password" inputMode="numeric" autoComplete="cc-csc" pattern="\d{3,4}" required /></label>
            </div>
            <p className="muted small">Card details go to the bank only. We keep the last 4 digits.</p>
          </fieldset>
        </div>
        <Summary t={t} lines={cartLines}>
          <button className="btn btn-primary">Pay {fmt(t.total)}</button>
        </Summary>
      </form>
      {card && (
        <Dialog label="Bank confirmation">
          <span className="eyebrow">MOCK BANK</span>
          <h2>Confirm this payment</h2>
          <p>Pay <strong>{fmt2(t.total)}</strong> to Crema &amp; Co. with card ending {card}?</p>
          <div className="row">
            <button type="button" className="btn btn-primary grow" onClick={approve}>Approve</button>
            <button type="button" className="btn grow" onClick={() => { setCard(null); setError('The bank declined the payment. Your card was not charged.'); }}>Decline</button>
          </div>
          <span className="muted small">Prototype: this stands in for the bank's response.</span>
        </Dialog>
      )}
    </StoreLayout>
  );
}

export function Invoice({ param, query }) {
  const { orders } = useStore();
  const o = orders.find((x) => x.id === param);
  if (!o) return <StoreLayout><p>Invoice not found.</p></StoreLayout>;
  const total = orderTotal(o);
  const net = total / 1.2;
  return (
    <StoreLayout>
      {query.get('new') && (
        <div role="status" className="notice ok stack" style={{ gap: 4 }}>
          <span>Payment confirmed by the bank</span>
          <span style={{ fontWeight: 400, color: '#111' }}>Order {o.id} is now processing. A PDF copy of this invoice was emailed to {o.customer.email}.</span>
        </div>
      )}
      <div className="row no-print">
        <button type="button" className="btn btn-primary" onClick={() => print()}>Print / save as PDF</button>
        <a className="btn" href="#/orders">Track order</a>
      </div>
      <article aria-label="Invoice" className="invoice stack" style={{ gap: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="stack small" style={{ gap: 2 }}>
            <strong style={{ fontSize: 20 }}>Crema &amp; Co.</strong>
            <span>[Store address]</span>
            <span>Tax ID: [Store tax ID]</span>
          </div>
          <div className="stack small" style={{ gap: 2, textAlign: 'right' }}>
            <strong style={{ fontSize: 20 }}>INVOICE</strong>
            <span>No. INV-{o.date.slice(0, 4)}-{o.id.slice(3)}</span>
            <span>Date: {fmtDate(o.date)}</span>
            <span>Order: {o.id}</span>
          </div>
        </div>
        <div className="row small" style={{ alignItems: 'flex-start', gap: 24, lineHeight: 1.5 }}>
          <div style={{ flex: '1 1 220px' }}><b>Bill to</b><br />{o.customer.name} ({o.customer.id})<br />{o.customer.address}<br />Tax ID: {o.customer.taxId}</div>
          <div style={{ flex: '1 1 220px' }}><b>Payment</b><br />Card ending {o.card}<br />Approved by bank</div>
        </div>
        <div className="table">
          <table>
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.pid}>
                  <td>
                    {i.pid} · {i.name}
                    {i.listPrice > i.price && <span className="muted"> (discounted from {fmt2(i.listPrice)})</span>}
                    {i.ret === 'refunded' && <b className="bad"> · refunded</b>}
                  </td>
                  <td className="num">{i.qty}</td>
                  <td className="num">{fmt2(i.price)}</td>
                  <td className="num">{fmt2(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stack small" style={{ alignSelf: 'flex-end', width: '100%', maxWidth: 300, gap: 6 }}>
          <div className="kvrow"><span>Net amount</span><span>{fmt2(net)}</span></div>
          <div className="kvrow"><span>VAT (20%)</span><span>{fmt2(total - net)}</span></div>
          <div className="kvrow"><span>Shipping (incl.)</span><span>{fmt2(o.ship || 0)}</span></div>
          <div className="kvrow total"><span>Total paid</span><span>{fmt2(total)}</span></div>
        </div>
      </article>
    </StoreLayout>
  );
}

const FLOW = ['processing', 'in-transit', 'delivered'];
const RETURN_TEXT = {
  requested: 'Return requested, waiting for a sales manager',
  awaiting: 'Return accepted, please send the item back',
  refunded: 'Returned and refunded',
  rejected: 'Return request rejected',
};

function Steps({ status }) {
  const at = FLOW.indexOf(status);
  return (
    <ol className="steps" aria-label="Delivery progress">
      {FLOW.map((k, n) => (
        <li key={k} className={n === at ? 'current' : n < at ? 'done' : ''}>
          {n < at ? '✓ ' : n === at ? '● ' : '○ '}{STATUS[k].label}
        </li>
      ))}
    </ol>
  );
}

export function Orders() {
  const { user, orders, patchOrder, patchLine, restock, setProducts, setComments, setRefunds } = useStore();
  const [modal, setModal] = useState(null); // { kind: 'review' | 'return', o, i }
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('Arrived damaged');
  const [msg, setMsg] = useState('');
  if (!user) return <SignInFirst active="orders" next="orders" what="see your orders" />;
  const mine = orders.filter((o) => o.customer.id === user.id);

  const cancel = (o) => {
    patchOrder(o.id, { status: 'cancelled' });
    o.items.forEach((i) => restock(i.pid, i.qty));
    setMsg(`Order ${o.id} was cancelled and its items went back into stock.`);
  };
  const open = (kind, o, i) => {
    setModal({ kind, o, i });
    setStars(0);
    setComment('');
  };
  const submitReview = () => {
    const { o, i } = modal;
    patchLine(o.id, i.pid, { review: stars });
    setProducts((ps) => ps.map((p) => (p.id === i.pid ? { ...p, rating: (p.rating * p.ratings + stars) / (p.ratings + 1), ratings: p.ratings + 1 } : p)));
    if (comment.trim()) {
      setComments((cs) => [{ id: Date.now(), pid: i.pid, customer: user.name, date: todayISO(), stars, text: comment.trim(), state: 'pending' }, ...cs]);
    }
    setModal(null);
    setMsg(comment.trim() ? 'Thanks! Your rating is live. Your comment will appear once a product manager approves it.' : 'Thanks! Your rating is live.');
  };
  const submitReturn = () => {
    const { o, i } = modal;
    patchLine(o.id, i.pid, { ret: 'requested' });
    setRefunds((rs) => [
      { id: 'RR-' + String(27 + rs.length).padStart(4, '0'), orderId: o.id, customer: o.customer, card: o.card, pid: i.pid, name: i.name, qty: i.qty, paid: i.price * i.qty, bought: o.date, requested: todayISO(), reason, state: 'pending' },
      ...rs,
    ]);
    setModal(null);
    setMsg('Return requested. We will email you when the refund is approved.');
  };

  return (
    <StoreLayout active="orders">
      <h1>My orders</h1>
      <p className="muted">You can cancel an order while it is processing. Delivered items can be returned within 30 days of purchase, and rated and reviewed.</p>
      {msg && <p role="status" className="notice ok">{msg}</p>}
      {mine.length === 0 && <p className="empty">No orders yet. <a href="#/shop">Start shopping</a></p>}
      {mine.map((o) => {
        const delivered = o.status === 'delivered';
        const inWindow = delivered && daysSince(o.date) <= 30;
        return (
          <section key={o.id} className="order" aria-label={`Order ${o.id}`}>
            <div className="row order-head">
              <strong>{o.id}</strong>
              <span>Placed {fmtDate(o.date)}</span>
              <span>Total {fmt(orderTotal(o))}</span>
              <a href={`#/invoice/${o.id}`}>Invoice</a>
              <span className="grow" />
              <StatusBadge status={o.status} />
            </div>
            <div className="stack order-body">
              {o.status !== 'cancelled' && <Steps status={o.status} />}
              {delivered && o.deliveredOn && <span className="muted small">Delivered on {fmtDate(o.deliveredOn)}</span>}
              {o.items.map((i) => (
                <div key={i.pid} className="row line">
                  <div className="img" style={{ width: 56, height: 56 }} />
                  <div className="stack" style={{ flex: '1 1 260px', gap: 2 }}>
                    <a className="pname" href={`#/product/${i.pid}`}>{i.name}</a>
                    <span className="muted small">Qty {i.qty} · paid {fmt(i.price * i.qty)}</span>
                    {i.review && <span className="ok small">Your rating: {'★'.repeat(i.review)}</span>}
                    {i.ret && <span className="warn small">{RETURN_TEXT[i.ret]}</span>}
                    {delivered && !inWindow && !i.ret && <span className="muted small">30-day return window has closed</span>}
                  </div>
                  <div className="row">
                    {delivered && !i.review && <button type="button" className="btn btn-sm" onClick={() => open('review', o, i)}>Rate &amp; review</button>}
                    {inWindow && !i.ret && <button type="button" className="btn btn-sm" onClick={() => open('return', o, i)}>Return item</button>}
                  </div>
                </div>
              ))}
              {o.status === 'processing' && (
                <div className="row">
                  <button type="button" className="btn btn-danger" onClick={() => cancel(o)}>Cancel order</button>
                  <span className="muted small">Possible only while the order is processing.</span>
                </div>
              )}
              {o.status === 'in-transit' && <span className="muted small">This order has shipped, so it can no longer be cancelled.</span>}
              {inWindow && <span className="muted small">Returns accepted until {fmtDate(addDays(o.date, 30))}</span>}
            </div>
          </section>
        );
      })}

      {modal?.kind === 'review' && (
        <Dialog label="Rate and review">
          <h2>Rate &amp; review</h2>
          <span className="muted">{modal.i.name}</span>
          <div role="group" aria-label="Rating" className="row stars" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} stars`} aria-pressed={n <= stars} onClick={() => setStars(n)}>{n <= stars ? '★' : '☆'}</button>
            ))}
          </div>
          <label className="field">Comment (optional)<textarea rows="4" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <p className="muted small">Your rating is published right away. Your comment appears after a product manager approves it.</p>
          <div className="row">
            <button type="button" className="btn btn-primary grow" disabled={!stars} onClick={submitReview}>Submit</button>
            <button type="button" className="btn grow" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Dialog>
      )}
      {modal?.kind === 'return' && (
        <Dialog label="Return item">
          <h2>Return item</h2>
          <span className="muted">{modal.i.name}</span>
          <label className="field">Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Arrived damaged</option>
              <option>Not as described</option>
              <option>Changed my mind</option>
            </select>
          </label>
          <p className="notice">Refund amount: <strong>{fmt(modal.i.price * modal.i.qty)}</strong>, the price you paid.</p>
          <ol className="muted small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>A sales manager reviews your request.</li>
            <li>You send the item back.</li>
            <li>When it arrives, we refund your card and email you.</li>
          </ol>
          <div className="row">
            <button type="button" className="btn btn-primary grow" onClick={submitReturn}>Request return</button>
            <button type="button" className="btn grow" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Dialog>
      )}
    </StoreLayout>
  );
}

export function Account() {
  const { user, wishlist, setWishlist, product, addToCart, notes } = useStore();
  const [msg, setMsg] = useState('');
  if (!user) return <SignInFirst active="account" next="account" what="see your account" />;
  const items = wishlist.map((id) => product(id)).filter((p) => p && p.price != null);
  const myNotes = notes.filter((n) => n.customerId === user.id);
  return (
    <StoreLayout active="account">
      <h1>My account</h1>
      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <section aria-label="Profile" className="card stack" style={{ flex: '1 1 360px' }}>
          <h2>Profile</h2>
          <dl className="kv">
            <dt>Name</dt><dd>{user.name}</dd>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Home address</dt><dd>{user.address}</dd>
            <dt>Tax ID</dt><dd>••••••{user.taxId.slice(-4)}</dd>
            <dt>Customer ID</dt><dd>{user.id}</dd>
          </dl>
        </section>
        <section aria-label="Notifications" className="card stack" style={{ flex: '1 1 360px' }}>
          <h2>Notifications</h2>
          {myNotes.length === 0 && <p className="muted">Nothing yet.</p>}
          {myNotes.map((n) => (
            <div key={n.id} className="note">
              <strong>{n.title}</strong><br />{n.body}<br />
              <span className="muted small">{fmtDate(n.date)} · also sent by email</span>
            </div>
          ))}
        </section>
      </div>
      <section aria-label="Wishlist" className="stack">
        <h2>Wishlist ({items.length})</h2>
        {msg && <p role="status" className="notice">{msg}</p>}
        {items.length === 0 && <p className="muted">Your wishlist is empty. <a href="#/shop">Browse the shop</a></p>}
        <div className="grid-cards">
          {items.map((p) => (
            <article key={p.id} className="pcard">
              <div className="img" style={{ height: 120 }}>Product image</div>
              <div className="stack pbody">
                <a className="pname" href={`#/product/${p.id}`}>{p.name}</a>
                <Price p={p} />
                <Stock p={p} />
                <div className="row">
                  <button type="button" className="btn btn-primary grow" disabled={!p.stock} onClick={() => setMsg(addToCart(p.id) ? `${p.name} added to your cart.` : `No more ${p.name} in stock.`)}>
                    {p.stock ? 'Add to cart' : 'Out of stock'}
                  </button>
                  <button type="button" className="btn" onClick={() => { setWishlist((w) => w.filter((id) => id !== p.id)); setMsg(`${p.name} removed from your wishlist.`); }}>Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </StoreLayout>
  );
}
