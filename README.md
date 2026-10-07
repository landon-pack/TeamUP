
App Summary: 

This product solves the problem of group project coordination. Usually people with busy schedules have a hard time managing meeting times and getting deadlines under control. This web application helps coordinate, manage deadlines, notify group members when they need a reminder to do their tasks all with the help of AI. This app has a dashboard showing current project progress and which individual tasks still need to get done. Availability is easy input-able with the help of AI

ERD: 

 <img width="856" height="557" alt="ERD401" src="https://github.com/user-attachments/assets/12d1e8ad-2593-4acd-aa46-db1e5499df35" />







Tech Stack:


Frontend: React, TypeScript, and CSS, using Vinext/Vite.

Backend: Cloudflare Workers with TypeScript API routes.

Database: Cloudflare D1 (SQLite), with Drizzle for schema and migrations.

File storage: Cloudflare R2.

This approach fits our team because the website was coded through a Codex agent which set up the whole site from our PRD and the information we had provided. It seemed like one of the more viable options available to us as we were already using AI to get everything built. It also keeps everything in one place making it easier to make adjustments if necessary.


How to Get It Running:

The website is already deployed. You do not need to install dependencies
or run a local server to use it.

1. Open the live application:
   (https://teamup-project-workspace.pthb8gkck4.chatgpt.site/).

2. Click **Sign in to get started** and sign in with your ChatGPT account.

3. Click **Create your first project**. Enter a project name, deadline,
   and optional course and description, then submit the form.

4. Open your project to add tasks, milestones, availability, and files.

5. To invite teammates, open **Team**, click **Create invite link**,
   and copy and share the link. Teammates sign in and select
   **Accept invitation** to join.

6. To return to a project later, open the same website and sign in.
   Your saved projects appear under **Your Projects**.

Users can access only projects they created or joined.





Verifying the Vertical Slice: 

Create a new project with the new project button. Name it whatever you’d like, add an optional description. Create it. Once in the project, click the add task button and assign a due date, assign it to someone, save changes. Click refresh and go back to your tasks in that project to see if the new task you created is still there.

