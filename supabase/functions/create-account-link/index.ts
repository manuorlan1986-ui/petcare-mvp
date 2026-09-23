import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2025-04-30.basil'});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 try{const auth=req.headers.get('Authorization');if(!auth)throw new Error('Authentication required');const token=auth.replace('Bearer ','');const {data:{user}}=await admin.auth.getUser(token);if(!user)throw new Error('Invalid session');
 const {data:c}=await admin.from('caregiver_profiles').select('stripe_account_id').eq('id',user.id).single();if(!c?.stripe_account_id)throw new Error('Connect account first');
 const origin=req.headers.get('origin')||Deno.env.get('APP_URL')||'https://your-netlify-site.netlify.app';
 const link=await stripe.accountLinks.create({account:c.stripe_account_id,refresh_url:`${origin}/?connect=refresh`,return_url:`${origin}/?connect=complete`,type:'account_onboarding'});
 return new Response(JSON.stringify({url:link.url}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
