import {json,originOK,inputOf,accountFor,verifyPassword,hashPassword,rateLimit,clearCookie} from '../../_lib/auth.js';
import {COUNTRY_CODES} from '../../_lib/country-codes.js';

// Settings are always session-authenticated and CSRF-protected.
export async function onRequestPost({request,env}) {
 if(!originOK(request)) return json({error:'Invalid origin.'},403);
 if(!env.DB) return json({error:'Database unavailable.'},503);

 let body;
 try{body=await inputOf(request)}catch(e){return json({error:e.message},400)}
 if(!body || typeof body!=='object' || Array.isArray(body))
   return json({error:'Invalid request.'},400);

 const action=body.action;
 if(!['username','email','password','country','logout_all','delete_account'].includes(action))
   return json({error:'Invalid account action.'},400);

 try {
   const account=await accountFor(env.DB,request);
   if(!account) return json({error:'Please log in again.'},401);

   // Changing the public country does not require re-entering the password.
   if(action==='country') {
     const country=typeof body.country==='string'?body.country.trim().toUpperCase():'';
     if(!COUNTRY_CODES.has(country))return json({error:'Choose a valid country.'},400);
     await env.DB.prepare('UPDATE users SET country=? WHERE id=?').bind(country,account.id).run();
     return json({ok:true,country});
   }

   // A shared rate limit protects all password-confirmed account changes.
   if(!await rateLimit(env.DB,request,'account-settings-sensitive',8,3600))
     return json({error:'Too many attempts. Try again later.'},429);
   if(typeof body.currentPassword!=='string'||!body.currentPassword||body.currentPassword.length>128)
     return json({error:'Enter your current password.'},400);
   const verified=await verifyPassword(body.currentPassword,account.password_salt,account.password_hash);
   if(!verified)return json({error:'Current password is incorrect.'},403);

   if(action==='username') {
     const username=typeof body.username==='string'?body.username.trim():'';
     if(!/^[A-Za-z0-9_]{3,24}$/.test(username))
       return json({error:'Username must be 3–24 letters, digits or underscores.'},400);
     try {
       await env.DB.prepare('UPDATE users SET username=? WHERE id=?').bind(username,account.id).run();
     }catch(e) {
       if(String(e).includes('UNIQUE'))return json({error:'Username is already taken.'},409);
       throw e;
     }
     return json({ok:true,username});
   }

   if(action==='email') {
     const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
     if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
       return json({error:'Enter a valid email address.'},400);
     if(email===account.email.toLowerCase())
       return json({ok:true,email,emailVerified:!!account.email_verified});
     try {
       await env.DB.prepare('UPDATE users SET email=?,email_verified=0 WHERE id=?')
         .bind(email,account.id).run();
     }catch(e) {
       if(String(e).includes('UNIQUE'))return json({error:'Email is already in use.'},409);
       throw e;
     }
     return json({ok:true,email,emailVerified:false});
   }

   if(action==='password') {
     if(typeof body.newPassword!=='string'||body.newPassword.length<12||body.newPassword.length>128)
       return json({error:'New password must contain 12–128 characters.'},400);
     if(body.newPassword===body.currentPassword)
       return json({error:'Choose a different password.'},400);
     const hashed=await hashPassword(body.newPassword);
     // D1 batch runs atomically: do not leave old sessions active if the second
     // query fails after the password has already changed.
     await env.DB.batch([
       env.DB.prepare('UPDATE users SET password_salt=?, password_hash=? WHERE id=?')
         .bind(hashed.salt,hashed.hash,account.id),
       env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(account.id)
     ]);
     return json({ok:true,reauthenticate:true},200,{'Set-Cookie':clearCookie()});
   }

   if(action==='logout_all') {
     await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(account.id).run();
     return json({ok:true,reauthenticate:true},200,{'Set-Cookie':clearCookie()});
   }

   // Irreversible deletion requires the current password and explicit text.
   if(action==='delete_account') {
     if(body.confirmation!=='DELETE')
       return json({error:'Type DELETE exactly to confirm account deletion.'},400);
     await env.DB.prepare('DELETE FROM users WHERE id=?').bind(account.id).run();
     return json({ok:true,deleted:true},200,{'Set-Cookie':clearCookie()});
   }
 } catch(e) {
   console.error('Account settings request failed',e);
   return json({error:'Unable to update account settings.'},500);
 }
}
