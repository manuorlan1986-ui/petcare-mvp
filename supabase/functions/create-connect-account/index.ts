import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-04-30.basil' });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 try{
  const auth=req.headers.get('Authorization'); if(!auth) throw new Error('Authentication required');
  const token=auth.replace('Bearer ',''); const {data:{user}}=await admin.auth.getUser(token); if(!user) throw new Error('Invalid session');
  const {data:profile}=await admin.from('profiles').select('display_name').eq('id',user.id).single();
  const {data:caregiver}=await admin.from('caregiver_profiles').select('stripe_account_id').eq('id',user.id).single();
  if(caregiver?.stripe_account_id) return new Response(JSON.stringify({account_id:caregiver.stripe_account_id}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
  const account=await stripe.accounts.create({type:'express',country:'US',email:user.email,capabilities:{card_payments:{requested:true},transfers:{requested:true}},business_profile:{name:profile?.display_name||'PetCare caregiver'}});
  await admin.from('caregiver_profiles').update({stripe_account_id:account.id}).eq('id',user.id);
  return new Response(JSON.stringify({account_id:account.id}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
