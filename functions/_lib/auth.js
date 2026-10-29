const enc=new TextEncoder();
const COOKIE='__Host-bba_session';
const MAXAGE=60*60*24*7;
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const fromHex=h=>Uint8Array.from(h.match(/../g)||[],v=>parseInt(v,16));
const random=n=>{const b=new Uint8Array(n);crypto.getRandomValues(b);return hex(b)};
export const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export const originOK=r=>r.headers.get('Origin')===new URL(r.url).origin;
export const ready=e=>!!(e.DB && e.TURNSTILE_SITE_KEY && e.TURNSTILE_SECRET_KEY);
export async function inputOf(r){
 if(!(r.headers.get('Content-Type')||'').startsWith('application/json'))throw Error('Expected JSON.');
 if(Number(r.headers.get('Content-Length')||0)>4096)throw Error('Request too large.');
 const t=await r.text();if(t.length>4096)throw Error('Request too large.');
 try{return JSON.parse(t)}catch{throw Error('Invalid JSON.')}
}
export async function sha(s){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))))}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromHex(salt),iterations:100000},key,256)))}
export async function hashPassword(p){const salt=random(16);return {salt,hash:await derive(p,salt)}}
export async function verifyPassword(p,salt,expected){const got=fromHex(await derive(p,salt));const want=fromHex(expected);if(got.length!==32||want.length!==32)return false;let d=0;for(let i=0;i<32;i++)d|=got[i]^want[i];return d===0}
export async function rateLimit(db,r,purpose,max,seconds){
 const key=await sha(purpose+':'+(r.headers.get('CF-Connecting-IP')||'unknown'));
 const now=Math.floor(Date.now()/1000);
 await db.prepare(`INSERT INTO auth_rate_limits(rate_key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(rate_key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END`).bind(key,now,now-seconds,now-seconds,now).run();
 const row=await db.prepare('SELECT attempts FROM auth_rate_limits WHERE rate_key=?').bind(key).first();return row.attempts<=max;
}
export async function turnstile(env,r,token){
 if(typeof token!=='string'||!token||token.length>2048)return false;
 const body=new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token});const ip=r.headers.get('CF-Connecting-IP');if(ip)body.set('remoteip',ip);
 const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});if(!res.ok)return false;
 const data=await res.json();return data.success===true&&data.hostname===new URL(r.url).hostname;
}
export async function createSession(db,id){const token=random(32);await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(token),id,Math.floor(Date.now()/1000)+MAXAGE).run();return token}
export const sessionCookie=t=>`${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAXAGE}`;
export const clearCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
function getToken(r){return (r.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-bba_session=([a-f0-9]{64})(?:;|$)/)?.[1]}
export async function userFor(db,r){const token=getToken(r);if(!token)return null;return db.prepare('SELECT u.username,u.email,u.country,u.email_verified,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(token),Math.floor(Date.now()/1000)).first()}
// Internal helper for sensitive account changes. Password hashes never leave the server.
export async function accountFor(db,r){
 const token=getToken(r);
 if(!token)return null;
 return db.prepare('SELECT u.id,u.username,u.email,u.country,u.password_salt,u.password_hash,u.email_verified,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
 .bind(await sha(token),Math.floor(Date.now()/1000)).first();
}
export async function logout(db,r){const t=getToken(r);if(t)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(t)).run()}
