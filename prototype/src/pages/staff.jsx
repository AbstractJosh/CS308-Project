import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Composer, Msg, Qty, StaffLayout } from '../ui.jsx';
import { CUSTOMERS, DENIZ, STATUS, addDays, costText, fmt, fmtDate, fmtDay, orderTotal, priceOf, todayISO } from '../data.js';

const Toast = ({ msg }) => msg && <p role="status" className="notice ok">{msg}</p>;

/* ---------- Product manager ---------- */

export function Products() {
  const { products, setProducts, categories, setCategories, catName } = useStore();
  const [form, setForm] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [msg, setMsg] = useState('');
  const setStock = (id, n) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: Math.max(0, n) } : p)));
  const remove = (p) => {
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    setMsg(`${p.name} was removed from the store.`);
  };
  const save = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const id = 'P-' + (Math.max(...products.map((p) => Number(p.id.slice(2)))) + 1);
    setProducts((ps) => [...ps, {
      id, name: f.name, cat: f.cat, model: f.model, serial: f.serial, desc: f.desc, price: null, stock: Number(f.stock) || 0,
      cost: f.cost ? Number(f.cost) : undefined, warranty: f.warranty || 'No warranty', dist: f.dist, sold: 0, rating: 0, ratings: 0, wish: 0,
    }]);
    setForm(false);
    setMsg(`${id} ${f.name} saved. It goes on sale once a sales manager sets its price.`);
  };
  const addCat = (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setCategories((cs) => [...cs, { id: 'c' + Date.now(), name: newCat.trim() }]);
    setNewCat('');
  };
  return (
    <StaffLayout role="pm" active="staff/products" title="Products & stock"
      actions={<button type="button" className="btn btn-primary" onClick={() => setForm(!form)}>{form ? 'Close form' : 'Add product'}</button>}>
      <Toast msg={msg} />
      {form && (
        <form aria-label="New product" className="card stack" onSubmit={save}>
          <h2>New product</h2>
          <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <label className="field">Name<input name="name" required /></label>
            <label className="field">Model<input name="model" required /></label>
            <label className="field">Serial number<input name="serial" required /></label>
            <label className="field">Category
              <select name="cat">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="field">Quantity in stock<input name="stock" type="number" min="0" defaultValue="0" required /></label>
            <label className="field">Cost (optional, ₺)<input name="cost" type="number" min="0" placeholder="Defaults to 50% of price" /></label>
            <label className="field">Warranty<input name="warranty" placeholder="e.g. 2 years" /></label>
            <label className="field">Distributor<input name="dist" required /></label>
          </div>
          <label className="field">Description<textarea name="desc" rows="3" required /></label>
          <p className="muted small">The sales manager sets the price. The product stays hidden from the store until it has one.</p>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save product</button>
        </form>
      )}

      <section aria-label="Categories" className="card stack">
        <h2>Categories</h2>
        <div className="row" style={{ gap: 8 }}>
          {categories.map((c) => {
            const count = products.filter((p) => p.cat === c.id).length;
            return (
              <span key={c.id} className="badge" style={{ fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {c.name} ({count})
                {count === 0
                  ? <button type="button" className="btn btn-sm" aria-label={`Remove category ${c.name}`} onClick={() => setCategories((cs) => cs.filter((x) => x.id !== c.id))}>×</button>
                  : <span className="muted small">in use</span>}
              </span>
            );
          })}
        </div>
        <form className="row" onSubmit={addCat}>
          <input className="input" aria-label="New category name" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="btn">Add category</button>
        </form>
      </section>

      <div className="table">
        <table>
          <thead>
            <tr><th>ID</th><th>Product</th><th>Price</th><th>Cost</th><th>Stock</th><th>Warranty · distributor</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td><strong>{p.name}</strong><div className="muted small">{catName(p.cat)} · Model {p.model} · SN {p.serial}</div></td>
                <td className={p.price == null ? 'warn' : ''}>{p.price == null ? 'Awaiting price' : fmt(priceOf(p))}</td>
                <td>{costText(p)}</td>
                <td className={p.stock === 0 ? 'bad' : p.stock <= 3 ? 'warn' : ''}>
                  <Qty value={p.stock} min={0} max={9999} onChange={(n) => setStock(p.id, n)} label={`Stock of ${p.name}`} />
                </td>
                <td className="small">{p.warranty} · {p.dist}</td>
                <td><button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffLayout>
  );
}

export function Deliveries() {
  const { orders, patchOrder } = useStore();
  const [filter, setFilter] = useState('all');
  // The delivery list has one row per product in each order; status is per order.
  const rows = orders
    .filter((o) => o.status !== 'cancelled')
    .flatMap((o) => o.items.map((i, n) => ({ o, i, id: `D-${o.id.slice(3)}-${n + 1}` })));
  const shown = rows.filter((r) => filter === 'all' || r.o.status === filter);
  const setStatus = (o, status) => patchOrder(o.id, { status, deliveredOn: status === 'delivered' ? o.deliveredOn || todayISO() : undefined });
  return (
    <StaffLayout role="pm" active="staff/deliveries" title="Deliveries">
      <p className="muted">One row per product in an order. Update the status as orders ship and arrive. Customers see it in their order history.</p>
      <div role="group" aria-label="Filter by status" className="row" style={{ gap: 8 }}>
        {['all', 'processing', 'in-transit', 'delivered'].map((k) => (
          <button key={k} type="button" className="pill" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All' : STATUS[k].label} ({k === 'all' ? rows.length : rows.filter((r) => r.o.status === k).length})
          </button>
        ))}
      </div>
      <div className="table">
        <table>
          <thead>
            <tr><th>Delivery ID</th><th>Customer ID</th><th>Product ID</th><th className="num">Qty</th><th className="num">Total price</th><th>Delivery address</th><th>Status</th><th>Completed</th></tr>
          </thead>
          <tbody>
            {shown.map(({ o, i, id }) => (
              <tr key={id}>
                <td><strong>{id}</strong><div className="small">{o.id} · <a href={`#/invoice/${o.id}`}>invoice</a></div></td>
                <td>{o.customer.id}</td>
                <td>{i.pid}<div className="muted small">{i.name}</div></td>
                <td className="num">{i.qty}</td>
                <td className="num">{fmt(i.price * i.qty)}</td>
                <td className="small">{o.customer.name}, {o.customer.address}</td>
                <td>
                  <select className="input" aria-label={`Status of ${id}`} value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                    <option value="processing">Processing</option>
                    <option value="in-transit">In transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </td>
                <td className={o.status === 'delivered' ? 'ok' : 'muted'}><b>{o.status === 'delivered' ? 'Yes' : 'No'}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffLayout>
  );
}

export function Comments() {
  const { comments, setComments, product } = useStore();
  const [tab, setTab] = useState('pending');
  const decide = (id, state) => setComments((cs) => cs.map((c) => (c.id === id ? { ...c, state } : c)));
  const list = comments.filter((c) => c.state === tab);
  const tabs = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Disapproved']];
  return (
    <StaffLayout role="pm" active="staff/comments" title="Comments">
      <p className="muted">Ratings are published as soon as customers submit them. Comments stay hidden until you approve them. Only customers whose item was delivered can review.</p>
      <div role="group" aria-label="Filter comments" className="row" style={{ gap: 8 }}>
        {tabs.map(([k, label]) => (
          <button key={k} type="button" className="pill" aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label} ({comments.filter((c) => c.state === k).length})
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="empty">Nothing here.</p>}
      {list.map((c) => (
        <article key={c.id} className="card stack" style={{ gap: 8, maxWidth: 860 }}>
          <div className="row small" style={{ gap: 4, columnGap: 16 }}>
            <strong>{product(c.pid)?.name || c.pid}</strong>
            <span className="muted">{c.customer} · {fmtDate(c.date)}</span>
          </div>
          <span className="small">Rating: <b>{'★'.repeat(c.stars)}{'☆'.repeat(5 - c.stars)}</b> <span className="muted">(already live)</span></span>
          <p className="notice">{c.text}</p>
          {c.state === 'pending' ? (
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => decide(c.id, 'approved')}>Approve</button>
              <button type="button" className="btn btn-danger" onClick={() => decide(c.id, 'rejected')}>Disapprove</button>
            </div>
          ) : (
            <b className={'small ' + (c.state === 'approved' ? 'ok' : 'bad')}>
              {c.state === 'approved' ? 'Approved · visible on the product page' : 'Disapproved · hidden from customers'}
            </b>
          )}
        </article>
      ))}
    </StaffLayout>
  );
}

/* ---------- Sales manager ---------- */

export function Pricing() {
  const { products, setProducts, wishlist, user, notify } = useStore();
  const [sel, setSel] = useState([]);
  const [rate, setRate] = useState('10');
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState('');
  const r = Number(rate);
  const valid = r >= 1 && r <= 90;
  const chosen = products.filter((p) => sel.includes(p.id) && p.price != null);
  const patch = (id, fields) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  const apply = () => {
    setProducts((ps) => ps.map((p) => (chosen.includes(p) ? { ...p, discount: r } : p)));
    // The demo has one wishlist (the signed-in customer's); the real app notifies every customer whose wishlist has the product.
    chosen.filter((p) => wishlist.includes(p.id)).forEach((p) =>
      notify((user || DENIZ).id, 'Price drop on your wishlist', `${p.name} is now ${fmt(Math.round(p.price * (1 - r / 100)))} (${r}% off).`));
    setSel([]);
    setMsg(`${r}% discount applied to ${chosen.length} product(s). ${chosen.reduce((a, p) => a + p.wish, 0)} customers with them on their wishlist were notified.`);
  };
  const setPrice = (p) => {
    const v = Number(draft[p.id]);
    if (!(v > 0)) return;
    patch(p.id, { price: v, discount: 0 });
    setMsg(`${p.name} is now on sale for ${fmt(v)}.`);
  };
  return (
    <StaffLayout role="sales" active="staff/pricing" title="Pricing & discounts">
      <section aria-label="Apply a discount" className="card row" style={{ alignItems: 'flex-end' }}>
        <label className="field">Discount rate (%)
          <input type="number" min="1" max="90" value={rate} onChange={(e) => setRate(e.target.value)} style={{ width: 140 }} />
        </label>
        <button type="button" className="btn btn-primary" disabled={!valid || chosen.length === 0} onClick={apply}>Apply to {chosen.length} selected</button>
        <p className="muted small" style={{ flex: '1 1 260px' }}>The new price is set automatically. Customers with these products on their wishlist get an email and a notification.</p>
      </section>
      <Toast msg={msg} />
      <div className="table">
        <table>
          <thead>
            <tr><th><span className="sr-only">Select</span></th><th>Product</th><th>Cost</th><th>Current price</th><th className="num">Wishlists</th><th className="num">New price</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const on = sel.includes(p.id);
              return (
                <tr key={p.id} style={{ background: on ? '#f5f5f5' : undefined }}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${p.name}`} checked={on} disabled={p.price == null} style={{ width: 20, height: 20 }}
                      onChange={() => setSel((s) => (on ? s.filter((id) => id !== p.id) : [...s, p.id]))} />
                  </td>
                  <td><strong>{p.name}</strong><div className="muted small">{p.id}</div></td>
                  <td>{costText(p)}</td>
                  <td>
                    {p.price == null ? (
                      <form className="row" style={{ gap: 4, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); setPrice(p); }}>
                        <input className="input" type="number" min="1" aria-label={`Price for ${p.name}`} placeholder="₺" style={{ width: 100 }}
                          value={draft[p.id] || ''} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })} />
                        <button className="btn btn-sm btn-primary">Set price</button>
                      </form>
                    ) : (
                      <>
                        <strong>{fmt(priceOf(p))}</strong>
                        {p.discount > 0 && <div className="bad small">−{p.discount}% · list {fmt(p.price)}</div>}
                      </>
                    )}
                  </td>
                  <td className="num">{p.wish}</td>
                  <td className="num"><b>{on && valid ? fmt(Math.round(p.price * (1 - r / 100))) : '—'}</b></td>
                  <td>{p.discount > 0 && <button type="button" className="btn btn-sm" onClick={() => { patch(p.id, { discount: 0 }); setMsg(`Discount ended for ${p.name}.`); }}>End discount</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">New products from the product manager show “Awaiting price” until you set one. Cost defaults to 50% of the price unless the product manager entered it.</p>
    </StaffLayout>
  );
}

// Colors validated for CVD separation with the dataviz palette checker.
const REV = '#2a78d6';
const COST = '#eb6834';

export function Reports() {
  const { orders, product } = useStore();
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState(todayISO());
  const [hover, setHover] = useState(-1);
  const inRange = orders.filter((o) => o.status !== 'cancelled' && o.date >= from && o.date <= to);
  // Refunded lines count as refunds, not revenue. Unit cost: the PM's figure, else 50% of what the customer paid.
  const sums = (os) => os.flatMap((o) => o.items).reduce((a, i) => {
    if (i.ret === 'refunded') a.refunded += i.price * i.qty;
    else {
      a.rev += i.price * i.qty;
      a.cost += Math.round((product(i.pid)?.cost ?? i.price / 2) * i.qty);
    }
    return a;
  }, { rev: 0, cost: 0, refunded: 0 });
  const all = sums(inRange);
  const weeks = [];
  for (let d = from; d <= to && weeks.length < 26; d = addDays(d, 7)) {
    const end = addDays(d, 6) < to ? addDays(d, 6) : to;
    weeks.push({ label: `${fmtDay(d)} – ${fmtDay(end)}`, ...sums(inRange.filter((o) => o.date >= d && o.date <= end)) });
  }
  const max = Math.max(1, ...weeks.map((w) => w.rev));
  const hw = weeks[hover];
  const pl = (n) => (n >= 0 ? 'Profit ' : 'Loss ') + fmt(n);
  return (
    <StaffLayout role="sales" active="staff/reports" title="Invoices & revenue">
      <div role="group" aria-label="Date range" className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <span className="muted small" style={{ paddingBottom: 12 }}>{inRange.length} invoices in range</span>
      </div>
      <div className="kpis">
        <div className="card kpi"><div className="muted small">Revenue</div><div className="value">{fmt(all.rev)}</div></div>
        <div className="card kpi"><div className="muted small">Cost</div><div className="value">{fmt(all.cost)}</div></div>
        <div className="card kpi"><div className="muted small">{all.rev - all.cost >= 0 ? 'Profit' : 'Loss'}</div><div className="value">{fmt(all.rev - all.cost)}</div></div>
        <div className="card kpi"><div className="muted small">Refunded</div><div className="value">{fmt(all.refunded)}</div></div>
      </div>

      <section aria-label="Revenue and cost by week" className="card stack no-print">
        <div className="row">
          <h2 className="grow">Revenue vs cost by week</h2>
          <span className="legend"><i style={{ background: REV }} />Revenue</span>
          <span className="legend"><i style={{ background: COST }} />Cost</span>
        </div>
        <p role="status" className="small" style={{ minHeight: 20 }}>
          {hw ? `${hw.label}: revenue ${fmt(hw.rev)}, cost ${fmt(hw.cost)}, ${pl(hw.rev - hw.cost).toLowerCase()}` : 'Hover over a week to see its numbers.'}
        </p>
        {weeks.length === 0 ? <p className="empty">Pick a valid date range.</p> : (
          <>
            <div className="bars">
              {weeks.map((w, n) => (
                <div key={n} className="bar-group" style={{ background: n === hover ? '#f0f0f0' : undefined }} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(-1)}>
                  <div style={{ height: (w.rev / max) * 200, background: REV }} />
                  <div style={{ height: (w.cost / max) * 200, background: COST }} />
                </div>
              ))}
            </div>
            <div className="bar-labels">
              {weeks.map((w, n) => <div key={n}><div className="muted">{w.label}</div><b>{pl(w.rev - w.cost)}</b></div>)}
            </div>
          </>
        )}
        <p className="muted small">Profit = revenue − cost. Cost is 50% of the sale price unless the product manager entered it. Refunded items are excluded.</p>
      </section>

      <section aria-label="Invoices" className="stack">
        <div className="row">
          <h2 className="grow">Invoices</h2>
          <button type="button" className="btn btn-primary no-print" onClick={() => print()}>Print / save as PDF</button>
        </div>
        <div className="table">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th className="num">Total</th><th>Status</th><th className="no-print"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {inRange.map((o) => {
                const refunded = o.items.filter((i) => i.ret === 'refunded').length;
                return (
                  <tr key={o.id}>
                    <td>INV-{o.date.slice(0, 4)}-{o.id.slice(3)}</td>
                    <td>{fmtDate(o.date)}</td>
                    <td>{o.customer.name}</td>
                    <td className="num">{fmt(orderTotal(o))}</td>
                    <td className={refunded ? 'bad' : 'ok'}>{refunded === o.items.length ? 'Refunded' : refunded ? 'Partly refunded' : 'Paid'}</td>
                    <td className="no-print"><a href={`#/invoice/${o.id}`}>View</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </StaffLayout>
  );
}

const REFUND_STATE = {
  pending: ['Needs review', 'warn'],
  awaiting: ['Waiting for item', 'info'],
  refunded: ['Refunded', 'ok'],
  rejected: ['Rejected', 'muted'],
};

export function Refunds() {
  const { refunds, setRefunds, restock, patchLine, notify, product } = useStore();
  const [msg, setMsg] = useState('');
  const move = (r, state, line, note, toast) => {
    setRefunds((rs) => rs.map((x) => (x.id === r.id ? { ...x, state } : x)));
    patchLine(r.orderId, r.pid, { ret: line });
    notify(r.customer.id, ...note);
    setMsg(toast);
  };
  const accept = (r) => move(r, 'awaiting', 'awaiting', ['Return accepted', `Please send back ${r.name}. We refund ${fmt(r.paid)} when it arrives.`], `${r.id} accepted. ${r.customer.name} was emailed return instructions.`);
  const reject = (r) => move(r, 'rejected', 'rejected', ['Return rejected', `Your return request for ${r.name} was rejected.`], `${r.id} rejected. ${r.customer.name} was notified.`);
  const refund = (r) => {
    restock(r.pid, r.qty);
    move(r, 'refunded', 'refunded', ['Refund approved', `${fmt(r.paid)} for ${r.name} was refunded to your card ending ${r.card}.`],
      `${fmt(r.paid)} refunded to card ending ${r.card}. ${r.qty} unit(s) of ${r.name} added back to stock. ${r.customer.name} was emailed the amount.`);
  };
  return (
    <StaffLayout role="sales" active="staff/refunds" title="Refund requests">
      <p className="muted" style={{ maxWidth: 860 }}>Customers can return delivered items within 30 days of purchase. Accept the request, then issue the refund once the item is back in the store. Refunds always use the price the customer paid, including any discount.</p>
      <Toast msg={msg} />
      {refunds.map((r) => {
        const [label, cls] = REFUND_STATE[r.state];
        const unitPaid = r.paid / r.qty;
        const now = product(r.pid) && priceOf(product(r.pid));
        return (
          <article key={r.id} className="card stack" style={{ gap: 10, maxWidth: 860 }}>
            <div className="row">
              <strong>{r.id}</strong>
              <span className="muted small grow">Order {r.orderId} · requested {fmtDate(r.requested)}</span>
              <span className={'badge ' + cls}>{label}</span>
            </div>
            <dl className="kv">
              <dt>Customer</dt><dd>{r.customer.name} ({r.customer.id}) · card ending {r.card}</dd>
              <dt>Product</dt><dd>{r.name} × {r.qty}</dd>
              <dt>Purchased</dt><dd>{fmtDate(r.bought)}</dd>
              <dt>Refund amount</dt>
              <dd>
                <strong>{fmt(r.paid)}</strong>
                {now && unitPaid < now && <span className="muted"> (bought at a discount; today’s price {fmt(now)} does not apply)</span>}
              </dd>
              <dt>Reason</dt><dd>{r.reason}</dd>
            </dl>
            {r.state === 'pending' && (
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => accept(r)}>Accept return</button>
                <button type="button" className="btn btn-danger" onClick={() => reject(r)}>Reject</button>
              </div>
            )}
            {r.state === 'awaiting' && (
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => refund(r)}>Item received · refund {fmt(r.paid)}</button>
                <span className="muted small">Puts the item back in stock and emails the customer.</span>
              </div>
            )}
          </article>
        );
      })}
    </StaffLayout>
  );
}

/* ---------- Support agent ---------- */

export function Support() {
  const { chats, setChats, orders, user, cartLines, wishlist, product } = useStore();
  const [selId, setSelId] = useState(chats[0]?.id);
  const cur = chats.find((c) => c.id === selId) || chats[0];
  const patch = (id, fn) => setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const claim = (id) => {
    patch(id, (c) => ({ ...c, claimed: true }));
    setSelId(id);
  };
  const reply = (m) => patch(cur.id, (c) => ({ ...c, msgs: [...c.msgs, { from: 'agent', ...m }] }));
  const preview = (c) => {
    const last = c.msgs[c.msgs.length - 1];
    return last.text || `Attachment: ${last.file}`;
  };
  const queueItem = (c) => (
    <button key={c.id} type="button" className="queue-item" aria-current={c.id === cur?.id} onClick={() => setSelId(c.id)}>
      <strong>{c.name}</strong>
      <span className="small">{preview(c)}</span>
      <span className="muted small">Started on {c.started}</span>
    </button>
  );
  const waiting = chats.filter((c) => !c.claimed);
  const mine = chats.filter((c) => c.claimed);

  // Customer context: live data for the browser's signed-in customer, sample data for the others.
  const live = user && cur?.customerId === user.id;
  const customer = live ? user : CUSTOMERS.find((x) => x.id === cur?.customerId);
  const theirOrders = orders.filter((o) => o.customer.id === cur?.customerId);
  const cart = live ? cartLines.map((l) => `${l.p.name} × ${l.qty}`) : cur?.cart || [];
  const wish = live ? wishlist.map((id) => product(id)?.name).filter(Boolean) : cur?.wish || [];

  return (
    <StaffLayout role="support" active="staff/support" title="Live chats">
      <div className="support">
        <section aria-label="Chat queue" className="queue stack">
          <h2>Waiting ({waiting.length})</h2>
          {waiting.length === 0 && <span className="muted small">No one is waiting.</span>}
          {waiting.map((c) => (
            <div key={c.id} className="stack" style={{ gap: 4 }}>
              {queueItem(c)}
              <button type="button" className="btn btn-sm btn-primary" onClick={() => claim(c.id)}>Claim</button>
            </div>
          ))}
          <h2>My chats ({mine.length})</h2>
          {mine.map(queueItem)}
        </section>

        {cur && (
          <section aria-label="Conversation" className="convo">
            <div className="convo-head row" style={{ gap: 4, columnGap: 12 }}>
              <strong>{cur.name}</strong>
              <span className="muted small">Started on {cur.started}</span>
            </div>
            <div className="msgs" aria-live="polite">
              {cur.msgs.map((m, n) => <Msg key={n} m={m} mine={m.from === 'agent'} who={m.from === 'agent' ? 'You' : cur.name} />)}
            </div>
            {cur.claimed ? (
              <Composer onSend={reply} placeholder="Type a reply" />
            ) : (
              <div className="row" style={{ padding: '10px 14px', borderTop: '1px solid #ddd', background: '#f5f5f5' }}>
                <span className="grow small">Claim this chat to reply.</span>
                <button type="button" className="btn btn-primary" onClick={() => claim(cur.id)}>Claim</button>
              </div>
            )}
          </section>
        )}

        <section aria-label="Customer details" className="card stack context">
          <h2>Customer details</h2>
          {!customer ? (
            <p className="muted">Guest, not signed in. No orders or wishlist are linked. Ask the customer to sign in if you need them.</p>
          ) : (
            <>
              <div className="stack" style={{ gap: 2 }}>
                <strong>{customer.name}</strong>
                <span>{customer.email}</span>
                <span className="muted">Customer {customer.id}</span>
              </div>
              <h3>Orders &amp; delivery status</h3>
              {theirOrders.length === 0 && <span className="muted">None</span>}
              {theirOrders.map((o) => <span key={o.id}>{o.id} · {STATUS[o.status].label}</span>)}
              <h3>Cart</h3>
              {cart.length ? cart.map((x) => <span key={x}>{x}</span>) : <span className="muted">Empty</span>}
              <h3>Wishlist</h3>
              {wish.length ? wish.map((x) => <span key={x}>{x}</span>) : <span className="muted">Empty</span>}
            </>
          )}
        </section>
      </div>
    </StaffLayout>
  );
}
