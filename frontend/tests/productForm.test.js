import { describe, it, expect } from 'vitest';
import {
  EMPTY_PRODUCT_FORM,
  toProductBody,
  toProductForm,
  validateProductForm,
} from '../src/pages/admin/productForm.js';

const validForm = {
  name: 'Jura E6 Piano Black',
  model: 'E6 (EC)',
  serialNumber: 'CRM-AM-2001',
  description: 'Fully automatic bean-to-cup machine.',
  categoryId: '2',
  price: '79999',
  cost: '',
  quantityInStock: '7',
  warrantyStatus: '2 years manufacturer warranty',
  distributor: 'Jura official distributor',
};

describe('validateProductForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validateProductForm(validForm)).toEqual({});
    expect(validateProductForm({ ...validForm, cost: '39999.5' })).toEqual({});
  });

  it('reports each required field when the form is empty', () => {
    expect(validateProductForm(EMPTY_PRODUCT_FORM)).toEqual({
      name: 'Name is required',
      model: 'Model is required',
      serialNumber: 'Serial number is required',
      description: 'Description is required',
      warrantyStatus: 'Warranty is required',
      distributor: 'Distributor is required',
      categoryId: 'Choose a category',
      price: 'Price is required',
      quantityInStock: 'Stock is required',
    });
  });

  it('treats text with only spaces as empty and checks the length limits', () => {
    const errors = validateProductForm({ ...validForm, name: '   ', model: 'x'.repeat(101) });
    expect(errors.name).toBe('Name is required');
    expect(errors.model).toBe('Model must be at most 100 characters');
  });

  it('rejects a negative price, a cost that is not a number and a stock like 2.5', () => {
    expect(validateProductForm({ ...validForm, price: '-1', cost: 'abc', quantityInStock: '2.5' })).toEqual({
      price: 'Price must be a number, 0 or more',
      cost: 'Cost must be a number, 0 or more',
      quantityInStock: 'Stock must be a whole number, 0 or more',
    });
  });

  it('accepts an empty cost and a price or stock of 0', () => {
    expect(validateProductForm({ ...validForm, cost: '', price: '0', quantityInStock: '0' })).toEqual({});
  });
});

describe('toProductBody', () => {
  it('trims the text, converts the numbers and turns an empty cost into null', () => {
    const body = toProductBody({ ...validForm, name: '  Jura E6 Piano Black  ', price: '79999.90' });
    expect(body).toEqual({
      name: 'Jura E6 Piano Black',
      model: 'E6 (EC)',
      serialNumber: 'CRM-AM-2001',
      description: 'Fully automatic bean-to-cup machine.',
      categoryId: 2,
      price: 79999.9,
      cost: null,
      quantityInStock: 7,
      warrantyStatus: '2 years manufacturer warranty',
      distributor: 'Jura official distributor',
    });
    expect(toProductBody({ ...validForm, cost: '40000' }).cost).toBe(40000);
  });
});

describe('toProductForm', () => {
  it('turns a product into form strings', () => {
    const category = { id: 2, name: 'Fully Automatic Machines' };
    const product = { id: 9, ...toProductBody(validForm), cost: null, category };
    expect(toProductForm(product)).toEqual(validForm);
  });
});
