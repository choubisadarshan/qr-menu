'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CONFIG } from '@/lib/config';

export default function QrPage() {
  const [tables, setTables] = useState(6);
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    const n = Math.min(Math.max(Number(tables) || 1, 1), 50);
    Promise.all(
      Array.from({ length: n }, (_, i) =>
        QRCode.toDataURL(`${window.location.origin}/menu?table=${i + 1}`, {
          width: 360,
          margin: 1,
          color: { dark: '#17434b', light: '#ffffff' },
        })
      )
    ).then(setCodes);
  }, [tables]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <label htmlFor="n" className="font-medium">Number of tables</label>
        <input id="n" type="number" min={1} max={50} value={tables} onChange={(e) => setTables(e.target.value)}
          className="w-24 rounded-md bg-chip p-2" />
        <button onClick={() => window.print()} className="rounded-md bg-accent px-5 py-2 font-semibold text-on-accent">
          Print table stands
        </button>
      </div>

      {/* Table stands always print in light colours, whatever the screen theme */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {codes.map((src, i) => (
          <div key={i} className="break-inside-avoid border-2 border-[#17434b] bg-white p-1.5 text-[#231c17]">
            <div className="border border-[#17434b] px-4 py-5 text-center">
              <div className="font-display text-xl font-semibold leading-tight">{CONFIG.name}</div>
              <div className="mx-auto my-2 flex items-center justify-center gap-2 text-[#b24a1d]" aria-hidden="true">
                <span className="h-px w-8 bg-current" />
                <span className="text-[10px]">◆</span>
                <span className="h-px w-8 bg-current" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`QR code for table ${i + 1}`} className="mx-auto w-full max-w-[200px]" />
              <div className="mt-1 font-display text-3xl font-semibold">Table {i + 1}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                Scan to see the menu and order
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}