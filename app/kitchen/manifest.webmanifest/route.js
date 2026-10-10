import { manifestResponse } from '@/lib/manifest';

export function GET() {
  return manifestResponse({
    name: 'Kitchen Orders',
    short: 'Kitchen',
    start: '/kitchen',
    app: 'kitchen',
    color: '#a63a0a',
  });
}