const STATUSES = {
  PROCESSING: { label: 'Processing', className: 'status-processing' },
  IN_TRANSIT: { label: 'In transit', className: 'status-in-transit' },
  DELIVERED: { label: 'Delivered', className: 'status-delivered' },
  CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
};

export default function OrderStatusPill({ status }) {
  const known = STATUSES[status] ?? { label: status, className: '' };
  return <span className={`status-pill ${known.className}`.trim()}>{known.label}</span>;
}
