'use client';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { buildStore } from '@/store';
import { Toasts } from './kit';

export default function Providers({ children }) {
  const [store] = useState(buildStore);
  // Lets phones install THE MESS. as an app (see public/sw.js).
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return (
    <Provider store={store}>
      {children}
      <Toasts />
    </Provider>
  );
}
