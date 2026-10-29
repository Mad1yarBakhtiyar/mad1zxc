import React, {useEffect, useRef, useState} from 'react';
import {Sun, Moon, Monitor} from 'lucide-react';

/** Shared surface primitives. Styles and browser fallbacks live in liquid-glass.css. */
export function GlassCard({className='',...props}:React.ComponentProps<'section'>){
 return <section className={`panel glass-card ${className}`} {...props}/>;
}
export function GlassButton({className='',variant='secondary',...props}:React.ComponentProps<'button'>&{variant?:'primary'|'secondary'}){
 return <button className={`glass-button ${variant} ${className}`} {...props}/>;
}
export function GlassInput({className='',...props}:React.ComponentProps<'input'>){
 return <input className={`glass-input ${className}`} {...props}/>;
}
export function GlassSidebar({className='',...props}:React.ComponentProps<'aside'>){
 return <aside className={`sidebar ${className}`} {...props}/>;
}
export function GlassModal({className='',children,onDismiss,...props}:React.ComponentProps<'section'>&{onDismiss:()=>void}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const focusable=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')||[]);
  (focusable()[0]||ref.current)?.focus();
  function handle(e:KeyboardEvent){
   if(e.key==='Escape'){e.preventDefault();onDismiss()}
   if(e.key==='Tab'){const nodes=focusable();const first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();return}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  }
  document.addEventListener('keydown',handle);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',handle);document.body.style.overflow=overflow;previous?.focus()};
 },[onDismiss]);
 return <section {...props} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={`modal ${className}`}>{children}</section>;
}
export function ThemeToggle(){
 const [mode,setMode]=useState<'system'|'dark'|'light'>(()=>{const saved=localStorage.getItem('skas-theme');return saved==='light'||saved==='dark'||saved==='system'?saved:'dark'});
 useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const update=()=>{document.documentElement.dataset.theme=mode==='system'?(media.matches?'dark':'light'):mode};update();media.addEventListener('change',update);localStorage.setItem('skas-theme',mode);return()=>media.removeEventListener('change',update)},[mode]);
 useEffect(()=>{const sync=(e:Event)=>setMode((e as CustomEvent<'system'|'dark'|'light'>).detail);window.addEventListener('skas-theme-change',sync);return()=>window.removeEventListener('skas-theme-change',sync)},[]);
 return <div className="glass-theme-switch" role="group" aria-label="Тема оформления">{([{id:'light',label:'Светлая тема',Icon:Sun},{id:'system',label:'Системная тема',Icon:Monitor},{id:'dark',label:'Тёмная тема',Icon:Moon}] as const).map(({id,label,Icon})=><button key={id} type="button" aria-label={label} title={label} aria-pressed={mode===id} className={mode===id?'chosen':''} onClick={()=>window.dispatchEvent(new CustomEvent('skas-theme-change',{detail:id}))}><Icon size={16}/></button>)}</div>;
}
