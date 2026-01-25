// src/store/slices/workspaceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Workspace, WorkspaceMember } from '../../types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  members: [],
  isLoading: false,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload;
    },
    setMembers: (state, action: PayloadAction<WorkspaceMember[]>) => {
      state.members = action.payload;
    },
    addMember: (state, action: PayloadAction<WorkspaceMember>) => {
      state.members.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearWorkspace: (state) => {
      state.currentWorkspace = null;
      state.members = [];
    },
  },
});

export const { setWorkspace, setMembers, addMember, setLoading, clearWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
