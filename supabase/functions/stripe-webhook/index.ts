import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2025-04-30.basil'});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async req=>{
 const signature=req.headers.get('stripe-signature'); if(!signature)return new Response('Missing signature',{status:400});
 try{
  const body=await req.text(); const event=stripe.webhooks.constructEvent(body,signature,Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  const obj=event.data.object as any; const bookingId=obj.metadata?.booking_id;
  await admin.from('payment_events').upsert({stripe_event_id:event.id,event_type:event.type,booking_id:bookingId||null,payload:obj},{onConflict:'stripe_event_id'});
  if(bookingId){
   if(event.type==='checkout.session.completed') await admin.from('bookings').update({status:'confirmed'}).eq('id',bookingId);
   if(event.type==='payment_intent.payment_failed') await admin.from('bookings').update({status:'cancelled'}).eq('id',bookingId);
  }
  return new Response(JSON.stringify({received:true}),{status:200,headers:{'Content-Type':'application/json'}});
 }catch(e){return new Response(`Webhook Error: ${e instanceof Error?e.message:'unknown'}`,{status:400})}
});
