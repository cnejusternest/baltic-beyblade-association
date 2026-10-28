import {json,originOK,ready,inputOf,verifyPassword,rateLimit,turnstile,createSession,sessionCookie} from '../../_lib/auth.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Invalid origin.'},403);
 if(!ready(env))return json({error:'Login is not configured.'},503);
 let b;try{b=await inputOf(request)}catch(e){return json({error:e.message},400)}
 const name=typeof b.identifier==='string'?b.identifier.trim():'';
 if(!name||name.length>254||typeof b.password!=='string'||b.password.length>128)return json({error:'Invalid login.'},400);
 try{
  if(!await rateLimit(env.DB,request,'login',20,900))return json({error:'Too many attempts. Try later.'},429);
  if(!await turnstile(env,request,b.turnstileToken))return json({error:'Security check failed.'},403);
  const u=await env.DB.prepare('SELECT id,password_salt,password_hash FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE').bind(name,name).first();
  const correct=await verifyPassword(b.password,u?.password_salt||'0'.repeat(32),u?.password_hash||'0'.repeat(64));
  if(!u||!correct)return json({error:'Invalid username/email or password.'},401);
  const token=await createSession(env.DB,u.id);return json({ok:true},200,{'Set-Cookie':sessionCookie(token)});
 }catch(e){console.error('Login failed',e);return json({error:'Login unavailable.'},500)}
}
