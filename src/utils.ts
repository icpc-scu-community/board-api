import crypto from 'crypto';

export function parseVerdict(verdict: string) {
  const v = verdict.trim().toLowerCase();
  if (v === 'accepted') return 'AC';
  else if (v.includes('wrong answer')) return 'WA';
  else if (v.includes('time limit')) return 'TLE';
  else if (v.includes('memory limit')) return 'MLE';
  else if (v.includes('runtime error')) return 'RTE';
  else if (v.includes('compilation')) return 'CE';
  else return 'OTHERS';
}

export function toSHA1base64(data: string): string {
  return crypto.createHash('sha1').update(data).digest('base64');
}
