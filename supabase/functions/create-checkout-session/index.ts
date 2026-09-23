import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-04-30.basil' });
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Authentication required');
    const token = auth.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Invalid session');

    const { booking_id } = await req.json();
    const { data: booking, error } = await supabase.from('bookings').select('*, caregiver:caregiver_profiles(stripe_account_id)').eq('id', booking_id).eq('customer_id', user.id).single();
    if (error || !booking) throw new Error('Booking not found');
    if (booking.status !== 'pending') throw new Error('Booking is not payable');
    const connectedAccount = booking.caregiver?.stripe_account_id;
    if (!connectedAccount) throw new Error('Caregiver has not connected Stripe payouts');

    const origin = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://your-netlify-site.netlify.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: booking.currency, product_data: { name: booking.service_type === 'walking' ? 'PetCare — Dog walking' : 'PetCare — Day care' }, unit_amount: booking.total_amount_cents }, quantity: 1 }],
      success_url: `${origin}/?payment=success&booking=${booking.id}`,
      cancel_url: `${origin}/?payment=cancelled&booking=${booking.id}`,
      customer_email: user.email,
      payment_intent_data: {
        application_fee_amount: booking.platform_fee_cents,
        transfer_data: { destination: connectedAccount },
        metadata: { booking_id: booking.id, caregiver_id: booking.caregiver_id, customer_id: booking.customer_id },
      },
      metadata: { booking_id: booking.id },
    });

    await supabase.from('bookings').update({ stripe_checkout_session_id: session.id }).eq('id', booking.id);
    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
