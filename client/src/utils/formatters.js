/**
 * Utility formatters for PocketGuard
 */

// Format numbers as Indian Rupee (₹)
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}₹${formatted}`;
};

// Format date into human-readable string
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
};

// Format time into HH:MM AM/PM
export const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};

// Get initials from a person's name
export const getInitials = (name) => {
  if (!name) return 'PG';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
