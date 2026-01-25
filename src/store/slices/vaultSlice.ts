import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { VaultItem } from '../../types';

interface VaultState {
  items: VaultItem[];
  isLoading: boolean;
}

const initialState: VaultState = {
  items: [],
  isLoading: false,
};

const vaultSlice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<VaultItem[]>) => {
      state.items = action.payload;
    },
    addItem: (state, action: PayloadAction<VaultItem>) => {
      state.items.unshift(action.payload);
    },
    updateItem: (state, action: PayloadAction<{ id: string; updates: Partial<VaultItem> }>) => {
      const index = state.items.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload.updates };
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearItems: (state) => {
      state.items = [];
    },
  },
});

export const { setItems, addItem, updateItem, removeItem, setLoading, clearItems } = vaultSlice.actions;
export default vaultSlice.reducer;
