'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project } from '@/lib/model';

const MOBILE_QUERY = '(max-width: 760px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return mobile;
}

function focusTutorialStep(selector: string) {
  document.querySelectorAll('.tutorial-focus').forEach((node) => node.classList.remove('tutorial-focus'));
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('tutorial-focus');
}

export default function Tutorial({
  step,
  project,
  view,
  filter,
  modal,
  onNext,
  onBack,
  onClose,
}: {
  step: number;
  project: Project;
  view: string;
  filter: string;
  modal: string;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const mobile = useIsMobile();
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mobilePhase, setMobilePhase] = useState<'guide' | 'practice'>('guide');
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [navConfirmedFor, setNavConfirmedFor] = useState<number | null>(null);
  const [mobileMenuOpenedFor, setMobileMenuOpenedFor] = useState<number | null>(null);
  const [clickedTarget, setClickedTarget] = useState('');
  const autoAdvancedFor = useRef<number | null>(null);
  useEffect(() => setPortalHost(document.body), []);
  const doneTaskCount = project.tasks.filter((task) => task.status === 'done').length;
  const [baseline, setBaseline] = useState(() => ({
    step,
    projectId: project.id,
    taskCount: project.tasks.length,
    doneCount: doneTaskCount,
  }));
  const stepBaseline = baseline.step === step ? baseline : {
    step,
    projectId: project.id,
    taskCount: project.tasks.length,
    doneCount: doneTaskCount,
  };

  const steps = [
    {
      title: 'Create your workspace',
      nav: 'Overview',
      target: 'create-project',
      modalTarget: 'create-project-save',
      modalName: 'project',
      modalText: 'Name your project and choose a deadline, then save it.',
      ready: !!project.id && project.id !== stepBaseline.projectId,
      actionText: 'Open your projects menu and choose “New project.”',
    },
    {
      title: 'Add a task',
      nav: 'My tasks',
      target: 'add-task',
      modalTarget: 'add-task-save',
      modalName: 'task',
      modalText: 'Give the task a title and due date, then save it.',
      ready: project.id === stepBaseline.projectId && project.tasks.length > stepBaseline.taskCount,
      actionText: 'Click “Add task” to open the task form.',
    },
    {
      title: 'Complete a task',
      nav: 'My tasks',
      target: 'complete-task',
      modalTarget: '',
      modalName: '',
      modalText: '',
      ready: doneTaskCount > stepBaseline.doneCount,
      actionText: 'Click the highlighted checkbox to complete a task.',
    },
    {
      title: 'Explore your dashboard',
      nav: 'Overview',
      target: 'completed-card',
      modalTarget: '',
      modalName: '',
      modalText: '',
      ready: view === 'My tasks' && filter === 'done',
      actionText: 'Click the Completed card to see finished work.',
    },
    {
      title: 'Bring your team together',
      nav: 'Team',
      target: 'team-member',
      modalTarget: '',
      modalName: 'teammate',
      modalText: '',
      ready: modal === 'teammate',
      actionText: 'Click a teammate to see their assigned work.',
    },
    {
      title: 'You’re ready',
      nav: '',
      target: 'help-button',
      modalTarget: '',
      modalName: '',
      modalText: '',
      ready: true,
      actionText: 'If you ever need help, click the question mark in the top-right corner.',
    },
  ] as const;
  const current = steps[step];
  const actionComplete =
    current.ready &&
    clickedTarget === (current.modalTarget || current.target);
  const needsNavigation = !!current.nav && view !== current.nav && navConfirmedFor !== step;
  const phase = mobile && needsNavigation && mobileMenuOpenedFor !== step
    ? 'menu'
    : needsNavigation
    ? 'navigation'
    : current.modalTarget && modal === current.modalName
      ? 'modal'
      : actionComplete
        ? 'complete'
        : 'action';
  const body =
    phase === 'menu'
      ? `Open the hamburger menu, then choose “${current.nav}.” We’ll highlight that page next.`
      : phase === 'navigation'
      ? `Choose “${current.nav}” from the hamburger menu. We’ll point out the next control when you get there.`
      : phase === 'modal'
        ? current.modalText || 'Complete this form to continue.'
        : phase === 'complete'
          ? 'You’ve completed this step. Continue when you’re ready.'
          : current.actionText;

  useEffect(() => {
    document.body.classList.add('tutorial-running');
    if (mobile) document.body.classList.add('tutorial-mobile');
    else document.body.classList.remove('tutorial-mobile');
    return () => {
      document.body.classList.remove('tutorial-running', 'tutorial-mobile');
    };
  }, [mobile]);

  useEffect(() => {
    if (baseline.step === step) return;
    setMobilePhase('guide');
    setDesktopHidden(false);
    setClickedTarget('');
    autoAdvancedFor.current = null;
    setBaseline({
      step,
      projectId: project.id,
      taskCount: project.tasks.length,
      doneCount: doneTaskCount,
    });
  }, [baseline.step, step, project.id, project.tasks.length, doneTaskCount]);

  useEffect(() => {
    if (!portalHost || pos || desktopHidden || mobilePhase === 'practice') return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top });
  }, [portalHost, pos, desktopHidden, mobilePhase]);

  useEffect(() => {
    const selector = phase === 'navigation'
      ? `[data-tutorial-nav="${current.nav}"]`
      : phase === 'menu'
        ? '[data-tutorial-menu-trigger]'
      : phase === 'modal'
        ? `[data-tutorial-target="${current.modalTarget}"]`
        : phase === 'action' && current.target
          ? `[data-tutorial-target="${current.target}"]`
          : '';
    const focusDelay = phase === 'navigation' && mobile ? 280 : 140;
    const timer = selector ? window.setTimeout(() => focusTutorialStep(selector), focusDelay) : undefined;
    return () => {
      if (timer) window.clearTimeout(timer);
      document
        .querySelectorAll('.tutorial-focus')
        .forEach((node) => node.classList.remove('tutorial-focus'));
    };
  }, [step, phase, current.nav, current.target, current.modalTarget, mobile]);

  useEffect(() => {
    if (!mobile || !current.nav) return;
    const trigger = document.querySelector('[data-tutorial-menu-trigger]');
    if (!(trigger instanceof HTMLElement)) return;
    const markMenuOpened = () => setMobileMenuOpenedFor(step);
    trigger.addEventListener('click', markMenuOpened);
    return () => trigger.removeEventListener('click', markMenuOpened);
  }, [mobile, step, current.nav]);

  useEffect(() => {
    if (!actionComplete || !current.target || step === steps.length - 1) return;
    if (current.modalTarget && modal === current.modalName) return;
    if (autoAdvancedFor.current === step) return;
    autoAdvancedFor.current = step;
    onNext();
  }, [actionComplete, current.modalName, current.modalTarget, current.target, modal, onNext, step, steps.length]);

  useEffect(() => {
    const targetName = phase === 'modal' ? current.modalTarget : phase === 'action' ? current.target : '';
    if (!targetName) return;
    const target = document.querySelector(`[data-tutorial-target="${targetName}"]`);
    if (!(target instanceof HTMLElement)) return;
    const recordClick = () => setClickedTarget(targetName);
    target.addEventListener('click', recordClick);
    return () => target.removeEventListener('click', recordClick);
  }, [step, phase, current.target, current.modalTarget]);

  useEffect(() => {
    if (phase !== 'modal' || !current.modalName || !current.modalTarget) return;
    const form = document.querySelector(`[data-tutorial-form="${current.modalName}"]`);
    if (!(form instanceof HTMLFormElement)) return;
    const recordSubmit = () => setClickedTarget(current.modalTarget);
    form.addEventListener('submit', recordSubmit);
    return () => form.removeEventListener('submit', recordSubmit);
  }, [phase, current.modalName, current.modalTarget]);

  useEffect(() => {
    if (!current.nav) return;
    const target = document.querySelector(`[data-tutorial-nav="${current.nav}"]`);
    if (!(target instanceof HTMLElement)) return;
    const confirmNavigation = () => setNavConfirmedFor(step);
    target.addEventListener('click', confirmNavigation);
    return () => target.removeEventListener('click', confirmNavigation);
  }, [step, current.nav, mobileMenuOpenedFor]);

  useEffect(() => {
    function keepInBounds() {
      const card = cardRef.current;
      if (!card || !pos) return;
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const next = {
        x: Math.min(Math.max(8, pos.x), maxX),
        y: Math.min(Math.max(8, pos.y), maxY),
      };
      if (next.x !== pos.x || next.y !== pos.y) setPos(next);
    }
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [mobile, pos]);

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (mobile) {
      if (!target.closest('.tutorial-drag-handle')) return;
    } else if (target.closest('button, a, input, textarea, select')) {
      return;
    }
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setPos({ x: rect.left, y: rect.top });
    setDragging(true);
    card.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const card = cardRef.current;
    if (!drag || !card || drag.pointerId !== event.pointerId) return;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    setPos({
      x: Math.min(Math.max(8, event.clientX - drag.offsetX), maxX),
      y: Math.min(Math.max(8, event.clientY - drag.offsetY), maxY),
    });
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      cardRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  function goBack() {
    setNavConfirmedFor(null);
    setMobileMenuOpenedFor(null);
    onBack();
  }

  if (mobile && mobilePhase === 'practice') {
    return portalHost ? createPortal((
      <div className='tutorial-mobile-chip' role='status'>
        <div>
          <strong>
            Step {step + 1}/{steps.length}
          </strong>
          <span>{current.title}</span>
        </div>
        <div className='tutorial-mobile-chip-actions'>
          <button type='button' className='btn subtle' onClick={() => setMobilePhase('guide')}>
            Tip
          </button>
          {step === steps.length - 1 ? (
            <button type='button' className='btn primary' onClick={onNext}>Finish</button>
          ) : <span className='tutorial-waiting'>Click the highlight</span>}
        </div>
      </div>
    ), portalHost) : null;
  }

  if (!mobile && desktopHidden) {
    return portalHost ? createPortal((
      <div className='tutorial-desktop-chip' role='status'>
        <div>
          <strong>
            Step {step + 1}/{steps.length}
          </strong>
          <span>{current.title}</span>
        </div>
        <div className='tutorial-desktop-chip-actions'>
          <button type='button' className='btn subtle' onClick={() => setDesktopHidden(false)}>
            Show tip
          </button>
          {step === steps.length - 1 ? (
            <button type='button' className='btn primary' onClick={onNext}>Finish</button>
          ) : <span className='tutorial-waiting'>Click the highlight</span>}
        </div>
      </div>
    ), portalHost) : null;
  }

  return portalHost ? createPortal((
    <>
      {!mobile && (
        <div className='tutorial-banner' role='status'>
          <span className='tutorial-live'>Tutorial</span>
          <span>
            Tutorial in progress · Step {step + 1} of {steps.length}
          </span>
        </div>
      )}
      <section
        ref={cardRef}
        className={
          'tutorial-card' +
          (mobile ? ' mobile' : '') +
          (phase === 'modal' ? ' modal-step' : '') +
          (dragging ? ' dragging' : '') +
          (pos ? ' positioned' : '')
        }
        aria-label='Tutorial walkthrough'
        role='dialog'
        aria-modal='false'
        tabIndex={-1}
        style={pos ? {
          left: pos.x,
          top: pos.y,
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
          ...(mobile ? { width: 'calc(100vw - 24px)' } : {}),
        } : undefined}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className='tutorial-drag-handle' title='Drag to move the tutorial panel' aria-label='Drag to move the tutorial panel'>
          <span />
          <span />
          <span />
        </div>
        <div className='tutorial-progress' aria-hidden='true'>
          {steps.map((_, index) => (
            <span
              key={index}
              className={index === step ? 'active' : index < step ? 'done' : undefined}
            />
          ))}
        </div>
        <div className='tutorial-top'>
          <span>
            <span className='tutorial-live'>Tutorial</span>
            Step {step + 1} of {steps.length}
          </span>
          <button className='btn subtle' onClick={onClose}>
            {mobile ? 'Skip' : 'Skip tutorial'}
          </button>
        </div>
        <p className='tutorial-drag-hint'>
          {mobile
            ? 'Drag the handle to move this panel. Follow the hamburger menu highlight, then tap the page highlight.'
            : 'Drag the handle to move this panel anywhere on the screen.'}
        </p>
        <h2>{current.title}</h2>
        <p>{body}</p>
        <div className='tutorial-actions'>
          {step > 0 && (
            <button className='btn subtle' onClick={goBack}>
              Back
            </button>
          )}
          {step === steps.length - 1 ? (
            <button className='btn primary' onClick={onNext}>Finish</button>
          ) : <span className='tutorial-waiting'>Click the highlighted control to continue</span>}
          <button
            type='button'
            className='btn subtle'
            onClick={() => {
              if (phase === 'menu') focusTutorialStep('[data-tutorial-menu-trigger]');
              else if (phase === 'navigation') focusTutorialStep(`[data-tutorial-nav="${current.nav}"]`);
              else if (phase === 'modal') focusTutorialStep(`[data-tutorial-target="${current.modalTarget}"]`);
              else if (phase === 'action' && current.target) focusTutorialStep(`[data-tutorial-target="${current.target}"]`);
              if (mobile) setMobilePhase('practice');
              else setDesktopHidden(true);
            }}
          >
            Hide tip & try it
          </button>
        </div>
      </section>
    </>
  ), portalHost) : null;
}
