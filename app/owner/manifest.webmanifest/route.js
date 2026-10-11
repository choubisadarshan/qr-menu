import { manifestResponse } from '@/lib/manifest';
import { CONFIG } from '@/lib/config';

export function GET() {
  return manifestResponse({
    name: `${CONFIG.name} Owner`,
    short: 'Owner',
    start: '/owner',
    app: 'owner',
    color: '#17434b',
  });
}