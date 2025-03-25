import * as FileSystem from 'expo-file-system';

export const testNetworkSpeed = async (onProgress) => {
  const serverName = 'Cloudflare Speed Test Server';
  const downloadUrl = 'https://speed.cloudflare.com/__down?bytes=10000000'; // Cloudflare's trusted endpoint for download speed test
  const uploadUrl = 'https://postman-echo.com/post'; // Postman's trusted endpoint for upload speed test
  const testFileUri = FileSystem.documentDirectory + 'testUploadFile.txt';

  // Create a test file for upload
  await FileSystem.writeAsStringAsync(testFileUri, 'This is a test file for upload speed measurement.');

  // Measure download speed
  const startDownload = Date.now();
  await FileSystem.downloadAsync(downloadUrl, FileSystem.documentDirectory + 'testDownloadFile.bin');
  const endDownload = Date.now();
  const downloadSpeed = (10 * 8) / ((endDownload - startDownload) / 1000); // Mbps
  onProgress({ type: 'download', speed: downloadSpeed });

  // Measure upload speed
  const startUpload = Date.now();
  const response = await FileSystem.uploadAsync(uploadUrl, testFileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  const endUpload = Date.now();
  const uploadSpeed = (response.body.length * 8) / ((endUpload - startUpload) / 1000); // Mbps
  onProgress({ type: 'upload', speed: uploadSpeed });

  // Measure latency
  const latencyStart = Date.now();
  await fetch('https://speed.cloudflare.com/__down?bytes=1');
  const latencyEnd = Date.now();
  const latency = latencyEnd - latencyStart; // ms
  onProgress({ type: 'latency', value: latency });

  // Measure jitter (variation in latency)
  const jitterTests = [];
  for (let i = 0; i < 5; i++) {
    const jitterStart = Date.now();
    await fetch('https://speed.cloudflare.com/__down?bytes=1');
    const jitterEnd = Date.now();
    jitterTests.push(jitterEnd - jitterStart);
  }
  const jitter = Math.max(...jitterTests) - Math.min(...jitterTests); // ms
  onProgress({ type: 'jitter', value: jitter });

  // Clean up test files
  await FileSystem.deleteAsync(testFileUri, { idempotent: true });
  await FileSystem.deleteAsync(FileSystem.documentDirectory + 'testDownloadFile.bin', { idempotent: true });

  return { downloadSpeed, uploadSpeed, latency, jitter, serverName };
};
