# BBA Account Add-on (TESTING ONLY)

This add-on is designed to be copied INTO your existing GitHub repo root (do not replace existing HTML/CSS). All files inside `functions/` go in corresponding paths. Keep your existing `functions/api/health.js`.

1. Cloudflare Dashboard > D1 > bba-db > Console. Run the statements from `schema-auth.sql` (one at a time if the console asks). This creates users, sessions and attempt-limit tables. `COLLATE NOCASE UNIQUE` prevents usernames such as `Blader12` and `blader12` simultaneously.
2. Cloudflare > Turnstile > Add widget for `balticbeyblade.com`. Copy the site key and secret key.
3. Pages project > Settings > Variables and Secrets > Production: `TURNSTILE_SITE_KEY` (text) and `TURNSTILE_SECRET_KEY` (SECRET). NEVER upload real secrets to GitHub. D1 production binding should be `DB` -> `bba-db`.
4. Upload the add-on files and folders to your GitHub repository `main`. Cloudflare automatically deploys. Visit `/register.html`, `/login.html`, `/profile.html`.
5. To link accounts from the site navigation, add `<a href="login.html">Log in</a>` to the navigation of each HTML page. A dynamic menu can be added later.

Security: random session tokens stored as SHA256 hashes; HttpOnly Secure SameSite=Lax cookies; PBKDF2-SHA256 600000 iterations with individual salts; Cloudflare Turnstile validated server-side; POST Origin check; D1 request limiting; email/username uniqueness enforced inside database. Accounts stay UNVERIFIED since no emails are sent.

IMPORTANT: This is a technical pilot, **not ready for public signups**. There is no email verification, reset password, deletion workflow or privacy notice. Do not invite real users or use important/reused passwords until these features are completed and security tested. Avoid testing in a shared live production environment where unverified accounts may be abused.
