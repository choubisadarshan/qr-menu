// This app stores only a short table label on each order (no separate "order type" column).
// A label such as "Takeaway", "Pickup", "Parcel" or "To-go" counts as a takeaway order; everything else is dine-in.
export const isTakeaway = (tableNumber) => /^(take|pick|parcel|to-?go)/i.test(String(tableNumber ?? '').trim());

export const tableLabel = (tableNumber) => (isTakeaway(tableNumber) ? 'Takeaway' : `Table ${tableNumber}`);