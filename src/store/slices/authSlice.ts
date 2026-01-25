// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, Session } from '../../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedOnboarding = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, setSession, setLoading, setOnboardingComplete, logout } = authSlice.actions;
export default authSlice.reducer;
