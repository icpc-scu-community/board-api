import crypto from 'crypto';

export function toSHA1base64(data: string): string {
  return crypto.createHash('sha1').update(data).digest('base64');
}
