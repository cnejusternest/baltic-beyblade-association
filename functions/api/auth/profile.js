import {json,originOK,inputOf,userFor} from '../../_lib/auth.js';
import {COUNTRY_CODES} from '../../_lib/country-codes.js';
export async function onRequestPost({request,env}) {
  if(!originOK(request)) return json({error:'Invalid origin.'},403);
  if(!env.DB) return json({error:'Database unavailable.'},503);
  let body;
  try { body=await inputOf(request); } catch(e) { return json({error:e.message},400); }
  const country=typeof body.country==='string'?body.country.toUpperCase():'';
  if(!COUNTRY_CODES.has(country)) return json({error:'Choose a valid country.'},400);
  try {
    const user=await userFor(env.DB,request);
    if(!user) return json({error:'Please log in.'},401);
    await env.DB.prepare('UPDATE users SET country=? WHERE username=? COLLATE NOCASE')
      .bind(country,user.username).run();
    return json({ok:true,country});
  } catch(e) {
    console.error('Profile update failed',e);
    return json({error:'Unable to save profile.'},500);
  }
}
