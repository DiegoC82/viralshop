// frontend/src/utils/formatters.ts

export const formatCurrency = (amount: number, currency: 'ARS' | 'USD', currentExchangeRate: number) => {
  let finalAmount = amount;

  // Si el usuario elige USD, dividimos el precio por la cotización en VIVO
  if (currency === 'USD') {
    finalAmount = amount / currentExchangeRate;
  }

  // Aplica el formato de punto y coma (ej. 1.000.000,00)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finalAmount).replace(/\s/g, ''); 
};