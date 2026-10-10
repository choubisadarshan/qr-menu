export function manifestResponse({ name, short, start, app, color }) {
  const icon = (size, purpose) => ({
    src: `/pwa-icon?size=${size}&app=${app}`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose,
  });
  return new Response(
    JSON.stringify({
      id: start,
      name,
      short_name: short,
      start_url: start,
      scope: start, // each app only covers its own section (/kitchen or /owner)
      display: 'standalone',
      background_color: color,
      theme_color: color,
      icons: [icon(192, 'any'), icon(512, 'any'), icon(512, 'maskable')],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}