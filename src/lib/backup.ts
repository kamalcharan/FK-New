// src/lib/backup.ts
// Backup and restore functionality for FamilyKnows

import { supabase, isSupabaseReady } from './supabase';
import {
  getStoredGoogleTokens,
  refreshGoogleAccessToken,
  getOrCreateBackupFolder,
  listBackupFiles,
  uploadBackupFile,
  downloadBackupFile,
  deleteBackupFile,
  DriveFile,
} from './googleAuth';

export interface BackupData {
  version: string;
  created_at: string;
  workspace: {
    id: string;
    name: string;
  };
  loans: any[];
  insurance_policies: any[];
  renewals: any[];
  members: any[];
  invites: any[];
}

// Get a valid access token (refresh if needed)
const getValidAccessToken = async (): Promise<string | null> => {
  const tokens = await getStoredGoogleTokens();
  if (!tokens?.access_token) return null;

  // For simplicity, we'll try the current token first
  // In a production app, you'd check expiry and refresh proactively
  return tokens.access_token;
};

// Export workspace data to a backup object
export const exportWorkspaceData = async (workspaceId: string): Promise<BackupData | null> => {
  if (!supabase || !isSupabaseReady()) return null;

  try {
    // Fetch all data in parallel
    const [
      workspaceResult,
      loansResult,
      policiesResult,
      renewalsResult,
      membersResult,
      invitesResult,
    ] = await Promise.all([
      supabase.from('fk_workspaces').select('*').eq('id', workspaceId).single(),
      supabase.from('fk_loans').select('*').eq('workspace_id', workspaceId),
      supabase.from('fk_insurance_policies').select('*').eq('workspace_id', workspaceId),
      supabase.from('fk_renewals').select('*').eq('workspace_id', workspaceId),
      supabase.from('fk_workspace_members').select('*').eq('workspace_id', workspaceId),
      supabase.from('fk_invites').select('*').eq('workspace_id', workspaceId),
    ]);

    if (workspaceResult.error) throw workspaceResult.error;

    const backup: BackupData = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      workspace: {
        id: workspaceResult.data.id,
        name: workspaceResult.data.name,
      },
      loans: loansResult.data || [],
      insurance_policies: policiesResult.data || [],
      renewals: renewalsResult.data || [],
      members: membersResult.data || [],
      invites: invitesResult.data || [],
    };

    return backup;
  } catch (error) {
    console.error('[Backup] Export error:', error);
    return null;
  }
};

// Create a backup to Google Drive
export const createDriveBackup = async (workspaceId: string): Promise<DriveFile | null> => {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.error('[Backup] No access token available');
      return null;
    }

    // Get or create backup folder
    const folderId = await getOrCreateBackupFolder(accessToken);
    if (!folderId) {
      console.error('[Backup] Could not get backup folder');
      return null;
    }

    // Export data
    const backupData = await exportWorkspaceData(workspaceId);
    if (!backupData) {
      console.error('[Backup] Could not export data');
      return null;
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `FamilyKnows_${backupData.workspace.name}_${timestamp}.json`;

    // Upload to Drive
    const file = await uploadBackupFile(
      accessToken,
      folderId,
      fileName,
      JSON.stringify(backupData, null, 2)
    );

    return file;
  } catch (error) {
    console.error('[Backup] Create backup error:', error);
    return null;
  }
};

// List available backups from Google Drive
export const listDriveBackups = async (): Promise<DriveFile[]> => {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return [];

    const folderId = await getOrCreateBackupFolder(accessToken);
    if (!folderId) return [];

    return await listBackupFiles(accessToken, folderId);
  } catch (error) {
    console.error('[Backup] List error:', error);
    return [];
  }
};

// Download and parse a backup file
export const downloadBackup = async (fileId: string): Promise<BackupData | null> => {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return null;

    const content = await downloadBackupFile(accessToken, fileId);
    if (!content) return null;

    return JSON.parse(content) as BackupData;
  } catch (error) {
    console.error('[Backup] Download error:', error);
    return null;
  }
};

// Delete a backup from Google Drive
export const deleteDriveBackup = async (fileId: string): Promise<boolean> => {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return false;

    return await deleteBackupFile(accessToken, fileId);
  } catch (error) {
    console.error('[Backup] Delete error:', error);
    return false;
  }
};

// Restore workspace data from backup
// Note: This is a simplified version - production would need conflict resolution
export const restoreFromBackup = async (
  backup: BackupData,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  if (!supabase || !isSupabaseReady()) {
    return { success: false, message: 'Database not available' };
  }

  try {
    // This is a simplified restore - in production you'd want:
    // 1. Conflict resolution for existing records
    // 2. Transaction support
    // 3. Better error handling

    let restored = {
      loans: 0,
      policies: 0,
      renewals: 0,
    };

    // Restore loans (skip duplicates)
    for (const loan of backup.loans) {
      const { error } = await supabase
        .from('fk_loans')
        .upsert({
          ...loan,
          created_by: userId, // Use current user
        }, {
          onConflict: 'id',
        });

      if (!error) restored.loans++;
    }

    // Restore policies
    for (const policy of backup.insurance_policies) {
      const { error } = await supabase
        .from('fk_insurance_policies')
        .upsert({
          ...policy,
          created_by: userId,
        }, {
          onConflict: 'id',
        });

      if (!error) restored.policies++;
    }

    // Restore renewals
    for (const renewal of backup.renewals) {
      const { error } = await supabase
        .from('fk_renewals')
        .upsert({
          ...renewal,
          created_by: userId,
        }, {
          onConflict: 'id',
        });

      if (!error) restored.renewals++;
    }

    return {
      success: true,
      message: `Restored ${restored.loans} loans, ${restored.policies} policies, ${restored.renewals} renewals`,
    };
  } catch (error: any) {
    console.error('[Backup] Restore error:', error);
    return { success: false, message: error.message || 'Restore failed' };
  }
};

// Check if Google Drive backup is available
export const isDriveBackupAvailable = async (): Promise<boolean> => {
  const tokens = await getStoredGoogleTokens();
  return !!tokens?.access_token;
};
