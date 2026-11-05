// Local integration-test fixture only. Never imported by application code.
import http from 'node:http';
import {randomBytes} from 'node:crypto';
const sessions = new Map();
const users = [1,2].map(number => ({id:`00000000-0000-4000-8000-00000000000${number}`, email:`qa${number}@example.test`, aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-11-05T00:00:00Z',created_at:'2026-11-05T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}}));
const session = user => {
  const now=Math.floor(Date.now()/1000);
  const token = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,email:user.email,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'})).toString('base64url'),randomBytes(32).toString('base64url')].join('.');
  sessions.set(token,user);
  return {access_token:token,refresh_token:randomBytes(32).toString('hex'),token_type:'bearer',expires_in:3600,expires_at:now+3600,user};
};
const server=http.createServer(async (request,response) => {
  const parts=[]; for await(const part of request) parts.push(part);
  let input={}; try { input=JSON.parse(Buffer.concat(parts).toString() || '{}'); } catch {}
  const path=new URL(request.url,'http://127.0.0.1').pathname;
  const user=sessions.get((request.headers.authorization || '').replace(/^Bearer /i,''));
  const send=(code,body) => {response.writeHead(code,{'Content-Type':'application/json'});response.end(JSON.stringify(body));};
  if(path==='/auth/v1/token') {
    const account=users.find(value=>value.email===input.email);
    return account && input.password==='synthetic-test-password' ? send(200,session(account)) : send(400,{code:'invalid_credentials',msg:'Invalid login credentials'});
  }
  if(path==='/auth/v1/user') return user ? send(200,user) : send(401,{code:'bad_jwt',msg:'Invalid JWT'});
  if(path==='/auth/v1/logout') {sessions.delete((request.headers.authorization || '').replace(/^Bearer /i,''));return send(200,{});}
  if(path==='/auth/v1/recover') return send(200,{});
  if(path==='/auth/v1/signup') return send(200,{...users[0],email:input.email,email_confirmed_at:undefined});
  return send(404,{msg:'Test endpoint not implemented'});
});
server.listen(54390,'127.0.0.1',()=>console.log('Local auth test fixture: http://127.0.0.1:54390'));
