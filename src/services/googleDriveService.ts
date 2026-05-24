import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportBackup } from './storage';

WebBrowser.maybeCompleteAuthSession();

// ─── Google OAuth Config ──────────────────────────────
const WEB_CLIENT_ID = '894359346854-rcd6svv64utf86sj3lslpfo89alhcvsl.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '894359346854-7l3dgk48iv260reefgsb96l0mepfb3vu.apps.googleusercontent.com';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const GDRIVE_TOKEN_KEY = '@ims_gdrive_token';
const GDRIVE_USER_KEY = '@ims_gdrive_user';

// ─── Token Management ─────────────────────────────────
export async function getStoredGoogleUser(): Promise<{ name: string; email: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(GDRIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function storeToken(accessToken: string): Promise<void> {
  await AsyncStorage.setItem(GDRIVE_TOKEN_KEY, accessToken);
}

async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(GDRIVE_TOKEN_KEY);
}

// ─── Sign In ──────────────────────────────────────────
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    scopes: SCOPES,
    // Modern way to handle redirects in Expo 50+
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'installment'
    }),
  });

  const signIn = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!request) {
        return { success: false, error: 'Authorization request not ready.' };
      }

      const result = await promptAsync();

      if (result.type === 'success' && result.authentication?.accessToken) {
        const token = result.authentication.accessToken;
        await storeToken(token);

        // Fetch user info
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userInfo = await userInfoRes.json();
        await AsyncStorage.setItem(GDRIVE_USER_KEY, JSON.stringify({
          name: userInfo.name || userInfo.email,
          email: userInfo.email,
        }));

        return { success: true };
      }
      
      return { success: false, error: 'Sign-in was cancelled or failed.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Google Sign-In failed.' };
    }
  };

  return { signIn, requestReady: !!request };
}

// ─── Sign Out ─────────────────────────────────────────
export async function signOutGoogle(): Promise<void> {
  await AsyncStorage.multiRemove([GDRIVE_TOKEN_KEY, GDRIVE_USER_KEY]);
}

// ─── Google Drive Helpers ─────────────────────────────
async function getOrCreateFolder(token: string, folderName: string): Promise<string> {
  // Search for existing folder
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function uploadFile(
  token: string,
  folderId: string,
  fileName: string,
  content: string,
  mimeType: string = 'application/json'
): Promise<boolean> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  // First, delete any existing file with the same name in the folder
  const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const existing = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const existingData = await existing.json();
  if (existingData.files) {
    for (const file of existingData.files) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // Multipart upload
  const boundary = 'ims_backup_boundary';
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  return uploadRes.ok;
}

// ─── Main Backup Function ─────────────────────────────
export async function backupToGoogleDrive(
  onProgress?: (status: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getStoredToken();
    if (!token) {
      return { success: false, error: 'Not connected to Google. Please connect your Google account first.' };
    }

    onProgress?.('Creating backup folder on Google Drive...');
    const folderId = await getOrCreateFolder(token, 'IMS Backup');

    onProgress?.('Exporting local database...');
    const backupData = await exportBackup();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `IMS_Backup_${timestamp}.json`;

    onProgress?.('Uploading database to Google Drive...');
    const uploaded = await uploadFile(token, folderId, fileName, backupData);

    // Also upload a "latest" copy for easy restore
    await uploadFile(token, folderId, 'IMS_Latest_Backup.json', backupData);

    if (uploaded) {
      return { success: true };
    } else {
      return { success: false, error: 'Upload failed. Your Google token may have expired. Please reconnect.' };
    }
  } catch (e: any) {
    if (e.message?.includes('401') || e.message?.includes('403')) {
      await AsyncStorage.removeItem(GDRIVE_TOKEN_KEY);
      return { success: false, error: 'Google session expired. Please reconnect your account.' };
    }
    return { success: false, error: e.message || 'Backup failed.' };
  }
}

// ─── Restore from Google Drive ────────────────────────
export async function getLatestBackupFromDrive(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const token = await getStoredToken();
    if (!token) {
      return { success: false, error: 'Not connected to Google.' };
    }

    const query = `name='IMS_Latest_Backup.json' and trashed=false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    if (!data.files || data.files.length === 0) {
      return { success: false, error: 'No backup found on Google Drive.' };
    }

    const fileId = data.files[0].id;
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const content = await fileRes.text();

    return { success: true, data: content };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to fetch backup from Google Drive.' };
  }
}
