import {json,originOK,logout,clearCookie} from '../../_lib/auth.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Database unavailable.'},503);
 try{await logout(env.DB,request);return json({ok:true},200,{'Set-Cookie':clearCookie()})}
 catch(e){console.error(e);return json({error:'Logout unavailable.'},500)}
}
