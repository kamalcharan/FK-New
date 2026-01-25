// src/store/slices/loansSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Loan } from '../../types';

interface LoansState {
  loans: Loan[];
  isLoading: boolean;
}

const initialState: LoansState = {
  loans: [],
  isLoading: false,
};

const loansSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    setLoans: (state, action: PayloadAction<Loan[]>) => {
      state.loans = action.payload;
    },
    addLoan: (state, action: PayloadAction<Loan>) => {
      state.loans.unshift(action.payload);
    },
    updateLoan: (state, action: PayloadAction<{ id: string; updates: Partial<Loan> }>) => {
      const index = state.loans.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.loans[index] = { ...state.loans[index], ...action.payload.updates };
      }
    },
    removeLoan: (state, action: PayloadAction<string>) => {
      state.loans = state.loans.filter(l => l.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearLoans: (state) => {
      state.loans = [];
    },
  },
});

export const { setLoans, addLoan, updateLoan, removeLoan, setLoading, clearLoans } = loansSlice.actions;
export default loansSlice.reducer;
