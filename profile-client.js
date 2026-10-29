// BBA member profile: independent of the registration/login script.
(() => {
  const root = document.querySelector('[data-profile-view]');
  if (!root) return;

  const status = root.querySelector('[data-profile-status]');
  const details = root.querySelector('[data-details]');
  const actions = root.querySelector('[data-profile-actions]');
  const message = root.querySelector('[data-profile-message]');
  const select = root.querySelector('[data-country-select]');
  const saveButton = root.querySelector('[data-save-profile]');
  const logoutButton = root.querySelector('[data-logout]');
  const retryButton = root.querySelector('[data-retry-profile]');
  const countries = Array.isArray(window.BBA_COUNTRIES) ? window.BBA_COUNTRIES : [];
  let loading = false;

  const nameFor = code => countries.find(item => item.code === code)?.name || code || 'Not specified';
  const setText = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = String(value ?? '');
  };
  const feedback = (text, success = false) => {
    if (!message) return;
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle('auth-alert-success', success);
  };
  const setStatus = (text, allowActions = false) => {
    status.textContent = text;
    status.hidden = false;
    details.hidden = true;
    actions.hidden = !allowActions;
  };

  function populateCountries(current) {
    select.replaceChildren();
    const placeholder = new Option('Choose a country', '');
    placeholder.disabled = true;
    select.add(placeholder);
    if (!countries.length) {
      const fallback = new Option(nameFor(current), current);
      select.add(fallback);
      select.value = current;
      return;
    }
    const baltic = new Option('── Baltic States ──', '');
    baltic.disabled = true;
    select.add(baltic);
    for (const code of ['LV', 'LT', 'EE']) {
      const country = countries.find(item => item.code === code);
      if (country) select.add(new Option(country.name, country.code));
    }
    const world = new Option('── Other countries ──', '');
    world.disabled = true;
    select.add(world);
    for (const item of countries) {
      if (!['LV', 'LT', 'EE'].includes(item.code)) select.add(new Option(item.name, item.code));
    }
    select.value = current || '';
  }

  async function request(path, data) {
    const response = await fetch('/api/auth/' + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(payload.error || 'Unable to update your account.');
    return payload;
  }

  async function loadProfile() {
    if (loading) return;
    loading = true;
    feedback('');
    if (retryButton) retryButton.disabled = true;
    setStatus('Loading your BBA profile…');
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: abortController.signal
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'The account service is unavailable.');
      if (!data.authenticated || !data.user) {
        setStatus('You are not signed in. Log in to view your profile.', true);
        return;
      }

      const user = data.user;
      setText('[data-username]', user.username);
      setText('[data-avatar]', String(user.username || 'B').slice(0, 2).toUpperCase());
      setText('[data-country]', nameFor(user.country));
      setText('[data-email]', user.email);
      setText('[data-email-status]', user.emailVerified ? 'Verified' : 'Not verified');
      const joined = Number(user.memberSince);
      setText('[data-member-since]', Number.isFinite(joined) && joined > 0
        ? new Date(joined * 1000).toLocaleDateString('en-GB', {month:'long', year:'numeric'})
        : 'BBA member');
      populateCountries(user.country);

      actions.hidden = true;
      status.hidden = true;
      details.hidden = false;
    } catch (error) {
      const explanation = error.name === 'AbortError'
        ? 'Loading timed out. Check your connection and try again.'
        : error.message || 'Unable to load your account right now.';
      setStatus(explanation + ' You can retry or log in again.', true);
    } finally {
      clearTimeout(timeout);
      loading = false;
      if (retryButton) retryButton.disabled = false;
    }
  }

  retryButton?.addEventListener('click', loadProfile);
  saveButton?.addEventListener('click', async () => {
    if (!select.value) { feedback('Choose a country first.'); return; }
    saveButton.disabled = true;
    feedback('');
    try {
      const updated = await request('profile', {country: select.value});
      setText('[data-country]', nameFor(updated.country));
      feedback('Country saved successfully.', true);
    } catch (error) {
      feedback(error.message || 'Could not save your country.');
    } finally {
      saveButton.disabled = false;
    }
  });
  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;
    feedback('');
    try {
      await request('logout', {});
      location.assign('login.html');
    } catch (error) {
      feedback(error.message || 'Unable to log out.');
      logoutButton.disabled = false;
    }
  });

  loadProfile();
})();
