// The Redux store: our three slices plus the RTK Query cache.
import { configureStore } from '@reduxjs/toolkit';
import { messApi } from './api';
import account from './accountSlice';
import basket from './basketSlice';
import toasts from './toastSlice';

export const buildStore = () =>
  configureStore({
    reducer: { account, basket, toasts, [messApi.reducerPath]: messApi.reducer },
    middleware: (defaults) => defaults().concat(messApi.middleware),
  });
