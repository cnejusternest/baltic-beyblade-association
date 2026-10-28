import {json,userFor} from '../../_lib/auth.js';
export async function onRequestGet({request,env}){
 if(!env.DB)return json({error:'Database unavailable.'},503);
 try{const user=await userFor(env.DB,request);return user?json({authenticated:true,user:{username:user.username,country:user.country,email:user.email,emailVerified:!!user.email_verified}}):json({authenticated:false})}
 catch(e){console.error(e);return json({error:'Account system not ready.'},503)}
}
