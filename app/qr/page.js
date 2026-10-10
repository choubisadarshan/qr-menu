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
        QRCode.toDataURL(`${window.location.origin}/menu?table=${i + 1}`, { width: 320, margin: 1 })
      )
    ).then(setCodes);
  }, [tables]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <label htmlFor="n" className="font-medium">Number of tables</label>
        <input
          id="n"
          type="number"
          min={1}
          max={50}
          value={tables}
          onChange={(e) => setTables(e.target.value)}
          className="w-24 rounded-xl bg-chip p-2"
        />
        <button onClick={() => window.print()} className="rounded-full bg-accent px-5 py-2 font-semibold text-white">
          Print QR codes
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {codes.map((src, i) => (
          <div key={i} className="break-inside-avoid rounded-2xl border border-line bg-white p-4 text-center text-black">
            <div className="text-lg font-semibold">{CONFIG.name}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`QR code for table ${i + 1}`} className="mx-auto" />
            <div className="text-2xl font-bold">Table {i + 1}</div>
            <div className="text-sm">Scan to see the menu and order</div>
          </div>
        ))}
      </div>
    </main>
  );
}