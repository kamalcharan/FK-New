// src/lib/googleAuth.ts
// Google OAuth and Drive integration for FamilyKnows

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseReady } from './supabase';

// Complete the auth session when the app redirects back
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
// You'll need to create credentials at https://console.cloud.google.com/
// 1. Create OAuth 2.0 Client ID (Web application)
// 2. Add authorized redirect URIs:
//    - For Expo Go: https://auth.expo.io/@your-username/familyknows
//    - For standalone: familyknows://auth/callback
// 3. Enable Google Drive API in the console

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID;

// Expo username for auth proxy (update this to your Expo username)
const EXPO_USERNAME = process.env.EXPO_PUBLIC_EXPO_USERNAME || 'kamalcharan';

// Discovery document for Google OAuth
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Scopes we need:
// - openid, profile, email: Standard OAuth scopes for user info
// - drive.file: Access to files created by the app (for backup/restore) - ADD LATER after verification
const SCOPES = [
  'openid',
  'profile',
  'email',
  // 'https://www.googleapis.com/auth/drive.file', // Temporarily disabled - requires app verification
];

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
console.log('[GoogleAuth] App ownership:', Constants.appOwnership, 'isExpoGo:', isExpoGo);

// Get the appropriate redirect URI based on platform and environment
export const getRedirectUri = () => {
  // For Expo Go, we MUST use the Expo auth proxy because Google doesn't accept exp:// URIs
  // The proxy URL must be registered in Google Cloud Console
  const proxyUri = `https://auth.expo.io/@${EXPO_USERNAME}/familyknows`;

  // Always log both URIs for debugging
  const nativeUri = AuthSession.makeRedirectUri({
    scheme: 'familyknows',
    path: 'auth/callback',
  });

  console.log('[GoogleAuth] Native redirect URI:', nativeUri);
  console.log('[GoogleAuth] Proxy redirect URI:', proxyUri);
  console.log('[GoogleAuth] Using proxy:', isExpoGo);

  // For Expo Go, always use the proxy
  if (isExpoGo) {
    return proxyUri;
  }

  // For standalone/dev builds, use the custom scheme
  return nativeUri;
};

// Get the redirect URI for setup reference
export const getExpoProxyRedirectUri = () => {
  return `https://auth.expo.io/@${EXPO_USERNAME}/familyknows`;
};

// Check if Google auth is configured
export const isGoogleAuthConfigured = () => {
  return GOOGLE_CLIENT_ID.length > 0;
};

// Google Auth hook for use in components
export const useGoogleAuth = () => {
  const redirectUri = getRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline', // Get refresh token
        prompt: 'consent',      // Always show consent screen to get refresh token
      },
    },
    discovery
  );

  // For Expo Go, we need to use the proxy
  const wrappedPromptAsync = async (options?: AuthSession.AuthRequestPromptOptions) => {
    if (isExpoGo) {
      // Use promptAsync with useProxy for Expo Go
      return promptAsync({ useProxy: true, ...options });
    }
    return promptAsync(options);
  };

  return { request, response, promptAsync: wrappedPromptAsync, redirectUri };
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
} | null> => {
  try {
    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[GoogleAuth] Token exchange failed:', error);
      return null;
    }

    const tokens = await tokenResponse.json();
    return tokens;
  } catch (error) {
    console.error('[GoogleAuth] Token exchange error:', error);
    return null;
  }
};

// Sign in to Supabase with Google ID token
export const signInWithGoogleToken = async (idToken: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  return data;
};

// Get user info from Google
export const getGoogleUserInfo = async (accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
} | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[GoogleAuth] Failed to get user info');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleAuth] User info error:', error);
    return null;
  }
};

// ============================================
// Google Drive Functions
// ============================================

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// FamilyKnows backup folder name
const BACKUP_FOLDER_NAME = 'FamilyKnows Backups';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

// Find or create the backup folder
export const getOrCreateBackupFolder = async (accessToken: string): Promise<string | null> => {
  try {
    // Search for existing folder
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      console.error('[Drive] Failed to search for folder');
      return null;
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create new folder
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createResponse.ok) {
      console.error('[Drive] Failed to create folder');
      return null;
    }

    const createData = await createResponse.json();
    return createData.id;
  } catch (error) {
    console.error('[Drive] Folder error:', error);
    return null;
  }
};

// List backup files in the folder
export const listBackupFiles = async (
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> => {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('[Drive] Failed to list files');
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('[Drive] List error:', error);
    return [];
  }
};

// Upload backup file
export const uploadBackupFile = async (
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string
): Promise<DriveFile | null> => {
  try {
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    // Create multipart request
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Drive] Upload failed:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Drive] Upload error:', error);
    return null;
  }
};

// Download backup file
export const downloadBackupFile = async (
  accessToken: string,
  fileId: string
): Promise<string | null> => {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('[Drive] Download failed');
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('[Drive] Download error:', error);
    return null;
  }
};

// Delete backup file
export const deleteBackupFile = async (
  accessToken: string,
  fileId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.ok || response.status === 204;
  } catch (error) {
    console.error('[Drive] Delete error:', error);
    return false;
  }
};

// ============================================
// Token Storage (using Supabase user metadata)
// ============================================

export const storeGoogleTokens = async (tokens: {
  access_token: string;
  refresh_token?: string;
}) => {
  if (!supabase) return;

  const { error } = await supabase.auth.updateUser({
    data: {
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_updated_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('[GoogleAuth] Failed to store tokens:', error);
  }
};

export const getStoredGoogleTokens = async (): Promise<{
  access_token: string | null;
  refresh_token: string | null;
} | null> => {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.user_metadata) return null;

  return {
    access_token: user.user_metadata.google_access_token || null,
    refresh_token: user.user_metadata.google_refresh_token || null,
  };
};

// Refresh access token using refresh token
export const refreshGoogleAccessToken = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      console.error('[GoogleAuth] Token refresh failed');
      return null;
    }

    const data = await response.json();

    // Store the new access token
    await storeGoogleTokens({
      access_token: data.access_token,
      refresh_token: refreshToken, // Keep the same refresh token
    });

    return data.access_token;
  } catch (error) {
    console.error('[GoogleAuth] Refresh error:', error);
    return null;
  }
};
