import { manifestResponse } from '@/lib/manifest';
import { CONFIG } from '@/lib/config';

export function GET() {
  return manifestResponse({
    name: `${CONFIG.name} Kitchen`,
    short: 'Kitchen',
    start: '/kitchen',
    app: 'kitchen',
    color: '#b24a1d',
  });
}