// Independent BBA account settings client. Never persist passwords in browser storage.
(() => {
  const root = document.querySelector('[data-settings-root]');
  if(!root) return;
  const loading = root.querySelector('[data-settings-loading]');
  const panel = root.querySelector('[data-settings-content]');
  const error = root.querySelector('[data-settings-error]');
  const themeButton = root.querySelector('[data-settings-theme]');
  const countryInput = root.querySelector('[name=country]');
  const emailInput = root.querySelector('[name=email]');
  const usernameInput = root.querySelector('[name=username]');
  const countries = Array.isArray(window.BBA_COUNTRIES) ? window.BBA_COUNTRIES : [];
  const forms = [...root.querySelectorAll('[data-settings-form]')];
  function showError(text) { error.textContent=text; error.hidden=!text; }
  function formStatus(form,text,success=false) {
    const element=form.querySelector('[data-form-status]');
    if(!element)return;
    element.hidden=!text; element.textContent=text;
    element.classList.toggle('is-success',success);
  }
  async function post(action,values) {
    const response = await fetch('/api/auth/settings',{
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,...values})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Unable to update settings.');
    return result;
  }
  function populateCountries(country) {
    countryInput.replaceChildren();
    const placeholder=new Option('Choose your country','');
    placeholder.disabled=true;countryInput.add(placeholder);
    for(const code of ['LV','LT','EE']) {
      const item=countries.find(c=>c.code===code);
      if(item) countryInput.add(new Option(item.name,item.code));
    }
    for(const item of countries) {
      if(!['LV','LT','EE'].includes(item.code)) countryInput.add(new Option(item.name,item.code));
    }
    countryInput.value=country||'';
  }
  function refreshThemeLabel() {
    if(themeButton) {
      const light=document.documentElement.dataset.theme==='light';
      themeButton.textContent=light?'Switch to dark theme':'Switch to light theme';
    }
  }
  themeButton?.addEventListener('click',()=>{
    document.querySelector('.theme-toggle')?.click();
    refreshThemeLabel();
  });
  document.querySelector('.theme-toggle')?.addEventListener('click',refreshThemeLabel);
  refreshThemeLabel();
  for(const form of forms) {
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      formStatus(form,'');
      const action=form.dataset.settingsForm;
      const values=Object.fromEntries(new FormData(form));
      if(action==='password') {
        if(values.newPassword!==values.confirmNewPassword) {
          formStatus(form,'New passwords do not match.');return;
        }
        delete values.confirmNewPassword;
      }
      if(action==='delete_account' && values.confirmation!=='DELETE') {
        formStatus(form,'Type DELETE exactly to confirm.');return;
      }
      // Require a second, explicit confirmation for irreversible deletion.
      if(action==='delete_account' &&
         !window.confirm('Permanently delete your BBA account? This cannot be undone.')) return;
      const button=form.querySelector('[type=submit]');
      if(button) button.disabled=true;
      try {
        const result=await post(action,values);
        form.reset();
        if(result.reauthenticate || result.deleted) {
          window.location.assign('login.html?session=ended');
          return;
        }
        if(action==='username')usernameInput.value=result.username;
        if(action==='email')emailInput.value=result.email;
        if(action==='country')countryInput.value=result.country;
        formStatus(form,action==='email'
          ? 'Email saved. Your new address is not yet verified.'
          : 'Settings saved successfully.',true);
      }catch(e){formStatus(form,e.message||'Could not save settings.');}
      finally{if(button)button.disabled=false;}
    });
  }

  async function load(){
    try{
      const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();
      if(!response.ok) throw Error(result.error||'Account service unavailable.');
      if(!result.authenticated || !result.user) {
        loading.textContent='You need to log in to manage your account. ';
        const link=document.createElement('a');
        link.href='login.html';link.textContent='Log in';loading.append(link);
        return;
      }
      usernameInput.value=result.user.username;
      emailInput.value=result.user.email;
      populateCountries(result.user.country);
      loading.hidden=true;
      panel.hidden=false;
    }catch(e){
      loading.textContent='Unable to load account settings. Refresh the page or try logging in again.';
      showError(e.message||'Account service unavailable.');
    }
  }
  load();
})();
