import {json,ready} from '../../_lib/auth.js';
export function onRequestGet({env}){return json({ready:ready(env),siteKey:ready(env)?env.TURNSTILE_SITE_KEY:null})}
