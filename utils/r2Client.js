import { S3Client } from '@aws-sdk/client-s3';
import { R2_CONFIG } from '../config/r2Config';

export const r2Client = new S3Client({
  region: R2_CONFIG.region,
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true // Required for R2
});
