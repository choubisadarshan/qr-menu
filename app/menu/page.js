import { Suspense } from 'react';
import MenuApp from '@/components/MenuApp';

export default function MenuPage() {
  return (
    <Suspense>
      <MenuApp />
    </Suspense>
  );
}