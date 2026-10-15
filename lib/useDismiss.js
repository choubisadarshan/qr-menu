'use client';
import { useEffect, useRef } from 'react';

// Close a dialog by clicking/tapping the dimmed area outside it, or by pressing Esc.
// Usage: const dismiss = useDismiss(requestClose);  <div className="scrim ..." {...dismiss}> ...panel... </div>
// The press must START on the dimmed area too, so dragging a text selection out of an input never closes the dialog.
export function useDismiss(requestClose) {
  const downOnScrim = useRef(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="listbox"]')) return; // an open dropdown closes first
      requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose]);

  return {
    onPointerDown: (e) => {
      downOnScrim.current = e.target === e.currentTarget;
    },
    onClick: (e) => {
      const hit = downOnScrim.current && e.target === e.currentTarget;
      downOnScrim.current = false;
      if (hit) requestClose();
    },
  };
}
