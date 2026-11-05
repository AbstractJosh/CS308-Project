import { useState } from 'react';
import { useStore } from './store.jsx';
import { STATUS, fmt, priceOf } from './data.js';

export function StoreLayout({ active, children }) {
  const { user, setUser, cart } = useStore();
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const current = (name) => (active === name ? 'page' : undefined);
  return (
    <>
      <header className="site">
        <div className="inner">
          <a className="logo" href="#/shop">Crema &amp; Co.</a>
          <nav className="main" aria-label="Main">
            <a href="#/shop" aria-current={current('shop')}>Shop</a>
            <a href="#/orders" aria-current={current('orders')}>My orders</a>
            <a href="#/account" aria-current={current('account')}>Account &amp; wishlist</a>
          </nav>
          {user ? (
            <>
              <span className="muted">{user.name}</span>
              <a href="#/login" onClick={() => setUser(null)}>Sign out</a>
            </>
          ) : (
            <a href="#/login">Sign in</a>
          )}
          <a className={'btn' + (active === 'cart' ? ' btn-primary' : '')} href="#/cart">Cart ({count})</a>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <ChatWidget />
    </>
  );
}

const ROLES = {
  pm: ['Ayşe Koç', 'Product manager', [['staff/products', 'Products & stock'], ['staff/deliveries', 'Deliveries'], ['staff/comments', 'Comments']]],
  sales: ['Emre Yıldız', 'Sales manager', [['staff/pricing', 'Pricing & discounts'], ['staff/reports', 'Invoices & revenue'], ['staff/refunds', 'Refund requests']]],
  support: ['Derya Aksoy', 'Support agent', [['staff/support', 'Live chats']]],
};

export function StaffLayout({ role, active, title, actions, children }) {
  const { comments, refunds, chats } = useStore();
  const counts = {
    'staff/comments': comments.filter((c) => c.state === 'pending').length,
    'staff/refunds': refunds.filter((r) => r.state === 'pending' || r.state === 'awaiting').length,
    'staff/support': chats.filter((c) => !c.claimed).length,
  };
  const [person, roleName, links] = ROLES[role];
  return (
    <div className="staff">
      <aside>
        <div>
          <div className="logo">Crema &amp; Co. staff</div>
          <div className="muted small">{person} · {roleName}</div>
        </div>
        <nav aria-label={roleName}>
          {links.map(([href, label]) => (
            <a key={href} href={'#/' + href} aria-current={href === active ? 'page' : undefined}>
              {label}{counts[href] ? ` (${counts[href]})` : ''}
            </a>
          ))}
        </nav>
        <div className="role-switch">
          <span className="muted small">Prototype: switch role</span>
          <a href="#/staff/products">Product manager</a>
          <a href="#/staff/pricing">Sales manager</a>
          <a href="#/staff/support">Support agent</a>
          <a href="#/shop">Storefront</a>
        </div>
      </aside>
      <main>
        <div className="row">
          <h1 className="grow">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export const Price = ({ p, big }) => (
  <div className="row price">
    <strong style={{ fontSize: big ? 28 : 18 }}>{fmt(priceOf(p))}</strong>
    {p.discount > 0 && (
      <>
        <s className="muted">{fmt(p.price)}</s>
        <b className="bad small">−{p.discount}%</b>
      </>
    )}
  </div>
);

export const Stock = ({ p }) =>
  p.stock === 0 ? <b className="muted small">Out of stock</b>
  : p.stock <= 3 ? <b className="bad small">Only {p.stock} left in stock</b>
  : <b className="ok small">{p.stock} in stock</b>;

export const StatusBadge = ({ status }) => <span className={'badge ' + STATUS[status].cls}>{STATUS[status].label}</span>;

export function Qty({ value, min = 0, max, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="qty">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span>{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function Dialog({ label, children }) {
  return (
    <div className="overlay">
      <section role="dialog" aria-modal="true" aria-label={label} className="dialog">{children}</section>
    </div>
  );
}

export const Msg = ({ m, mine, who }) => (
  <div className={'msg' + (mine ? ' me' : '')}>
    {who && <div className="who">{who}</div>}
    {m.file && (
      <div className="file">
        Attachment: {m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.file}</a> : m.file}
      </div>
    )}
    {m.text}
  </div>
);

// Text box + file picker shared by the customer widget and the agent screen.
// Files stay in the browser (object URLs); the real app uploads them to the server.
export function Composer({ onSend, placeholder }) {
  const [draft, setDraft] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend({ text: draft.trim() });
    setDraft('');
  };
  const attach = (e) => {
    const f = e.target.files[0];
    if (f) onSend({ file: f.name, url: URL.createObjectURL(f), text: '' });
    e.target.value = '';
  };
  return (
    <form className="composer" onSubmit={submit}>
      <label className="attach" title="Attach a PDF, image or video">
        <span aria-hidden="true">+</span>
        <span className="sr-only">Attach a file</span>
        <input type="file" accept="application/pdf,image/*,video/*" onChange={attach} />
      </label>
      <input className="input" aria-label="Message" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button className="btn btn-primary">Send</button>
    </form>
  );
}

const GUEST_ID = 'guest-' + Math.floor(1000 + Math.random() * 9000);

export function ChatWidget() {
  const { user, chats, setChats } = useStore();
  const [open, setOpen] = useState(false);
  const id = user ? user.id : GUEST_ID;
  const chat = chats.find((c) => c.id === id);
  const send = (m) => {
    const msg = { from: 'customer', ...m };
    setChats((cs) =>
      cs.some((c) => c.id === id)
        ? cs.map((c) => (c.id === id ? { ...c, msgs: [...c.msgs, msg] } : c))
        : [...cs, { id, name: user ? user.name : 'Guest #' + id.slice(6), customerId: user?.id, guest: !user, claimed: false, started: location.hash.slice(2) || 'shop', msgs: [msg] }]
    );
  };
  if (!open) {
    return (
      <div className="chat-fab">
        <button type="button" className="btn btn-primary chat-open" onClick={() => setOpen(true)}>Chat with support</button>
      </div>
    );
  }
  return (
    <div className="chat-fab">
      <section className="chat" aria-label="Support chat">
        <div className="chat-head">
          <strong>Support chat</strong>
          <button type="button" className="icon-btn" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
        </div>
        <p className="chat-note">
          {user ? `Signed in as ${user.name}. The agent can see your profile, cart and orders.` : 'Chatting as a guest. Sign in so the agent can see your orders.'}
        </p>
        <div className="msgs" aria-live="polite">
          {!chat && <p className="muted small center">Ask us anything. An agent will join shortly.</p>}
          {chat && !chat.claimed && <p className="muted small center">Waiting for an agent…</p>}
          {chat?.msgs.map((m, n) => <Msg key={n} m={m} mine={m.from === 'customer'} />)}
        </div>
        <Composer onSend={send} placeholder="Type a message" />
      </section>
    </div>
  );
}
