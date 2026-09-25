import {runtime} from '@/lib/server';
const encoder=new TextEncoder();
function decode(s:string){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function encode(b:Uint8Array){return btoa(String.fromCharCode(...b))}
async function wrappingKey(){const secret=runtime().AI_CONFIG_ENCRYPTION_KEY;if(!secret)throw new Error('AI setup is unavailable');return crypto.subtle.importKey('raw',decode(secret),'AES-GCM',false,['encrypt','decrypt'])}
export async function sealKey(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await wrappingKey(),encoder.encode(value));return encode(iv)+'.'+encode(new Uint8Array(cipher))}
export async function geminiKey(){const {DB,GEMINI_API_KEY}=runtime();if(GEMINI_API_KEY)return GEMINI_API_KEY;const row=await DB.prepare('SELECT sealed_key FROM ai_config WHERE id=?').bind('gemini').first<{sealed_key:string}>();if(!row)return null;const [iv,cipher]=row.sealed_key.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await wrappingKey(),decode(cipher)))}
export async function aiConfigured(){if(runtime().GEMINI_API_KEY)return true;const row=await runtime().DB.prepare('SELECT id FROM ai_config WHERE id=?').bind('gemini').first();return !!row}
export function isSiteOwner(email:string){return !!runtime().SITE_OWNER_EMAIL&&email.toLowerCase()===runtime().SITE_OWNER_EMAIL!.toLowerCase()}
