import seed from './demo-data.json';
import type {User,Subject,Test,Attempt,Draft,Result} from './types';
const KEY='skas_token';
export const token={get:()=>sessionStorage.getItem(KEY),set:(s:string)=>sessionStorage.setItem(KEY,s),clear:()=>sessionStorage.removeItem(KEY)};
type DemoTest=Test & {questions?:Attempt['questions']};
const subjects:Subject[]=structuredClone(seed.subjects);
const tests:DemoTest[]=structuredClone(seed.tests);
const questions:Record<string,Attempt['questions']>=structuredClone(seed.questions);
const attempts:Attempt[]=[];
const users:User[]=[{id:1,name:'Мадияр Бахтияр',email:'student@skas.kz',role:'student'},{id:2,name:'Айдана Мұратқызы',email:'teacher@skas.kz',role:'teacher'}];
let user:User|null=null;let next=1000;
const err=(msg:string):never=>{throw new Error(msg)};
const now=()=>Date.now()/1000;
const result=(a:Attempt):Result=>({id:a.id,test_id:a.test_id,title:a.title,subject:a.subject,started:a.started,finished:a.finished,score:a.score,earned:a.earned,total:a.total,passed:a.passed,demo:1,student:users.find(u=>u.id===1)?.name||'Студент'});
function finish(a:Attempt){if(a.finished)return;const qs=questions[String(a.test_id)]||[];a.earned=qs.reduce((n,q)=>n+(a.answers[String(q.id)]===q.correct?q.points:0),0);a.total=qs.reduce((n,q)=>n+q.points,0);a.score=a.total?Math.round(a.earned/a.total*10000)/100:0;a.passed=Number(a.score>=a.pass_score);a.finished=Math.min(now(),a.deadline);}
function view(a:Attempt):Attempt{if(!a.finished&&now()>=a.deadline)finish(a);return {...a,answers:{...a.answers},server_time:now(),questions:(questions[String(a.test_id)]||[]).map(q=>a.finished?{...q}:{id:q.id,text:q.text,options:[...q.options],points:q.points})};}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 await Promise.resolve();const b=(body||{}) as Record<string,any>;
 if(path==='/auth/login'&&method==='POST'){
 const email=String(b.email||'').toLowerCase();const found=users.find(x=>x.email===email);
 if(!found||b.password!=='Skas2026!')err('Демо кіру үшін төмендегі студент немесе оқытушы аккаунтын таңдаңыз.');
 user=found!;return {token:'demo-'+user.id,user} as unknown as T;
 }
 if(path==='/auth/register'&&method==='POST'){
 if(!b.name||!String(b.email||'').includes('@')||String(b.password||'').length<6)err('Тіркелу деректерін тексеріңіз');
 if(users.some(u=>u.email===b.email))err('Бұл email тіркелген');
 user={id:++next,name:b.name,email:b.email,role:'student'};users.push(user);return {token:'demo-'+user.id,user} as unknown as T;
 }
 if(path==='/auth/me'){const id=Number((token.get()||'').replace('demo-',''));user=users.find(u=>u.id===id)||null;if(!user)err('Демо сессия аяқталды');return user as unknown as T;}
 if(path==='/auth/logout'){user=null;return {ok:true} as unknown as T;}
 if(!user)err('Алдымен жүйеге кіріңіз');
 if(path==='/subjects'&&method==='GET')return [...subjects] as unknown as T;
 if(path==='/subjects'&&method==='POST'){if(user.role!=='teacher')err('Оқытушы ретінде кіріңіз');const s={id:++next,name:b.name,description:b.description||'',icon:b.icon||'◈'};subjects.push(s);return s as unknown as T;}
 if(path==='/tests'&&method==='GET')return tests.filter(t=>t.published||user?.role==='teacher').map(t=>({...t,question_count:(questions[String(t.id)]||[]).length})) as unknown as T;
 if(path==='/results')return attempts.filter(a=>a.finished&&(user?.role==='teacher'||user?.role==='student')).map(result).reverse() as unknown as T;
 if(path==='/active')return attempts.filter(a=>!view(a).finished).map(a=>({id:a.id,test_id:a.test_id,title:a.title,deadline:a.deadline})) as unknown as T;
 if(path==='/teacher/students')return users.filter(u=>u.role==='student').map(u=>({id:u.id,name:u.name,email:u.email,attempts:attempts.filter(a=>a.finished).length,average:attempts.filter(a=>a.finished).length?Math.round(attempts.filter(a=>a.finished).reduce((s,a)=>s+a.score,0)/attempts.filter(a=>a.finished).length):null})) as unknown as T;
 let m=path.match(/^\/teacher\/tests\/(\d+)$/);
 if(m){if(user.role!=='teacher')err('Оқытушы ретінде кіріңіз');const id=Number(m[1]);const t=tests.find(t=>t.id===id);if(!t)err('Тест табылмады');
 if(method==='GET')return {...t,questions:questions[String(id)]} as unknown as T;
 if(method==='DELETE'){tests.splice(tests.indexOf(t!),1);delete questions[String(id)];return {ok:true} as unknown as T;}
 if(method==='PUT'){Object.assign(t!,b);questions[String(id)]=b.questions.map((q:any)=>({...q,id:++next}));return t as unknown as T;}}
 if(path==='/teacher/tests'&&method==='POST'){if(user.role!=='teacher')err('Оқытушы ретінде кіріңіз');const s=subjects.find(s=>s.id===b.subject_id);if(!s)err('Пән табылмады');const id=++next;const t={...b,id,subject:s.name,icon:s.icon,question_count:b.questions.length};tests.push(t);questions[String(id)]=b.questions.map((q:any)=>({...q,id:++next}));return t as unknown as T;}
 m=path.match(/^\/tests\/(\d+)\/start$/);
 if(m&&method==='POST'){if(user.role!=='student')err('Студент ретінде кіріңіз');const t=tests.find(t=>t.id===Number(m[1]));if(!t||!t.published)err('Тест қолжетімсіз');const old=attempts.find(a=>a.test_id===t.id&&!a.finished);if(old)return view(old) as unknown as T;const started=now();const a:Attempt={id:++next,test_id:t.id,title:t.title,subject:t.subject,questions:[],answers:{},started,deadline:started+t.duration*60,server_time:started,finished:null,score:0,earned:0,total:0,passed:0,demo:1,pass_score:t.pass_score};attempts.push(a);return view(a) as unknown as T;}
 m=path.match(/^\/attempts\/(\d+)(?:\/(answers|submit))?$/);
 if(m){const a=attempts.find(a=>a.id===Number(m![1]));if(!a)err('Әрекет табылмады');if(!a!.finished&&b.answers)a!.answers={...b.answers};if(m[2]==='submit')finish(a!);return view(a!) as unknown as T;}
 return err('Демо функция табылмады: '+path);
}
