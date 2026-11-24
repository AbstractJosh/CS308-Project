export const EMPTY_PRODUCT_FORM = {
  name: '',
  model: '',
  serialNumber: '',
  description: '',
  categoryId: '',
  price: '',
  cost: '',
  quantityInStock: '',
  warrantyStatus: '',
  distributor: '',
};

export function toProductForm(product) {
  return {
    name: product.name ?? '',
    model: product.model ?? '',
    serialNumber: product.serialNumber ?? '',
    description: product.description ?? '',
    categoryId: product.categoryId == null ? '' : String(product.categoryId),
    price: product.price == null ? '' : String(product.price),
    cost: product.cost == null ? '' : String(product.cost),
    quantityInStock: product.quantityInStock == null ? '' : String(product.quantityInStock),
    warrantyStatus: product.warrantyStatus ?? '',
    distributor: product.distributor ?? '',
  };
}

function textError(value, label, max) {
  const text = value.trim();
  if (!text) return `${label} is required`;
  if (max && text.length > max) return `${label} must be at most ${max} characters`;
  return null;
}

function isNumberZeroOrMore(value) {
  const text = value.trim();
  return text !== '' && Number.isFinite(Number(text)) && Number(text) >= 0;
}

export function validateProductForm(form) {
  const errors = {};

  const textRules = [
    ['name', 'Name', 150],
    ['model', 'Model', 100],
    ['serialNumber', 'Serial number', 60],
    ['description', 'Description', null],
    ['warrantyStatus', 'Warranty', 100],
    ['distributor', 'Distributor', 150],
  ];
  for (const [field, label, max] of textRules) {
    const message = textError(form[field], label, max);
    if (message) errors[field] = message;
  }

  if (!form.categoryId) errors.categoryId = 'Choose a category';

  if (!form.price.trim()) errors.price = 'Price is required';
  else if (!isNumberZeroOrMore(form.price)) errors.price = 'Price must be a number, 0 or more';

  if (form.cost.trim() && !isNumberZeroOrMore(form.cost)) errors.cost = 'Cost must be a number, 0 or more';

  const stock = form.quantityInStock.trim();
  if (!stock) errors.quantityInStock = 'Stock is required';
  else if (!/^\d+$/.test(stock)) errors.quantityInStock = 'Stock must be a whole number, 0 or more';

  return errors;
}

export function toProductBody(form) {
  return {
    name: form.name.trim(),
    model: form.model.trim(),
    serialNumber: form.serialNumber.trim(),
    description: form.description.trim(),
    categoryId: Number(form.categoryId),
    price: Number(form.price),
    cost: form.cost.trim() === '' ? null : Number(form.cost),
    quantityInStock: Number(form.quantityInStock),
    warrantyStatus: form.warrantyStatus.trim(),
    distributor: form.distributor.trim(),
  };
}
