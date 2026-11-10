// Short confirmation messages that pop up in the corner.
import { createSlice } from '@reduxjs/toolkit';

let serial = 0;
const toastSlice = createSlice({
  name: 'toasts',
  initialState: [],
  reducers: {
    say: {
      reducer: (list, { payload }) => {
        list.push(payload);
      },
      prepare: (text, tone = 'good') => ({ payload: { id: ++serial, text, tone } }),
    },
    dismiss: (list, { payload }) => list.filter((t) => t.id !== payload),
  },
});

export const { say, dismiss } = toastSlice.actions;
export default toastSlice.reducer;
