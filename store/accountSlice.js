// The signed-in account. Filled when /session answers, cleared on sign-out,
// so any screen can read it with useSelector(selectAccount).
import { createSlice } from '@reduxjs/toolkit';
import { messApi } from './api';

const accountSlice = createSlice({
  name: 'account',
  initialState: { current: null, demoClock: false },
  reducers: {
    signedOut: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(messApi.endpoints.session.matchFulfilled, (state, { payload }) => {
      state.current = payload.account;
      state.demoClock = payload.demoClock;
    });
    builder.addMatcher(messApi.endpoints.signIn.matchFulfilled, (state, { payload }) => {
      state.current = payload.account;
    });
  },
});

export const { signedOut } = accountSlice.actions;
export const selectAccount = (s) => s.account.current;
export default accountSlice.reducer;
