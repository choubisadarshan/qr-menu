import { manifestResponse } from '@/lib/manifest';

export function GET() {
  return manifestResponse({
    name: 'Owner Panel',
    short: 'Owner',
    start: '/owner',
    app: 'owner',
    color: '#1d1b19',
  });
}