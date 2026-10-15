import { ImageResponse } from 'next/og';

// App icon used by the PWA manifests and browser tabs.
// The café cup (same mark as the dashboard logo): green for the owner app, deep teal for the kitchen app.
export function GET(req) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Math.max(Number(searchParams.get('size')) || 192, 16), 1024);
  const owner = searchParams.get('app') === 'owner';
  const bg = owner ? '#1B5E3B' : '#0f3d3e';
  const cup = Math.round(size * 0.56); // keeps the cup inside the "maskable" safe zone

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          color: '#f6efe2',
        }}
      >
        <svg width={cup} height={cup} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <path d="M7 1v3M11 1v3M15 1v3" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
