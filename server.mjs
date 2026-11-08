import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const origin=new URL(process.env.PUBLIC_ORIGIN);
const auth=new URL(process.env.SUPABASE_URL);
const apiKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const normalizeEmail=value=>String(value??'').trim().toLowerCase();
const guests=new Set((process.env.INVITED_EMAILS??'').split(',').map(normalizeEmail).filter(Boolean));
const adminEmail=normalizeEmail(process.env.ADMIN_EMAIL);
const adminKey=process.env.SUPABASE_SECRET_KEY?.trim();
const adminEnabled=Boolean(adminEmail&&adminKey?.startsWith('sb_secret_'));
if(!apiKey||!guests.size||auth.protocol!=='https:'&&auth.hostname!=='127.0.0.1')throw Error('Configure the authentication provider and invited emails.');
if(origin.protocol!=='https:'&&origin.hostname!=='127.0.0.1')throw Error('PUBLIC_ORIGIN must use HTTPS.');
const secure=origin.protocol==='https:';
const cookie=secure?'__Host-voila_session':'voila_dev_session';
const media={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const retry=new Map();
const sessionCache=new Map();

function nextPage(value){
  if(typeof value!=='string'||value.length>24000||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/';
  const u=new URL(value,origin);
  return u.origin===origin.origin&&(u.pathname==='/'||u.pathname==='/admin'||u.pathname.startsWith('/demo/edc/'))?u.pathname+u.search+u.hash:'/';
}
function headers(res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}
function redirect(res,to){res.writeHead(303,{Location:to});res.end();}
function login(res,{email='',next='/',code=false,message='',status=200}={}){
  res.writeHead(status,{'Content-Type':media['.html']});
  const safeNext=escape(nextPage(next)), safeEmail=escape(email);
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Client Login · VOILA</title><link rel="stylesheet" href="/portal.css"><link rel="stylesheet" href="/login.css"></head>
<body><div class="shell"><header class="mast"><a class="wordmark" href="/">VOILA</a><span class="micro">Client Demos</span></header><main class="sign-in"><p class="eyebrow">Private demos</p><h1>${code?'Check your email.':'Client login.'}</h1><p class="intro">${escape(message||(code?'If your email is on the invite list, a sign-in code is on its way.':'Enter the email address on your invitation.') )}</p>
<form method="post" action="${code?'/auth/verify':'/auth/code'}"><input type="hidden" name="next" value="${safeNext}">${code?`<input type="hidden" name="email" value="${safeEmail}"><label for="code">Email code</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" required>`:`<label for="email">Invited email</label><input type="email" id="email" name="email" autocomplete="email" maxlength="254" value="${safeEmail}" required>`}<button type="submit">${code?'Open demo':'Send me a code'}</button></form>
${code?`<a class="back" href="/login?next=${encodeURIComponent(nextPage(next))}">Use a different email or request a new code</a>`:''}</main></div>
<script>const nextField=document.querySelector('input[name=next]');if(location.hash&&!nextField.value.includes('#'))nextField.value+=location.hash;</script></body></html>`);
}
async function upstream(route,{body,token}={}){
  return fetch(new URL('/auth/v1/'+route,auth),{
    method:body?'POST':'GET',
    headers:{apikey:apiKey,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(8000)
  });
}
function validEmail(email){
  return email.length<=254&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email);
}
async function guestRecords(filters={},record){
  const url=new URL('/rest/v1/voila_demo_guests',auth);
  url.search=new URLSearchParams(filters);
  const response=await fetch(url,{
    method:record?'POST':'GET',
    headers:{apikey:adminKey,...(record?{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}:{})},
    body:record?JSON.stringify(record):undefined,
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok){
    console.warn('Guest list request failed',response.status);
    throw Error('Guest list unavailable');
  }
  return record?undefined:response.json();
}
async function canEnter(email){
  if(!email)return false;
  if(!adminEnabled)return guests.has(email);
  if(email===adminEmail)return true;
  if(!validEmail(email))return false;
  const [record]=await guestRecords({select:'enabled',email:'eq.'+email,limit:'1'});
  return record?record.enabled===true:guests.has(email);
}
function pageMessage(res,status,message){
  res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});
  res.end(message);
}
async function adminPage(res,message=''){
  const records=await guestRecords({select:'email,enabled',order:'email.asc'});
  const roster=new Map([...guests].map(email=>[email,true]));
  for(const row of records)roster.set(row.email,row.enabled);
  roster.delete(adminEmail);
  const list=[...roster].filter(([,enabled])=>enabled).sort(([a],[b])=>a.localeCompare(b));
  const rows=list.map(([email])=>`<li><span>${escape(email)}</span><form action="/admin" method="post"><input type="hidden" name="action" value="remove"><input type="hidden" name="email" value="${escape(email)}"><button type="submit">Remove access</button></form></li>`).join('');
  const demoUrl=escape(new URL('/demo/edc/',origin).href);
  res.writeHead(200,{'Content-Type':media['.html']});
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guest Access · VOILA</title><link rel="stylesheet" href="/portal.css"><link rel="stylesheet" href="/login.css">
<style>.guest-admin{max-width:740px;margin:54px auto}.guest-admin h1{font-size:clamp(40px,7vw,65px)}.guest-admin section{margin:28px 0}.guest-admin ul{list-style:none;margin:0;padding:0}.guest-admin li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff26;overflow-wrap:anywhere}.guest-admin input,.guest-admin button{font:inherit;padding:8px 11px;border-radius:5px;border:1px solid #797385;background:#24202c;color:inherit}.guest-admin button{cursor:pointer}.guest-admin #demoLink{width:min(100%,440px)}.guest-admin label{display:block;margin-bottom:6px}.guest-admin .add-row{display:flex;flex-wrap:wrap;gap:8px}.guest-admin #email{flex:1;min-width:205px}</style></head>
<body><div class="shell"><header class="mast"><a class="wordmark" href="/">VOILA</a><form method="post" action="/auth/logout"><button class="sign-out" type="submit">Sign out</button></form></header>
<main class="guest-admin"><p class="eyebrow">Private admin</p><h1>Guest access.</h1><p class="intro">EDC Livestream Camera Study</p>
${message?`<p role="status">${escape(message)}</p>`:''}
<section><h2>Add a guest</h2><form method="post" action="/admin"><input type="hidden" name="action" value="add"><label for="email">Guest email</label><div class="add-row"><input type="email" id="email" name="email" maxlength="254" required><button type="submit">Add guest</button></div></form><p>Adding a guest grants access. Share the demo link so they can request a sign-in code.</p></section>
<section><h2>Invited guests</h2>${rows?`<ul>${rows}</ul>`:'<p>No guests yet.</p>'}</section>
<section><label for="demoLink">Demo link</label><input readonly id="demoLink" value="${demoUrl}"><button id="copy" type="button">Copy demo link</button><p id="copyStatus" role="status"></p></section>
<a class="back" href="/">← Back to demo rooms</a></main></div>
<script>document.getElementById('copy').onclick=async()=>{const input=document.getElementById('demoLink');const status=document.getElementById('copyStatus');try{await navigator.clipboard.writeText(input.value);status.textContent='Link copied.';}catch{input.select();status.textContent='The link is selected. Copy it to share.';}};</script></body></html>`);
}
function throttle(key,limit,ms){
  const now=Date.now();
  if(retry.size>=2000){
    for(const [k,v] of retry)if(v.until<=now)retry.delete(k);
    if(retry.size>=2000&&!retry.has(key))return false;
  }
  const entry=retry.get(key)??{until:0,count:0};
  if(entry.until<=now){entry.until=now+ms;entry.count=0;}
  retry.set(key,entry);
  return ++entry.count<=limit;
}
async function form(req){
  let text='';
  for await(const chunk of req){text+=chunk;if(text.length>90000)throw Error('Form too large.');}
  return new URLSearchParams(text);
}
function sessionToken(req){
  return (req.headers.cookie??'').split(';').map(c=>c.trim()).find(c=>c.startsWith(cookie+'='))?.slice(cookie.length+1);
}
async function signedInEmail(req){
  const token=sessionToken(req);
  if(!token||!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token))return null;
  const cached=sessionCache.get(token);
  if(cached?.until>Date.now())return cached.email;
  const result=await upstream('user',{token});
  if(!result.ok)return null;
  const email=normalizeEmail((await result.json()).email);
  if(!email)return null;
  if(sessionCache.size>=256)sessionCache.delete(sessionCache.keys().next().value);
  sessionCache.set(token,{email,until:Date.now()+20000});
  return email;
}
function setSession(res,token,seconds){
  res.setHeader('Set-Cookie',`${cookie}=${token}; Max-Age=${seconds}; Path=/; HttpOnly; SameSite=Lax${secure?'; Secure':''}`);
}
async function staticFile(req,res,pathname){
  const path=resolve(root,'.'+decodeURIComponent(pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(404);res.end();return;}
  let file=path;
  try{
    if((await stat(file)).isDirectory()){
      if(!pathname.endsWith('/')){redirect(res,pathname+'/');return;}
      file=resolve(file,'index.html');
    }
    const details=await stat(file);
    if(!details.isFile()||!media[extname(file)])throw Error('missing');
    res.writeHead(200,{'Content-Type':media[extname(file)],'Content-Length':details.size});
    if(req.method==='HEAD'){res.end();return;}
    createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end('Page not found');}
}

createServer(async(req,res)=>{
  headers(res);
  try{
    const url=new URL(req.url,origin),path=url.pathname;
    if(path==='/admin'||path==='/admin/'){
      if(!adminEnabled)return pageMessage(res,404,'Page not found.');
      if(!['GET','POST'].includes(req.method))return pageMessage(res,405,'Method not allowed.');
      if(req.method==='POST'&&req.headers.origin!==origin.origin)return pageMessage(res,403,'Open the VOILA admin page and try again.');
      const owner=await signedInEmail(req);
      if(!owner)return redirect(res,'/login?next=%2Fadmin');
      if(owner!==adminEmail)return pageMessage(res,403,'This page is for the VOILA portal administrator.');
      if(req.method==='GET'){
        const notice=url.searchParams.get('updated');
        return await adminPage(res,notice==='add'?'Guest access added.':notice==='remove'?'Guest access removed.':'');
      }
      const data=await form(req),email=normalizeEmail(data.get('email')),action=data.get('action');
      if(!validEmail(email)||email===adminEmail||!['add','remove'].includes(action)){
        return await adminPage(res,'Enter a valid guest email. The administrator account is managed separately.');
      }
      await guestRecords({on_conflict:'email'},{email,enabled:action==='add'});
      return redirect(res,'/admin?updated='+action);
    }
    if(req.method==='GET'&&path==='/login')return login(res,{next:nextPage(url.searchParams.get('next'))});
    if(req.method==='POST'&&['/auth/code','/auth/verify','/auth/logout'].includes(path)){
      if(req.headers.origin!==origin.origin){
        if(path==='/auth/code')console.warn('Email code: blocked (request origin mismatch)');
        res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'});
        res.end('Open the VOILA login page on its main website and try again.');
        return;
      }
      if(path==='/auth/logout'){
        sessionCache.delete(sessionToken(req));setSession(res,'',0);return redirect(res,'/login');
      }
      const data=await form(req),email=(data.get('email')??'').trim().toLowerCase(),next=nextPage(data.get('next'));
      if(path==='/auth/code'){
        if(!(await canEnter(email))){
          console.info('Email code: skipped (address not invited)');
        }else if(!throttle('code:'+email,3,300000)){
          console.info('Email code: skipped (portal retry limit)');
        }else{
          try{
            const r=await upstream('otp',{body:{email,create_user:true}});
            if(r.ok){
              console.info('Email code: accepted by Supabase',r.status);
            }else{
              const {error_code:code}=await r.json().catch(()=>({}));
              const label=typeof code==='string'&&/^[a-z_]{1,64}$/.test(code)?code:'';
              console.warn('Email code: rejected by Supabase',r.status,label);
            }
          }catch(error){
            console.warn('Email code: could not reach Supabase',error.name);
          }
        }
        return login(res,{email,next,code:true});
      }
      const otp=data.get('code')??'';
      if(/^\d{6,10}$/.test(otp)&&await canEnter(email)&&throttle('verify:'+email,10,300000)){
        const r=await upstream('verify',{body:{email,token:otp,type:'email'}});
        if(r.ok){
          const {access_token:token,expires_in:ttl,user}=await r.json();
          if(user?.email?.toLowerCase()===email&&typeof token==='string'&&/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)&&Number.isFinite(ttl)&&ttl>0){
            setSession(res,token,Math.floor(Math.min(ttl,3600)));
            return redirect(res,next);
          }
        }
      }
      return login(res,{email,next,code:true,message:'That code could not be verified. Try again or request a new code.',status:401});
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(path==='/portal.css'||path==='/login.css')return staticFile(req,res,path);
    if(!(await canEnter(await signedInEmail(req))))return redirect(res,'/login?next='+encodeURIComponent(nextPage(path+url.search)));
    return staticFile(req,res,path);
  }catch(error){
    console.warn('Portal request failed',error.name);
    if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('The portal is temporarily unavailable. Please try again.');
  }
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
