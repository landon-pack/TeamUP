import type {Project} from './model';
export type Actor={userId:string;authUserId:string;email:string;displayName:string};
export const userKey=(email:string)=>'user:'+email.trim().toLowerCase();
const scoped=(project:string,id:string)=>id.startsWith(project+':')?id:project+':'+id;
export async function ensureUser(db:D1Database,authId:string,email:string,name:string){
 const id=userKey(email);
 await db.batch([db.prepare('INSERT INTO users(id,auth_id,name,email) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET auth_id=excluded.auth_id').bind(id,authId,name,email),db.prepare('INSERT OR IGNORE INTO settings(user_id) VALUES(?)').bind(id)]);
 const row=await db.prepare('SELECT name FROM users WHERE id=?').bind(id).first<{name:string}>();return {userId:id,authUserId:authId,email,displayName:row!.name};
}
export async function authorized(db:D1Database,id:string,u:Actor){return db.prepare(`SELECT * FROM projects p WHERE p.id=? AND ((p.normalized=1 AND EXISTS(SELECT 1 FROM group_members g WHERE g.group_id=p.group_id AND g.user_id=?)) OR (p.normalized=0 AND (p.owner=? OR EXISTS(SELECT 1 FROM memberships m WHERE m.project_id=p.id AND m.email=?))))`).bind(id,u.userId,u.authUserId,u.email).first<any>()}
// Lazy, atomic migration: legacy rows are kept as a backup; normalized rows become authoritative.
export async function migrateProject(db:D1Database,row:any,u:Actor){
 if(row.normalized)return;
 const old=JSON.parse(row.data) as Project;const p={...old,id:row.id,version:row.version};
 const profile=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(row.owner).first<any>();
 const ownerEmail=p.members.find(m=>m.id===row.owner)?.email||profile?.email||(row.owner===u.authUserId?u.email:'');
 if(!ownerEmail)throw new Error('Legacy project owner could not be resolved. Please ask the creator to open this project.');
 const owner=userKey(ownerEmail);const map=new Map(p.members.filter(m=>m.email).map(m=>[m.id,userKey(m.email)]));
 p.members=p.members.filter(m=>m.email).map(m=>({...m,id:userKey(m.email),email:m.email.toLowerCase()}));
 if(!p.members.some(m=>m.id===owner))p.members.push({id:owner,name:profile?.name||u.displayName,email:ownerEmail.toLowerCase()});
 p.members=Array.from(new Map(p.members.map(m=>[m.id,m])).values());
 p.milestones=p.milestones.map(m=>({...m,id:scoped(p.id,m.id)}));
 p.tasks=p.tasks.map(t=>({...t,id:scoped(p.id,t.id),assignee:map.get(t.assignee)||'',milestone:p.milestones.find(m=>m.title===t.milestone)?.id||''}));
 p.availability=Object.fromEntries(Object.entries(p.availability).filter(([id])=>map.has(id)).map(([id,slots])=>[map.get(id)!,slots]));
 const token=crypto.randomUUID(),group='group:'+p.id;
 const statements=[db.prepare('INSERT OR IGNORE INTO groups(id,name) VALUES(?,?)').bind(group,p.name),db.prepare('UPDATE projects SET group_id=?,title=?,description=?,course=?,deadline=?,reminder_hours=?,owner=?,normalized=1,write_token=? WHERE id=? AND normalized=0').bind(group,p.name,p.description||'',p.course||'',p.due,p.reminderHours||24,owner,token,p.id),...replaceRows(db,p,group,owner,token,true)];
 statements.push(db.prepare('UPDATE files SET storage_key=id WHERE project_id=? AND storage_key IS NULL').bind(p.id));
 await db.batch(statements);
}
export function replaceRows(db:D1Database,p:Project,group:string,owner:string,token:string,members:boolean,availabilityUser?:string){
 const guard='EXISTS(SELECT 1 FROM projects WHERE id=? AND write_token=?)';
 const q=(sql:string,args:any[]=[])=>db.prepare(sql).bind(...args,p.id,token);
 const out:D1PreparedStatement[]=[];
 if(members){
  for(const m of p.members){out.push(q(`INSERT INTO users(id,name,email) SELECT ?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`,[m.id,m.name,m.email.toLowerCase()]));out.push(q(`INSERT OR IGNORE INTO settings(user_id) SELECT ? WHERE ${guard}`,[m.id]));}
  out.push(q(`DELETE FROM group_members WHERE group_id=? AND ${guard}`,[group]));
  for(const m of p.members)out.push(q(`INSERT INTO group_members(group_id,user_id,role) SELECT ?,?,? WHERE ${guard}`,[group,m.id,m.id===owner?'owner':'member']));
 }
 out.push(q(`DELETE FROM tasks WHERE project_id=? AND ${guard}`,[p.id]));
 out.push(q(`DELETE FROM milestones WHERE project_id=? AND ${guard}`,[p.id]));
 for(const m of p.milestones)out.push(q(`INSERT INTO milestones(id,project_id,title,description,due_date,status) SELECT ?,?,?,?,?,? WHERE ${guard}`,[m.id,p.id,m.title,m.description||'',m.due,m.done?'done':'todo']));
 for(const t of p.tasks)out.push(q(`INSERT INTO tasks(id,project_id,assigned_user_id,milestone_id,title,description,due_date,status) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`,[t.id,p.id,t.assignee||null,t.milestone||null,t.title,t.description||'',t.due,t.status]));
 if(availabilityUser)out.push(q(`DELETE FROM availability WHERE project_id=? AND user_id=? AND ${guard}`,[p.id,availabilityUser]));
 else out.push(q(`DELETE FROM availability WHERE project_id=? AND ${guard}`,[p.id]));
 for(const [id,slots]of Object.entries(p.availability)){if(availabilityUser&&id!==availabilityUser)continue;for(const slot of slots)out.push(q(`INSERT INTO availability(id,user_id,project_id,start_at,end_at) SELECT ?,?,?,?,? WHERE ${guard}`,[crypto.randomUUID(),id,p.id,slot,new Date(Date.parse(slot)+3600000).toISOString()]));}
 // Remove availability belonging to users removed from this project's group.
 if(members)out.push(q(`DELETE FROM availability WHERE project_id=? AND user_id NOT IN (SELECT user_id FROM group_members WHERE group_id=?) AND ${guard}`,[p.id,group]));
 return out;
}
export async function readProject(db:D1Database,id:string):Promise<Project>{
 const r=await db.prepare('SELECT * FROM projects WHERE id=?').bind(id).first<any>();
 const results=await db.batch([db.prepare('SELECT u.id,u.name,u.email FROM users u JOIN group_members g ON g.user_id=u.id WHERE g.group_id=? ORDER BY g.role DESC,u.name').bind(r.group_id),db.prepare('SELECT * FROM tasks WHERE project_id=? ORDER BY due_date,id').bind(id),db.prepare('SELECT * FROM milestones WHERE project_id=? ORDER BY due_date,id').bind(id),db.prepare('SELECT * FROM availability WHERE project_id=? ORDER BY start_at').bind(id)]);
 const slots:Record<string,string[]>={};for(const a of results[3].results as any[])(slots[a.user_id]??=[]).push(a.start_at);
 return {id,name:r.title,description:r.description,course:r.course,due:r.deadline,owner:r.owner,version:r.version,groupId:r.group_id,reminderHours:r.reminder_hours,members:results[0].results as any,tasks:(results[1].results as any[]).map(t=>({id:t.id,title:t.title,description:t.description,assignee:t.assigned_user_id||'',milestone:t.milestone_id||'',due:t.due_date,status:t.status})),milestones:(results[2].results as any[]).map(m=>({id:m.id,title:m.title,description:m.description,due:m.due_date,done:m.status==='done'})),availability:slots};
}
export async function getProject(db:D1Database,id:string,u:Actor){const row=await authorized(db,id,u);if(!row)throw new Error('NOT_FOUND');await migrateProject(db,row,u);return readProject(db,id)}
export async function listProjects(db:D1Database,u:Actor){const rows=await db.prepare(`SELECT p.id FROM projects p WHERE (p.normalized=1 AND EXISTS(SELECT 1 FROM group_members g WHERE g.group_id=p.group_id AND g.user_id=?)) OR (p.normalized=0 AND (p.owner=? OR EXISTS(SELECT 1 FROM memberships m WHERE m.project_id=p.id AND m.email=?)))`).bind(u.userId,u.authUserId,u.email).all<{id:string}>();const out:Project[]=[];for(const r of rows.results)out.push(await getProject(db,r.id,u));return out}
