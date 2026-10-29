import seed from './demo-data.json';
import type {User,Subject,Test,Attempt,Draft,Result} from './types';
const KEY='skas_token';
export const token={get:()=>sessionStorage.getItem(KEY),set:(s:string)=>sessionStorage.setItem(KEY,s),clear:()=>sessionStorage.removeItem(KEY)};
type DemoTest=Test & {questions?:Attempt['questions']};
// DEMO ONLY: teacher PINs are visible in the client bundle. Replace with server auth before public use.
const TEACHERS=[
 {id:101,name:'Сираждин Камиль Нариманович',pin:'5578',subjects:[1,2]},
 {id:102,name:'Елубай Ерасыл Жасұзақұлы',pin:'2552',subjects:[3,4]},
 {id:103,name:'Тулеген Аида Талапқызы',pin:'3609',subjects:[5]},
 {id:104,name:'Сағидуллиев Айдар Асқарұлы',pin:'4211',subjects:[6]},
 {id:105,name:'Хамзин Альтаир Айдарұлы',pin:'9723',subjects:[7]},
];
const STUDENTS=["Абдрагимов Даниял", "Айдаров Бахытжан", "Амангелды Муратали", "Бахтиярұлы Мадияр", "Болатұлы Нариман", "Мұрат Болат", "Сабитбек Абурахман", "Турсунмахамет Абдулазиз"];
const SUBJECT_NAMES=[
 'Web-программирование и интернет-технологии',
 'Основы объектно-ориентированного программирования',
 'Программное обеспечение',
 'Программирование на языке высокого уровня',
 'Базы данных',
 'Компьютерная графика',
 'DevSecOps: Инженерия безопасного программного обеспечения'
];
const STORE='skas-v2-demo-data';
const defaultSubjects:Subject[]=SUBJECT_NAMES.map((name,i)=>({id:i+1,name,description:'Narxoz College · '+name,icon:['🌐','☕','💻','⌨️','🗄️','🎨','🛡️'][i]}));
const defaultTests:DemoTest[]=structuredClone(seed.tests).map((t:DemoTest,i:number)=>({...t,subject_id:[4,1,5,7,3][i%5],subject:SUBJECT_NAMES[[4,1,5,7,3][i%5]-1]}));
const stored=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}})();
const subjects:Subject[]=stored?.subjects||defaultSubjects;
const tests:DemoTest[]=stored?.tests||defaultTests;
const questions:Record<string,Attempt['questions']>=stored?.questions||structuredClone(seed.questions);
const attempts:Attempt[]=stored?.attempts||[];
const users:User[]=stored?.users||[];
let user:User|null=null;let next=stored?.next||2000;
function save(){localStorage.setItem(STORE,JSON.stringify({subjects,tests,questions,attempts,users,next}))}
const teacherSubjects=()=>user?.role==='teacher'?(TEACHERS.find(t=>t.id===user?.id)?.subjects||[]):subjects.map(s=>s.id);
const canManage=(subjectId:number)=>user?.role==='teacher'&&teacherSubjects().includes(subjectId);
const visibleTests=()=>tests.filter(t=>user?.role==='teacher'?canManage(t.subject_id):!!t.published);
const myAttempts=()=>attempts.filter(a=>user?.role==='teacher'?visibleTests().some(t=>t.id===a.test_id):a.student_id===user?.id);
const err=(msg:string):never=>{throw new Error(msg)};
const now=()=>Date.now()/1000;
const result=(a:Attempt):Result=>({id:a.id,test_id:a.test_id,title:a.title,subject:a.subject,started:a.started,finished:a.finished,score:a.score,earned:a.earned,total:a.total,passed:a.passed,demo:1,student:users.find(u=>u.id===a.student_id)?.name||'Студент'});
function finish(a:Attempt){if(a.finished)return;const qs=questions[String(a.test_id)]||[];a.earned=qs.reduce((n,q)=>n+(a.answers[String(q.id)]===q.correct?q.points:0),0);a.total=qs.reduce((n,q)=>n+q.points,0);a.score=a.total?Math.round(a.earned/a.total*10000)/100:0;a.passed=Number(a.score>=a.pass_score);a.finished=Math.min(now(),a.deadline);save();}
function view(a:Attempt):Attempt{if(!a.finished&&now()>=a.deadline)finish(a);return {...a,answers:{...a.answers},server_time:now(),questions:(questions[String(a.test_id)]||[]).map(q=>a.finished?{...q}:{id:q.id,text:q.text,options:[...q.options],points:q.points})};}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 await Promise.resolve();const b=(body||{}) as Record<string,any>;
 if(import.meta.env.VITE_SKAS_BACKEND==='1'&&path.startsWith('/auth/')){
  if(path==='/auth/logout'){user=null;return {ok:true} as T}
  if(path==='/auth/me'){
  const raw = sessionStorage.getItem('skas-user');

  if(!token.get() || !raw)
    err('Сессия аяқталды');

  user = JSON.parse(raw) as User;

  return user as T;
}
  if(path==='/auth/login'){
   const id=b.role==='teacher'?TEACHERS.find(t=>t.pin===String(b.code||''))?.id:STUDENTS.indexOf(String(b.name||''))+1;
   // Teachers authenticate by code only; server checks hashed PIN.
   const r=await fetch('/api/school?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,pin:String(b.code||'')})});
   const data=await r.json();if(!r.ok)err(data.error||'Кіру қатесі');
   user = {
  ...data.user,
  email: 'skas@college.local'
};

sessionStorage.setItem('skas-user', JSON.stringify(user));

return {
  token: data.session,
  user
} as T;
  }
 }

 if(path==='/auth/login'&&method==='POST'){
  if(b.role==='teacher'){
   const teacher=TEACHERS.find(t=>t.pin===String(b.code||''));
   if(!teacher)err('Оқытушы коды қате');
   user={id:teacher!.id,name:teacher!.name,email:'teacher-'+teacher!.id+'@skas.local',role:'teacher'};
  }else{
   const name=String(b.name||'').trim(),group=String(b.group||'').trim();
   const index=STUDENTS.indexOf(name);
   if(group!=='БҚ-332'||index<0||String(b.code||'')!==String(index+1).padStart(4,'0'))err('Студент, топ немесе код қате');
   let found=users.find(u=>u.role==='student'&&u.name===name&&u.group===group);
   if(!found){found={id:index+1,name,group,email:group+'@skas.local',role:'student'};users.push(found);save()}
   user=found;
  }
  return {token:'demo-'+user!.id,user} as unknown as T;
 }
 if(path==='/auth/me'){
  const id=Number((token.get()||'').replace('demo-',''));
  const t=TEACHERS.find(t=>t.id===id);
  user=t?{id:t.id,name:t.name,email:'teacher-'+t.id+'@skas.local',role:'teacher'}:users.find(u=>u.id===id)||null;
  if(!user)err('Сессия аяқталды');return user as unknown as T;
 }
 if(path==='/auth/logout'){user=null;return {ok:true} as unknown as T;}
 if(!user)err('Алдымен жүйеге кіріңіз');
 if(path==='/subjects'&&method==='GET')return subjects.filter(s=>user?.role==='student'||canManage(s.id)) as unknown as T;
 if(path==='/subjects'&&method==='POST'){err('Пәндер әкімші арқылы бекітіледі');const s={id:++next,name:b.name,description:b.description||'',icon:b.icon||'◈'};subjects.push(s);return s as unknown as T;}
 if(path==='/tests'&&method==='GET')return visibleTests().map(t=>({...t,question_count:(questions[String(t.id)]||[]).length})) as unknown as T;
 if(path==='/results')return myAttempts().filter(a=>a.finished).map(result).reverse() as unknown as T;
 if(path==='/active')return myAttempts().filter(a=>!view(a).finished).map(a=>({id:a.id,test_id:a.test_id,title:a.title,deadline:a.deadline})) as unknown as T;
 if(path==='/teacher/students'){
  if(user.role!=='teacher')err('Қолжетімсіз');
  return users.filter(u=>u.role==='student'&&attempts.some(a=>a.student_id===u.id&&visibleTests().some(t=>t.id===a.test_id))).map(u=>{const aa=attempts.filter(a=>a.student_id===u.id&&a.finished&&visibleTests().some(t=>t.id===a.test_id));return {id:u.id,name:u.name,email:u.group||'',attempts:aa.length,average:aa.length?Math.round(aa.reduce((s,a)=>s+a.score,0)/aa.length):null}}) as unknown as T;
 }
 let m=path.match(/^\/teacher\/tests\/(\d+)$/);
 if(m){if(user.role!=='teacher')err('Оқытушы ретінде кіріңіз');const id=Number(m[1]);const t=tests.find(t=>t.id===id);if(!t||!canManage(t.subject_id))err('Бұл пәнге рұқсатыңыз жоқ');
 if(method==='GET')return {...t,questions:questions[String(id)]} as unknown as T;
 if(method==='DELETE'){tests.splice(tests.indexOf(t!),1);delete questions[String(id)];save();return {ok:true} as unknown as T;}
 if(method==='PUT'){if(!canManage(Number(b.subject_id)))err('Бұл пәнге рұқсатыңыз жоқ');Object.assign(t!,b,{subject:subjects.find(s=>s.id===Number(b.subject_id))?.name});questions[String(id)]=b.questions.map((q:any)=>({...q,id:++next}));save();return t as unknown as T;}}
 if(path==='/teacher/tests'&&method==='POST'){if(user.role!=='teacher')err('Оқытушы ретінде кіріңіз');const s=subjects.find(s=>s.id===b.subject_id);if(!s||!canManage(s.id))err('Бұл пәнге рұқсатыңыз жоқ');const id=++next;const t={...b,id,subject:s.name,icon:s.icon,question_count:b.questions.length};tests.push(t);questions[String(id)]=b.questions.map((q:any)=>({...q,id:++next}));save();return t as unknown as T;}
 m=path.match(/^\/tests\/(\d+)\/start$/);
 if(m&&method==='POST'){if(user.role!=='student')err('Студент ретінде кіріңіз');const t=tests.find(t=>t.id===Number(m[1]));if(!t||!t.published)err('Тест қолжетімсіз');const old=attempts.find(a=>a.test_id===t.id&&a.student_id===user?.id&&!a.finished);if(old)return view(old) as unknown as T;const started=now();const a:Attempt={id:++next,student_id:user.id,test_id:t.id,title:t.title,subject:t.subject,questions:[],answers:{},started,deadline:started+t.duration*60,server_time:started,finished:null,score:0,earned:0,total:0,passed:0,demo:1,pass_score:t.pass_score};attempts.push(a);save();return view(a) as unknown as T;}
 m=path.match(/^\/attempts\/(\d+)(?:\/(answers|submit))?$/);
 if(m){const a=attempts.find(a=>a.id===Number(m![1]));if(!a||!(user.role==='student'?a.student_id===user.id:visibleTests().some(t=>t.id===a.test_id)))err('Қолжетімсіз');if(!a!.finished&&b.answers){a!.answers={...b.answers};save()};if(m[2]==='submit')finish(a!);return view(a!) as unknown as T;}
 return err('Демо функция табылмады: '+path);
}
