# Task Notebook (Next.js + MongoDB Atlas + JWT + bcrypt)

Full-stack task manager with:

- User registration/login/logout
- JWT auth via secure HTTP-only cookie
- Password hashing using `bcrypt`
- Protected routes for app pages
- Task create/view/edit/delete and completion toggle
- Drag-and-drop task sorting
- Due date reminders and task categories
- User profile settings
- Dark/light mode toggle
- Real-time toast feedback

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/task_notebook?retryWrites=true&w=majority"
JWT_SECRET="replace-with-a-long-random-secret-value"
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Verify

```bash
npm run lint
npm run build
```
