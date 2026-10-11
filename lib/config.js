export const CONFIG = {
  name: 'myUdaipurcafe', // change per restaurant
  currency: '₹',
  taxRate: 0.05,
};

export const money = (n) =>
  CONFIG.currency +
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });