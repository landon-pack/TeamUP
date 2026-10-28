import { future, type Project } from './model';
export const demoUser = { id: 'demo-visitor', name: 'Demo visitor', email: 'demo@example.test' };
export function practiceProject(): Project {
  return {
    id: 'practice',
    owner: demoUser.id,
    name: 'Practice project',
    course: 'DEMO WORKSPACE',
    description:
      'Try adding and completing tasks. These practice changes reset when you leave or reload the demo.',
    due: future(14),
    version: 0,
    reminderHours: 24,
    members: [demoUser],
    milestones: [
      { id: 'practice:milestone', title: 'Prepare the presentation', due: future(7), done: false },
    ],
    tasks: [
      {
        id: 'practice:task1',
        title: 'Add your ideas to the outline',
        description: 'Open this task to edit its details.',
        due: future(2),
        assignee: demoUser.id,
        milestone: 'practice:milestone',
        status: 'todo',
      },
      {
        id: 'practice:task2',
        title: 'Gather supporting research',
        due: future(4),
        assignee: demoUser.id,
        milestone: 'practice:milestone',
        status: 'progress',
      },
    ],
    availability: {},
  };
}
