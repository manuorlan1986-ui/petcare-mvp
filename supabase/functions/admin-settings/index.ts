import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 try{
  const auth=req.headers.get('Authorization'); if(!auth) throw new Error('Authentication required');
  const token=auth.replace('Bearer ',''); const {data:{user}}=await admin.auth.getUser(token); if(!user) throw new Error('Invalid session');
  const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).single(); if(profile?.role!=='admin') throw new Error('Admin access required');
  if(req.method==='GET'){
    const {data,error}=await admin.from('platform_settings').select('platform_fee_bps,fixed_fee_cents,payout_hold_days,currency').eq('id',true).single(); if(error) throw error;
    return new Response(JSON.stringify(data),{headers:{...corsHeaders,'Content-Type':'application/json'}});
  }
  const body=await req.json();
  const {data,error}=await admin.from('platform_settings').update({platform_fee_bps:Math.round(Number(body.platform_fee_pct)*100),fixed_fee_cents:Math.round(Number(body.fixed_fee)*100),payout_hold_days:Math.round(Number(body.hold_days))}).eq('id',true).select().single();
  if(error) throw error; return new Response(JSON.stringify(data),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})}
});
