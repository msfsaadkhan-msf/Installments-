import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { exportBackup } from './storage';

const MAIN_FOLDER = 'IMS by MSF';
const BASE_DIR = `${FileSystem.documentDirectory}${MAIN_FOLDER}/`;

/**
 * Recursively adds files from a directory to the JSZip instance
 */
async function addDirectoryToZip(zip: JSZip, dirPath: string, zipPath: string = '') {
  const files = await FileSystem.readDirectoryAsync(dirPath);
  
  for (const fileName of files) {
    const fullPath = `${dirPath}${fileName}`;
    const info = await FileSystem.getInfoAsync(fullPath);
    
    if (info.isDirectory) {
      const folderZipPath = zipPath ? `${zipPath}/${fileName}` : fileName;
      const folder = zip.folder(folderZipPath);
      if (folder) {
        await addDirectoryToZip(zip, `${fullPath}/`, folderZipPath);
      }
    } else {
      const fileContent = await FileSystem.readAsStringAsync(fullPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileZipPath = zipPath ? `${zipPath}/${fileName}` : fileName;
      zip.file(fileZipPath, fileContent, { base64: true });
    }
  }
}

/**
 * Creates a structured ZIP backup and opens the native share sheet
 */
export async function createManualBackup(onProgress?: (progress: string) => void) {
  try {
    onProgress?.('Preparing data...');
    const zip = new JSZip();

    // 1. Add database.json
    const dbData = await exportBackup();
    zip.file('database.json', dbData);

    // 2. Add media files recursively
    onProgress?.('Adding media files...');
    const info = await FileSystem.getInfoAsync(BASE_DIR);
    if (info.exists && info.isDirectory) {
      await addDirectoryToZip(zip, BASE_DIR);
    }

    // 3. Generate ZIP
    onProgress?.('Generating ZIP archive...');
    const base64 = await zip.generateAsync({ type: 'base64' });
    
    // 4. Save ZIP to temporary file
    const zipPath = `${FileSystem.cacheDirectory}IMS_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    await FileSystem.writeAsStringAsync(zipPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 5. Share
    if (await Sharing.isAvailableAsync()) {
      onProgress?.('Opening share sheet...');
      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Share Backup Archive',
        UTI: 'public.zip-archive',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    return { success: true, path: zipPath };
  } catch (error: any) {
    console.error('Backup failed:', error);
    return { success: false, error: error.message || 'Unknown error during backup' };
  }
}
