import { CONFIG } from '@/lib/config';

export const metadata = {
  title: { default: `Owner Dashboard · ${CONFIG.name}`, template: `%s · ${CONFIG.name}` },
  description: `Owner workspace for ${CONFIG.name}.`,
};

export default function OwnerLayout({ children }) {
  return children;
}