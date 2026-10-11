import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabaseAdmin';
import { startOfCafeDay } from '@/lib/cafeDay';
import { UUID, parseOrderBody, priceOrder } from '@/lib/orderLogic';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (message, status = 400) => NextResponse.json({ error: message }, { status, headers: NO_STORE });

/**
 * GET /api/orders?session=<uuid>
 * Returns ONLY this visit's orders from today. A new QR scan has a new session id,
 * so it gets an empty list. Names and phone numbers are never sent back.
 */
export async function GET(req) {
  const session = new URL(req.url).searchParams.get('session') ?? '';
  if (!UUID.test(session)) return NextResponse.json({ orders: [] }, { headers: NO_STORE });
  try {
    const { data, error } = await admin()
      .from('orders')
      .select('id, table_number, status, payment_status, total, note, created_at, order_items(id, item_name, price, quantity)')
      .eq('session_id', session)
      .gte('created_at', startOfCafeDay().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data ?? [] }, { headers: NO_STORE });
  } catch (e) {
    console.error('GET /api/orders', e);
    return fail('Could not load your orders.', 500);
  }
}

/**
 * POST /api/orders
 * Validates the order, prices it from the menu table, and saves it with this visit's session id.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid request.');
  }
  const parsed = parseOrderBody(body);
  if (parsed.error) return fail(parsed.error);
  const { session, table, name, phone, note, qtyById } = parsed.value;

  try {
    const db = admin();

    // Basic spam guard: at most 8 orders per visit in 10 minutes
    const since = new Date(Date.now() - 10 * 60000).toISOString();
    const { count } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session)
      .gte('created_at', since);
    if ((count ?? 0) >= 8) return fail('Too many orders in a short time. Please ask our staff.', 429);

    const { data: dishes, error: menuError } = await db
      .from('menu_items')
      .select('id, name, price, available')
      .in('id', [...qtyById.keys()]);
    if (menuError) throw menuError;

    const priced = priceOrder(dishes ?? [], qtyById);
    if (priced.error) return fail(priced.error, 409);

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        table_number: table,
        customer_name: name,
        note,
        subtotal: priced.subtotal,
        tax: priced.tax,
        total: priced.total,
        session_id: session,
      })
      .select('id, table_number, status, payment_status, total, created_at')
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await db.from('order_items').insert(
      priced.lines.map((l) => ({ order_id: order.id, item_name: l.name, price: l.price, quantity: l.quantity }))
    );
    if (itemsError) {
      await db.from('orders').delete().eq('id', order.id); // do not leave an empty order behind
      throw itemsError;
    }

    if (phone) await db.from('order_contacts').insert({ order_id: order.id, phone });

    return NextResponse.json({ order }, { status: 201, headers: NO_STORE });
  } catch (e) {
    console.error('POST /api/orders', e);
    return fail('Could not send your order. Please try again.', 500);
  }
}