export * from './schemas.js';
export * from './sync.js';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const calculateTotals = (items) => {
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const taxTotal = items.reduce((acc, item) => acc + (item.quantity * item.price * (item.taxRate / 100)), 0);
  const discountTotal = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  
  return {
    subtotal,
    taxTotal,
    discountTotal,
    total: subtotal + taxTotal - discountTotal,
  };
};
