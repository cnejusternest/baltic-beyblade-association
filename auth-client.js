(async()=>{
 const form=document.querySelector('[data-auth-form]');const msg=document.querySelector('[data-message]');
 const setMsg=t=>{msg.textContent=t;msg.hidden=!t};
 const api=async(path,data)=>{const r=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const b=await r.json();if(!r.ok)throw Error(b.error||'Request failed');return b};
 if(!form){
  try{const b=await fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json());if(!b.authenticated){location.replace('login.html');return}document.querySelector('[data-username]').textContent=b.user.username;document.querySelector('[data-country]').textContent=({LV:'Latvia',LT:'Lithuania',EE:'Estonia'})[b.user.country];document.querySelector('[data-email]').textContent=b.user.email;document.querySelector('[data-details]').hidden=false}catch(e){setMsg('Unable to load profile.')}
  document.querySelector('[data-logout]').addEventListener('click',async()=>{try{await api('logout',{});location.assign('login.html')}catch(e){setMsg(e.message)}});return;
 }
 let widget=null;const btn=form.querySelector('button[type=submit]');btn.disabled=true;
 try{
  const config=await fetch('/api/auth/config',{cache:'no-store'}).then(r=>r.json());if(!config.ready)throw Error('Accounts are not configured yet.');
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=resolve;s.onerror=()=>reject(Error('Security check did not load.'));document.head.append(s)});
  widget=turnstile.render('#turnstile',{sitekey:config.siteKey});btn.disabled=false;
 }catch(e){setMsg(e.message)}
 form.addEventListener('submit',async ev=>{ev.preventDefault();if(widget===null)return;setMsg('');const token=turnstile.getResponse(widget);if(!token){setMsg('Complete the security check.');return}const b=Object.fromEntries(new FormData(form));if(b.confirmPassword && b.confirmPassword!==b.password){setMsg('Passwords do not match.');return}delete b.confirmPassword;b.turnstileToken=token;btn.disabled=true;try{await api(form.dataset.authForm,b);location.assign('profile.html')}catch(e){setMsg(e.message);turnstile.reset(widget);btn.disabled=false}});
})();
