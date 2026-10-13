export const CONFIG = {
  name: 'myUdaipurcafe', // change per restaurant
  currency: '₹',
  taxRate: 0.05,
  help: '', // optional: a link for "Need a hand?" in the owner sidebar, e.g. 'https://wa.me/91XXXXXXXXXX' or 'mailto:you@example.com'
};

export const money = (n) =>
  CONFIG.currency +
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });