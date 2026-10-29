import crypto from 'node:crypto';
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret=process.env.SKAS_SESSION_SECRET;
const configured=Boolean(url&&key&&secret&&secret.length>=32);
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function sign(payload){const data=enc(payload);return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url')}
function verify(t){if(!t||typeof t!=='string')return null;const [data,sig]=t.split('.');if(!data||!sig)return null;const expected=crypto.createHmac('sha256',secret).update(data).digest();let given;try{given=Buffer.from(sig,'base64url')}catch{return null}if(expected.length!==given.length||!crypto.timingSafeEqual(expected,given))return null;try{const v=JSON.parse(Buffer.from(data,'base64url').toString());return v.exp>Date.now()?v:null}catch{return null}}
async function db(table,method='GET',params='',body){const r=await fetch(url+'/rest/v1/'+table+params,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('Database error '+r.status);return await r.json()}
function fail(res,status,error){return res.status(status).json({error})}
export default async function handler(req,res){
 if(!configured)return fail(res,503,'Supabase is not configured. See README_SUPABASE.md');
 res.setHeader('Cache-Control','no-store');
 const action=String(req.query?.action||'');
 try{
  if(action==='login'&&req.method==='POST'){
   const {id,pin}=req.body||{};
   if(!Number.isInteger(id)||!Number.isInteger(Number(pin))||!/^\d{4}$/.test(String(pin)))return fail(res,400,'Invalid credentials');
   const rows=await db('skas_accounts','GET','?id=eq.'+id+'&select=id,full_name,role,group_name,pin_hash');
   if(!rows.length)return fail(res,401,'Неверный код');
   // pgcrypto password verification via Postgres RPC (never send hash to browser)
   const r=await fetch(url+'/rest/v1/rpc/skas_verify_pin',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({account_id:id,submitted_pin:String(pin)})});
   if(!r.ok||await r.json()!==true)return fail(res,401,'Неверный код');
   const u=rows[0];return res.json({session:sign({id:u.id,role:u.role,exp:Date.now()+8*3600e3}),user:{id:u.id,name:u.full_name,role:u.role,group:u.group_name}});
  }
  const auth=verify((req.headers.authorization||'').replace(/^Bearer /,''));
  if(!auth)return fail(res,401,'Требуется вход');
  const accounts=await db('skas_accounts','GET','?id=eq.'+auth.id+'&select=id,full_name,role,group_name');
  if(!accounts.length||accounts[0].role!==auth.role)return fail(res,401,'Аккаунт недоступен');
  const subjectId=Number(req.query?.subject_id);
  const teacherId=Number(req.query?.teacher_id);
  const studentId=Number(req.query?.student_id);
  const assignments=await db('skas_teacher_subjects','GET','?select=teacher_id,subject_id');
  const allowed=(tid,sid)=>assignments.some(x=>x.teacher_id===tid&&x.subject_id===sid);
  if(action==='teachers'&&req.method==='GET'){
   const teachers=await db('skas_accounts','GET','?role=eq.teacher&select=id,full_name');
   return res.json(teachers.map(t=>({id:t.id,name:t.full_name,subjects:assignments.filter(x=>x.teacher_id===t.id).map(x=>x.subject_id)})));
  }
  if(action==='messages'&&req.method==='GET'){
   if(!Number.isInteger(subjectId)||subjectId<1||subjectId>7)return fail(res,400,'Invalid subject');
   const sid=auth.role==='student'?auth.id:studentId,tid=auth.role==='teacher'?auth.id:teacherId;
   if(!Number.isInteger(sid)||!Number.isInteger(tid)||!allowed(tid,subjectId))return fail(res,403,'No access');
   if(auth.id!==sid&&auth.id!==tid)return fail(res,403,'No access');
   const rows=await db('skas_messages','GET',`?student_id=eq.${sid}&teacher_id=eq.${tid}&subject_id=eq.${subjectId}&select=id,sender_id,body,lesson_id,created_at&order=created_at.asc&limit=200`);
   return res.json(rows);
  }
  if(action==='messages'&&req.method==='POST'){
   const {body,subject_id,teacher_id,student_id,lesson_id}=req.body||{};
   const sid=auth.role==='student'?auth.id:Number(student_id),tid=auth.role==='teacher'?auth.id:Number(teacher_id),sub=Number(subject_id);
   if(typeof body!=='string'||body.trim().length<1||body.length>2000||!Number.isInteger(sid)||!Number.isInteger(tid)||!allowed(tid,sub))return fail(res,400,'Invalid message');
   if(auth.id!==sid&&auth.id!==tid)return fail(res,403,'No access');
   const peer=await db('skas_accounts','GET','?id=eq.'+(auth.role==='student'?tid:sid)+'&select=id,role');
   if(!peer.length||peer[0].role!==(auth.role==='student'?'teacher':'student'))return fail(res,400,'Invalid recipient');
   const rows=await db('skas_messages','POST','',{student_id:sid,teacher_id:tid,subject_id:sub,lesson_id:typeof lesson_id==='string'?lesson_id.slice(0,20):null,sender_id:auth.id,body:body.trim()});
   return res.json(rows[0]);
  }
  if(action==='students'&&req.method==='GET'){
   if(auth.role!=='teacher'||!allowed(auth.id,subjectId))return fail(res,403,'No access');
   return res.json(await db('skas_accounts','GET','?role=eq.student&select=id,full_name,group_name'));
  }
  if(action==='progress'&&req.method==='GET'){
   if(auth.role!=='student')return res.json([]);
   return res.json(await db('skas_lesson_progress','GET','?student_id=eq.'+auth.id+'&select=lesson_id'));
  }
  if(action==='progress'&&req.method==='POST'){
   if(auth.role!=='student')return fail(res,403,'Students only');
   const id=req.body?.lesson_id;
   if(typeof id!=='string'||!/^[1-7]-(?:[1-9]|1\d|20)$/.test(id))return fail(res,400,'Invalid lesson');
   await db('skas_lesson_progress','POST','?on_conflict=student_id,lesson_id',{student_id:auth.id,lesson_id:id});
   return res.json({ok:true});
  }
  return fail(res,404,'Unknown endpoint');
 }catch(e){return fail(res,500,'Server error. Check Supabase tables and environment.')}
}
