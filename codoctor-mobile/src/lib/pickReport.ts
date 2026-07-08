// Shared logic for attaching a previous medical report: let the user pick a
// photo (camera or gallery) or a PDF, upload it to /extract-report, and return
// the structured extraction. Used by both the Doctor and Patient screens.

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { extractReport, type ReportExtract } from './api';

export interface PickResult {
  extract: ReportExtract | null;
  cancelled: boolean;
}

const CANCELLED: PickResult = { extract: null, cancelled: true };

async function upload(uri: string, mime: string, name: string): Promise<PickResult> {
  const extract = await extractReport(uri, mime, name);
  if (!extract) {
    Alert.alert(
      'Could not read the report',
      'The document could not be read (it may be unclear, or the server is busy). You can still continue without it.'
    );
    return { extract: null, cancelled: false };
  }
  return { extract, cancelled: false };
}

/** Take a photo of a paper report with the camera. */
export async function captureReportPhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera needed', 'Allow camera access to photograph the report.');
    return CANCELLED;
  }
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (res.canceled || !res.assets?.length) return CANCELLED;
  const a = res.assets[0];
  return upload(a.uri, a.mimeType ?? 'image/jpeg', a.fileName ?? 'report.jpg');
}

/** Pick an existing photo of a report from the gallery. */
export async function pickReportImage(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return CANCELLED;
  const a = res.assets[0];
  return upload(a.uri, a.mimeType ?? 'image/jpeg', a.fileName ?? 'report.jpg');
}

/** Pick a PDF report. */
export async function pickReportPdf(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return CANCELLED;
  const a = res.assets[0];
  return upload(a.uri, a.mimeType ?? 'application/pdf', a.name ?? 'report.pdf');
}
