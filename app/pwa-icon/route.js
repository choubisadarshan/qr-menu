import { ImageResponse } from 'next/og';

export function GET(req) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Math.max(Number(searchParams.get('size')) || 192, 48), 1024);
  const owner = searchParams.get('app') === 'owner';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: owner ? '#1d1b19' : '#a63a0a',
          color: '#ffffff',
          fontSize: size * 0.5,
          fontWeight: 700,
        }}
      >
        {owner ? 'O' : 'K'}
      </div>
    ),
    { width: size, height: size }
  );
}