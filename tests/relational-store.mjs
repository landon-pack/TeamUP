// Run with Node 22+: node tests/relational-store.mjs
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync,readdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=mkdtempSync(join(tmpdir(),'teamup-tests-'));
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
class Statement{constructor(query,args=[]){this.query=query;this.args=args}bind(...args){return new Statement(this.query,args)}async first(){return sql.prepare(this.query).get(...this.args)||null}async all(){return {results:sql.prepare(this.query).all(...this.args)}}async run(){const r=sql.prepare(this.query).run(...this.args);return {meta:{changes:r.changes},results:[]}}}
const DB={prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const s of statements){if(/^\s*SELECT/i.test(s.query))results.push(await s.all());else results.push(await s.run())}sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
globalThis.testDB=DB;globalThis.actor=null;
try{
 for(const file of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
 function transpile(file,out,replacements={}){let source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;for(const [a,b] of Object.entries(replacements))source=source.replaceAll(a,b);writeFileSync(join(temp,out),source)}
 transpile('lib/invites.ts','invites.mjs',{'./store':'./store.mjs'});transpile('lib/store.ts','store.mjs');transpile('lib/conversations.ts','conversations.mjs');
 writeFileSync(join(temp,'server.mjs'),`import {getProject} from './store.mjs';export const runtime=()=>({DB:globalThis.testDB});export async function identity(){if(!globalThis.actor)throw new Error('SIGN_IN');return globalThis.actor}export const projectFor=(id,u)=>getProject(globalThis.testDB,id,u);export function sameOrigin(){}export function failure(e){return Response.json({error:e.message},{status:e.message==='SIGN_IN'?401:e.message==='NOT_FOUND'?404:e.message==='CONFLICT'?409:500})}`);
 writeFileSync(join(temp,'ai-config.mjs'),`export const aiConfigured=async()=>false;export const isSiteOwner=()=>false;`);
 transpile('app/api/workspace/route.ts','route.mjs',{'@/lib/store':'./store.mjs','@/lib/server':'./server.mjs','@/lib/ai-config':'./ai-config.mjs'});
 const store=await import(pathToFileURL(join(temp,'store.mjs'))),route=await import(pathToFileURL(join(temp,'route.mjs'))),chat=await import(pathToFileURL(join(temp,'conversations.mjs')));
 const owner=await store.ensureUser(DB,'auth-owner','owner@example.test','Owner');const member=await store.ensureUser(DB,'auth-member','member@example.test','Member');const stranger=await store.ensureUser(DB,'auth-stranger','stranger@example.test','Stranger');
 const post=async(action,project)=>{const response=await route.POST(new Request('https://test/api/workspace',{method:'POST',body:JSON.stringify({action,project})}));return {status:response.status,...await response.json()}};
 globalThis.actor=owner;
 let result=await post('create',{id:'ignored',name:'Real assignment',course:'IS 401',description:'Brief',due:'2099-12-31',version:0,reminderHours:24,members:[],milestones:[],tasks:[],availability:{}});assert.equal(result.status,200);let p=result.project;
 assert.deepEqual(p.tasks,[]);assert.equal(p.members.length,1);
 result=await post('update',{...p,members:[...p.members,{id:'new-person',name:'Member',email:member.email}],milestones:[{id:'m1',title:'Research',due:'2099-11-01',done:false}],tasks:[{id:'t1',title:'Read brief',description:'Take notes',due:'2099-10-01',status:'todo',milestone:'m1',assignee:'new-person'}],availability:{[owner.userId]:['2099-10-01T15:00:00.000Z']}});assert.equal(result.status,200);p=result.project;
 assert.equal(p.tasks[0].assignee,member.userId);assert.equal(p.tasks[0].milestone,p.milestones[0].id);assert.equal(sql.prepare('SELECT count(*) n FROM availability').get().n,1);
 assert.equal((await store.listProjects(DB,member)).length,1);assert.equal((await store.listProjects(DB,stranger)).length,0);await assert.rejects(()=>store.getProject(DB,p.id,stranger),/NOT_FOUND/);
 const stale=structuredClone(p);result=await post('update',{...p,tasks:p.tasks.map(t=>({...t,status:'done'}))});assert.equal(result.status,200);p=result.project;assert.equal((await store.getProject(DB,p.id,owner)).tasks[0].status,'done');
 assert.equal((await post('update',stale)).status,409);assert.equal((await store.getProject(DB,p.id,owner)).tasks[0].status,'done');
 // Non-owner cannot add an outsider or overwrite another user's schedule.
 globalThis.actor=member;result=await post('update',{...p,members:[...p.members,{id:stranger.userId,email:stranger.email,name:'Stranger'}],availability:{[owner.userId]:[]}});assert.equal(result.status,200);p=result.project;assert.equal(p.members.length,2);assert.equal(p.availability[owner.userId].length,1);
 globalThis.actor=owner;result=await post('update',{...p,members:p.members.filter(m=>m.id!==member.userId),tasks:p.tasks.map(t=>({...t,assignee:''}))});assert.equal(result.status,200);p=result.project;await assert.rejects(()=>store.getProject(DB,p.id,member),/NOT_FOUND/);
 // Legacy JSON migration preserves task completion and title-based milestone links.
 const legacy={id:'old',name:'Existing project',course:'Course',description:'Keep me',due:'2099-12-31',version:4,reminderHours:24,members:[{id:'auth-owner',name:'Owner',email:owner.email},{id:'legacy-member',name:'Member',email:member.email}],tasks:[{id:'1',title:'Saved task',assignee:'legacy-member',milestone:'Saved milestone',status:'done',due:'2099-11-01'}],milestones:[{id:'1',title:'Saved milestone',due:'2099-11-02',done:true}],availability:{'legacy-member':['2099-10-01T15:00:00.000Z']}};
 sql.prepare('INSERT INTO projects(id,owner,data,version) VALUES(?,?,?,?)').run('old','auth-owner',JSON.stringify(legacy),4);sql.prepare('INSERT INTO memberships(id,project_id,email) VALUES(?,?,?)').run('old-member','old',member.email);
 const migrated=await store.getProject(DB,'old',member);assert.equal(migrated.tasks[0].status,'done');assert.equal(migrated.tasks[0].milestone,migrated.milestones[0].id);assert.equal(migrated.tasks[0].assignee,member.userId);assert.equal(migrated.version,4);assert.equal((await store.getProject(DB,'old',owner)).tasks.length,1);
 const legacyMessages=[{id:'q',role:'user',content:'Help?',created:'2026-01-01T00:00:00Z'},{id:'r',role:'assistant',content:'Sure.',created:'2026-01-01T00:00:01Z'}];sql.prepare('INSERT INTO chats(id,project_id,user_id,messages) VALUES(?,?,?,?)').run('old:auth-owner','old','auth-owner',JSON.stringify(legacyMessages));const cid=await chat.conversation(DB,'old',owner);assert.equal((await chat.readMessages(DB,cid)).length,2);await chat.conversation(DB,'old',owner);assert.equal((await chat.readMessages(DB,cid)).length,2);
 result=await post('update',{...migrated,members:migrated.members.filter(m=>m.id!==member.userId),tasks:migrated.tasks.map(t=>({...t,assignee:''}))});assert.equal(result.status,200);await assert.rejects(()=>store.getProject(DB,'old',member),/NOT_FOUND/);assert.equal((await store.listProjects(DB,member)).length,0);

 const invites=await import(pathToFileURL(join(temp,'invites.mjs')));
 globalThis.actor=owner;
 const beforeInvite=await store.getProject(DB,p.id,owner);
 const link=await invites.createInvite(DB,p.id,owner);
 assert.equal(link.token.length,64);
 assert.notEqual(sql.prepare('SELECT token_hash FROM project_invites WHERE project_id=?').get(p.id).token_hash,link.token);
 await assert.rejects(()=>invites.createInvite(DB,p.id,stranger),/NOT_FOUND/);
 const preview=await invites.previewInvite(DB,link.token,stranger);assert.equal(preview.name,p.name);assert.equal(preview.alreadyMember,false);
 await invites.acceptInvite(DB,link.token,stranger);
 assert.equal((await store.listProjects(DB,stranger)).length,1);
 assert.equal((await post('update',beforeInvite)).status,409);
 const versionAfterJoin=(await store.getProject(DB,p.id,owner)).version;
 await invites.acceptInvite(DB,link.token,stranger);
 assert.equal((await store.getProject(DB,p.id,owner)).version,versionAfterJoin);
 const replacement=await invites.createInvite(DB,p.id,owner);
 await assert.rejects(()=>invites.previewInvite(DB,link.token,member),/INVITE_INVALID/);
 await assert.rejects(()=>invites.revokeInvite(DB,p.id,stranger),/NOT_FOUND/);
 await invites.revokeInvite(DB,p.id,owner);
 await assert.rejects(()=>invites.acceptInvite(DB,replacement.token,member),/INVITE_INVALID/);
 const expired=await invites.createInvite(DB,p.id,owner);
 sql.prepare('UPDATE project_invites SET expires_at=0 WHERE project_id=?').run(p.id);
 await assert.rejects(()=>invites.acceptInvite(DB,expired.token,member),/INVITE_INVALID/);
 console.log('PASS: invite authorization, hashed tokens, joining, stale membership protection, repeat acceptance, link replacement, revocation, expiry.');
 globalThis.actor=null;assert.equal((await route.GET()).status,401);
 assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);
 console.log('PASS: migrations, empty new projects, normalized saves, completion persistence, stale updates, membership isolation/removal, availability ownership, legacy data/chat migration, authentication, foreign keys.');
}finally{sql.close();rmSync(temp,{recursive:true,force:true})}
