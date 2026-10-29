// Isolated regression checks: memory storage + mocked HTTP. Never touches Supabase.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'skas-check-'));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
let checks=0;
function ok(name){checks++;console.log('PASS '+name)}
try {
 const out=join(temp,'api.mjs');
 await build({entryPoints:['api.ts'],bundle:true,format:'esm',platform:'node',outfile:out,define:{'import.meta.env.VITE_SKAS_BACKEND':'"0"'}});
 const {api,token}=await import(pathToFileURL(out));
 await assert.rejects(()=>api('/subjects'));ok('Unauthenticated API rejected');
 await assert.rejects(()=>api('/auth/login','POST',{role:'student',name:'Unknown',group:'БҚ-332',code:'0000'}));ok('Invalid credentials rejected');
 const source=await readFile('api.ts','utf8');
 const studentNames=JSON.parse(source.match(/const STUDENTS=(\[[^;]+\]);/)[1]);
 for(let i=0;i<studentNames.length;i++){
  const auth=await api('/auth/login','POST',{role:'student',name:studentNames[i],group:'БҚ-332',code:String(i+1).padStart(4,'0')});
  token.set(auth.token);assert.equal(auth.user.role,'student');assert.equal(auth.user.id,i+1);
 }
 ok('All 8 existing student accounts authenticate');
 const student=await api('/auth/login','POST',{role:'student',name:studentNames[0],group:'БҚ-332',code:'0001'});token.set(student.token);
 assert.equal((await api('/auth/me')).id,1);assert.equal((await api('/subjects')).length,7);ok('Session restoration and 7 subjects');
 await assert.rejects(()=>api('/teacher/students'));await assert.rejects(()=>api('/teacher/tests','POST',{}));ok('Student denied teacher operations');
 const tests=await api('/tests');assert(tests.length);assert(tests.every(x=>x.published));
 const a=await api(`/tests/${tests[0].id}/start`,'POST');assert(a.questions.length);assert(a.questions.every(q=>q.correct===undefined));
 assert.equal((await api(`/tests/${tests[0].id}/start`,'POST')).id,a.id);ok('Start/resume exam, active answers hidden');
 await api(`/attempts/${a.id}/answers`,'PUT',{answers:{[a.questions[0].id]:0}});assert.equal((await api(`/attempts/${a.id}`)).answers[a.questions[0].id],0);ok('Answer autosave API');
 const seed=JSON.parse(await readFile('demo-data.json','utf8'));const qs=seed.questions[String(tests[0].id)];
 const answers=Object.fromEntries(qs.map(q=>[q.id,q.correct]));const finished=await api(`/attempts/${a.id}/submit`,'POST',{answers});
 assert.equal(finished.score,100);assert(finished.passed);assert(finished.finished);assert(finished.questions.every(q=>Number.isInteger(q.correct)));assert.equal((await api('/results')).length,1);ok('Automatic grading, review and result history');
 const resumed=await api(`/tests/${tests[0].id}/start`,'POST');const originalNow=Date.now;Date.now=()=>originalNow()+24*3600e3;
 assert((await api(`/attempts/${resumed.id}`)).finished);Date.now=originalNow;ok('Expired attempt automatically completed');
 const teacherBlock=source.match(/const TEACHERS=(\[[\s\S]*?\]);/)[1];
 // Literal source fixture is trusted project code; PIN values never printed.
 const teachers=Function('return ('+teacherBlock+')')();
 for(const t of teachers){
  const auth=await api('/auth/login','POST',{role:'teacher',code:t.pin});token.set(auth.token);
  assert.equal(auth.user.id,t.id);assert.equal(auth.user.role,'teacher');
  assert.deepEqual((await api('/subjects')).map(s=>s.id),t.subjects);
  assert((await api('/tests')).every(x=>t.subjects.includes(x.subject_id)));
 }
 ok('All 5 teachers retain original subject assignments');
 await api('/auth/login','POST',{role:'teacher',code:teachers[0].pin});
 const draft={subject_id:1,title:'QA disposable test',description:'Memory only',duration:10,pass_score:60,published:false,questions:[{text:'QA question',options:['A','B','C','D'],correct:0,explanation:'QA',points:1}]};
 const created=await api('/teacher/tests','POST',draft);assert.equal((await api(`/teacher/tests/${created.id}`)).title,draft.title);
 await api(`/teacher/tests/${created.id}`,'PUT',{...draft,title:'QA updated'});assert.equal((await api(`/teacher/tests/${created.id}`)).title,'QA updated');
 await assert.rejects(()=>api(`/teacher/tests/${created.id}`,'PUT',{...draft,subject_id:7}));
 await api(`/teacher/tests/${created.id}`,'DELETE');assert(!(await api('/tests')).some(x=>x.id===created.id));ok('Teacher creates/edits/removes own test; other subject denied');
 const lessons=JSON.parse(await readFile('learning-data.json','utf8'));assert.equal(lessons.length,7);assert.equal(lessons.flatMap(x=>x.lessons).length,140);
 for(const c of lessons){assert.equal(c.lessons.length,20);for(const l of c.lessons){assert(l.title.ru&&l.title.kz&&l.theory.ru&&l.theory.kz);assert(l.quiz.options.ru[l.quiz.correct]);assert(l.quiz.options.kz[l.quiz.correct])}}
 ok('All 140 lessons retain RU/KZ text and valid quizzes');
 const call=async(handler,req)=>{let status=200,body;const res={setHeader(){},status(s){status=s;return this},json(b){body=b;return this}};await handler({headers:{},query:{},...req},res);return {status,body}};
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SKAS_SESSION_SECRET;
 const {default:unconfigured}=await import(pathToFileURL(join(process.cwd(),'api/school.js'))+'?missing');assert.equal((await call(unconfigured,{method:'GET'})).status,503);ok('Server safely reports missing Supabase configuration');
 process.env.SUPABASE_URL='https://mock.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='qa-not-a-real-key';process.env.SKAS_SESSION_SECRET='qa-isolated-session-secret-32-characters';
 const {default:school}=await import(pathToFileURL(join(process.cwd(),'api/school.js'))+'?mocked');
 let requests=[];let storedMessages=[];let storedProgress=[];
 globalThis.fetch=async(url,init={})=>{
  requests.push({url,method:init.method||'GET'});
  const u=new URL(url),method=init.method||'GET';const json=x=>({ok:true,json:async()=>x});
  if(u.pathname.endsWith('/rpc/skas_verify_pin'))return json(true);
  if(u.pathname.endsWith('/skas_accounts')){if(u.searchParams.get('role')==='eq.teacher')return json([{id:101,full_name:'QA Teacher'}]);if(u.searchParams.get('role')==='eq.student')return json([{id:1,full_name:'QA Student',group_name:'QA'}]);const id=Number(u.searchParams.get('id')?.slice(3));return json([{id,full_name:'QA',role:id===101?'teacher':'student',group_name:'QA'}])}
  if(u.pathname.endsWith('/skas_teacher_subjects'))return json([{teacher_id:101,subject_id:1}]);
  if(u.pathname.endsWith('/skas_messages')){if(method==='POST'){storedMessages.push({id:1,...JSON.parse(init.body),created_at:'2026-10-29T00:00:00Z'})}return json(storedMessages)}
  if(u.pathname.endsWith('/skas_lesson_progress')){if(method==='POST')storedProgress.push(JSON.parse(init.body));return json(storedProgress)}
  throw Error('Unexpected mock request');
 };
 assert.equal((await call(school,{method:'GET',query:{action:'messages'}})).status,401);ok('Server rejects missing session');
 const login=await call(school,{method:'POST',query:{action:'login'},body:{id:1,pin:'1234'}});assert.equal(login.status,200);assert(login.body.session);assert(!JSON.stringify(login.body).includes('pin_hash'));
 const headers={authorization:'Bearer '+login.body.session};ok('Server login with mocked PIN verification');
 assert.equal((await call(school,{method:'GET',query:{action:'teachers'},headers})).body[0].subjects[0],1);
 assert.equal((await call(school,{method:'GET',query:{action:'messages',subject_id:7,teacher_id:101,student_id:1},headers})).status,403);
 assert.equal((await call(school,{method:'GET',query:{action:'students',subject_id:1},headers})).status,403);ok('Server enforces teacher/discipline and role access');
 const message=await call(school,{method:'POST',query:{action:'messages'},headers,body:{body:'QA message',teacher_id:101,subject_id:1}});assert.equal(message.status,200);
 const read=await call(school,{method:'GET',query:{action:'messages',subject_id:1,teacher_id:101},headers});assert.equal(read.body[0].body,'QA message');
 assert.equal((await call(school,{method:'POST',query:{action:'progress'},headers,body:{lesson_id:'1-1'}})).status,200);
 assert.equal((await call(school,{method:'GET',query:{action:'progress'},headers})).body[0].lesson_id,'1-1');
 assert.equal((await call(school,{method:'POST',query:{action:'progress'},headers,body:{lesson_id:'99-99'}})).status,400);ok('Messages and lesson progress work against in-memory mocked Supabase');
 delete process.env.OPENAI_API_KEY;const {default:chat}=await import(pathToFileURL(join(process.cwd(),'api/chat.js')));
 assert.equal((await call(chat,{method:'GET'})).status,405);assert.equal((await call(chat,{method:'POST'})).status,503);ok('AI route exports handler; missing API key handled');
 console.log(`\n${checks} regression groups passed. All writes stayed in memory; zero live database requests.`);
} finally {await rm(temp,{recursive:true,force:true})}
