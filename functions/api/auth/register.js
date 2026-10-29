import {json,originOK,ready,inputOf,hashPassword,rateLimit,turnstile,createSession,sessionCookie} from '../../_lib/auth.js';
import {COUNTRY_CODES} from '../../_lib/country-codes.js';
export async function onRequestPost({request,env}) {
  if(!originOK(request)) return json({error:'Invalid origin.'},403);
  if(!ready(env)) return json({error:'Registration is not configured.'},503);
  let b;
  try { b=await inputOf(request); } catch(e) { return json({error:e.message},400); }
  const username=typeof b.username==='string'?b.username.trim():'';
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const country=typeof b.country==='string'?b.country.toUpperCase():'';
  if(!/^[A-Za-z0-9_]{3,24}$/.test(username)) return json({error:'Username: 3–24 letters, numbers or underscores.'},400);
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Invalid email.'},400);
  if(!COUNTRY_CODES.has(country)) return json({error:'Choose a valid country.'},400);
  if(typeof b.password!=='string'||b.password.length<12||b.password.length>128) return json({error:'Password must be 12–128 characters.'},400);
  try {
    if(!await rateLimit(env.DB,request,'register',5,3600)) return json({error:'Too many attempts. Try later.'},429);
    if(!await turnstile(env,request,b.turnstileToken)) return json({error:'Security check failed.'},403);
    const existing=await env.DB.prepare('SELECT username,email FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE').bind(username,email).first();
    if(existing) return json({error:existing.username.toLowerCase()===username.toLowerCase()?'Username is taken.':'Email is registered.'},409);
    const id=crypto.randomUUID();
    const h=await hashPassword(b.password);
    try {
      await env.DB.prepare('INSERT INTO users (id,username,email,country,password_salt,password_hash) VALUES (?,?,?,?,?,?)')
        .bind(id,username,email,country,h.salt,h.hash).run();
    } catch(e) {
      if(String(e).includes('UNIQUE')) return json({error:'Username or email is already registered.'},409);
      throw e;
    }
    const token=await createSession(env.DB,id);
    return json({ok:true},201,{'Set-Cookie':sessionCookie(token)});
  } catch(e) {
    console.error('Registration failed',e);
    return json({error:'Registration unavailable.'},500);
  }
}
