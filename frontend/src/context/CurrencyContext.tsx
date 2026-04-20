import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const CurrencyContext = createContext<any>(null);

export const CurrencyProvider = ({ children }: any) => {
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  // Empezamos con un valor de rescate por si la app arranca sin internet
  const [exchangeRate, setExchangeRate] = useState(1200); 

  useEffect(() => {
    // 1. Cargamos la moneda que el usuario prefiera
    AsyncStorage.getItem('preferredCurrency').then(val => {
      if (val) setCurrency(val as 'ARS' | 'USD');
    });

    // 2. 👇 CONEXIÓN A LA API EN TIEMPO REAL 👇
    const fetchLiveRate = async () => {
      try {
        // Pedimos la cotización de venta del dólar blue
        const response = await axios.get('https://dolarapi.com/v1/dolares/blue');
        if (response.data && response.data.venta) {
          setExchangeRate(response.data.venta);
        }
      } catch (error) {
        console.error("No se pudo conectar a DolarAPI, usando cotización de respaldo", error);
      }
    };

    fetchLiveRate();
  }, []);

  const toggleCurrency = async () => {
    const newCurrency = currency === 'ARS' ? 'USD' : 'ARS';
    setCurrency(newCurrency);
    await AsyncStorage.setItem('preferredCurrency', newCurrency);
  };

  return (
    // Ahora también exportamos el exchangeRate dinámico
    <CurrencyContext.Provider value={{ currency, toggleCurrency, exchangeRate }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);