// Account forms, current user profile and country editing.
(async () => {
  const form=document.querySelector('[data-auth-form]');
  const profile=document.querySelector('[data-profile-view]');
  if(!form && !profile) return;
  const message=document.querySelector('[data-message]');
  const setMessage=(text,success=false) => {
    if(!message) return;
    message.textContent=text;
    message.hidden=!text;
    message.classList.toggle('auth-alert-success',success);
  };
  const api=async (path,data) => {
    const response=await fetch('/api/auth/'+path,{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    const payload=await response.json().catch(()=>({error:'Unexpected response.'}));
    if(!response.ok) throw Error(payload.error||'Request failed.');
    return payload;
  };
  const countries=Array.isArray(window.BBA_COUNTRIES)?window.BBA_COUNTRIES:[];
  const countryName=(code)=>countries.find(c=>c.code===code)?.name||code||'Not selected';
  function countrySelector(select,selected) {
    if(!select) return;
    select.replaceChildren();
    const placeholder=new Option('Select a country','');
    placeholder.disabled=true;
    select.add(placeholder);
    const baltic=document.createElement('optgroup');
    baltic.label='Baltic States';
    ['LV','LT','EE'].forEach(code=>baltic.add(new Option(countryName(code),code)));
    select.add(baltic);
    const rest=document.createElement('optgroup');
    rest.label='All other countries and territories';
    countries.filter(c=>!['LV','LT','EE'].includes(c.code))
      .forEach(c=>rest.add(new Option(c.name,c.code)));
    select.add(rest);
    select.value=selected||'';
  }
  if(profile) {
    const select=document.querySelector('[data-country-select]');
    countrySelector(select,'');
    try {
      const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json();
      if(!response.ok) throw Error(data.error||'Profile unavailable.');
      if(!data.authenticated){location.replace('login.html');return;}
      document.querySelector('[data-username]').textContent=data.user.username;
      document.querySelector('[data-avatar]').textContent=data.user.username.slice(0,2).toUpperCase();
      document.querySelector('[data-country]').textContent=countryName(data.user.country);
      document.querySelector('[data-email]').textContent=data.user.email;
      document.querySelector('[data-email-status]').textContent=data.user.emailVerified?'Verified':'Not verified';
      select.value=data.user.country;
      document.querySelector('[data-details]').hidden=false;
    } catch(e) {setMessage(e.message||'Unable to load your profile.');}
    const save=document.querySelector('[data-save-profile]');
    save?.addEventListener('click',async()=>{
      if(!select.value){setMessage('Select a country.');return;}
      save.disabled=true;setMessage('');
      try {
        const updated=await api('profile',{country:select.value});
        document.querySelector('[data-country]').textContent=countryName(updated.country);
        setMessage('Country updated successfully.',true);
      } catch(e) {setMessage(e.message);} finally {save.disabled=false;}
    });
    document.querySelector('[data-logout]')?.addEventListener('click',async()=>{
      try {await api('logout',{});location.assign('login.html');}
      catch(e){setMessage(e.message);}
    });
    return;
  }
  countrySelector(form.querySelector('[name=country]'),'');
  const submit=form.querySelector('button[type=submit]');
  submit.disabled=true;
  let widget=null;
  try {
    const response=await fetch('/api/auth/config',{cache:'no-store'});
    const config=await response.json();
    if(!response.ok||!config.ready||!config.siteKey)
      throw Error('Accounts are not configured yet.');
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;script.onload=resolve;
      script.onerror=()=>reject(Error('Security check did not load.'));
      document.head.append(script);
    });
    widget=window.turnstile.render('#turnstile',{sitekey:config.siteKey});
    submit.disabled=false;
  } catch(e){setMessage(e.message);}
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(widget===null)return;
    setMessage('');
    const token=window.turnstile.getResponse(widget);
    if(!token){setMessage('Complete the security check.');return;}
    const data=Object.fromEntries(new FormData(form));
    if('confirmPassword' in data && data.confirmPassword!==data.password){
      setMessage('Passwords do not match.');return;
    }
    delete data.confirmPassword;
    data.turnstileToken=token;
    submit.disabled=true;
    try {
      await api(form.dataset.authForm,data);
      location.assign('profile.html');
    } catch(e) {
      setMessage(e.message);
      window.turnstile.reset(widget);
      submit.disabled=false;
    }
  });
})();
