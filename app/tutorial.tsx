'use client';
import type {Project} from '@/lib/model';
export default function Tutorial({step,project,view,filter,onAction,onNext,onBack,onClose}:{step:number;project:Project;view:string;filter:string;onAction:()=>void;onNext:()=>void;onBack:()=>void;onClose:()=>void}){
 const steps=[
 ['Create your workspace','Create a project with a name and deadline. Invite teammates once you’re ready.','Create project',!!project.id],
 ['Add a task','Give your task a clear title, choose a due date, and save it. You can assign it to a teammate.','Add a task',project.tasks.length>0],
 ['Complete a task','Check the box beside a task. It leaves the active list but stays in your completion history.','Open active tasks',project.tasks.some(t=>t.status==='done')],
 ['Explore your dashboard','Click the Completed card on Overview to open your finished tasks. All four summary cards are clickable.','Open Overview',view==='My tasks'&&filter==='done'],
 ['Bring your team together','Open Project settings to share your project. Use Team to manage members. Demo mode explains invites without creating real access.','Open Project settings',view==='Project settings'],
 ['You’re ready','Your real work saves automatically when you submit changes. Replay this guide any time from the sidebar.','',true]
 ] as const;const [title,description,action,ready]=steps[step];
 return <section className="tutorial-card" aria-label="Getting started tutorial"><div className="tutorial-top"><span>GETTING STARTED · {step+1} OF {steps.length}</span><button className="btn subtle" onClick={onClose}>Skip tutorial</button></div><h2>{title}</h2><p>{description}</p><div className="tutorial-actions">{action&&<button className="btn" onClick={onAction}>{action}</button>}{step>0&&<button className="btn subtle" onClick={onBack}>Back</button>}<button className="btn primary" disabled={!ready} onClick={onNext}>{step===steps.length-1?'Finish tutorial':ready?'Next step':'Complete the step to continue'}</button></div></section>
}
