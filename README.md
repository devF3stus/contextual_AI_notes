
A clean, modern, and resilient personal knowledge management web application. Designed for uninterrupted long-form writing, structured organization, and rapid thought capture with automatic pagination, contextual sticky notes, and full-stack authentication.

---

 Key Features

 Smart Multi-Page Note Editor
  - Rich-text writing powered by TipTap (formatting, headers, lists, links, emphasis).
  - **Intelligent Automatic Pagination**: Automatically flows overflowing content into consecutive pages when pasting or typing large volumes of text—preserving data integrity across page creation, switching, and reloading.
  - Independent persistent state for every page with manual page creation and reordering.

 Knowledge Partitions & Organization
  - Organize your workspace into distinct partitions/notebooks with real-time note counts.
  - Instant full-text search across titles and content.
  - Simple modal workflows to create, rename, and delete partitions.

   Contextual Sticky Notes
  - Floating sticky notes embedded alongside your documents for quick brainstorms, checklists, and side-notes.

   Robust Autosave & Data Resilience
  - Debounced background autosave with visual save status indicators (`Saving...`, `Saved`, `Ctrl+S`).
  - Seamless handling of concurrent state transitions, note creation, and server sync.

   Themes & Background Personalization
  - First-class Dark and Light mode with instant toggle.
  - Customizable theme accent colors and background personalization options.

   Full-Stack Authentication & Security
  - Protected visual application gate and JWT-secured REST API routes.
  - Persistent session management with automatic sign-out on expiration.

---

 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, TipTap (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`), ESLint |
| **Backend** | Node.js, Express 5, Mongoose, CORS, JSON Web Tokens (`jsonwebtoken`), Dotenv |
| **Database** | MongoDB |
| **Testing** | Vitest, JSDOM |

---

  Project Structure

```text
contextual_ai_notes/
├── backend/
│   ├── models/            # Mongoose schemas (Note, Page, Partition, StickyNote)
│   ├── db.js              # MongoDB connection setup
│   ├── server.js          # Express server, JWT auth middleware & REST endpoints
│   ├── .env.example       # Backend environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components (NoteWriter, Login, Sidebar, StickyNotes, etc.)
│   │   ├── context/       # Theme and styling context providers
│   │   ├── services/      # API client, authenticated fetch wrapper & token storage
│   │   ├── App.jsx        # App root, routing gate & state orchestration
│   │   └── *.test.jsx     # Unit & integration test suites
│   ├── vite.config.js     # Vite configuration
│   └── package.json
└── README.md
```

---

  Getting Started

 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas cluster)

---

 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in `backend/`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/contextual_ai_notes
   ADMIN_USERNAME=Festudev
   ADMIN_PASSWORD=11974
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. Start the backend server:
   ```bash
   node server.js
   ```
   *The server will run on `http://localhost:5000`.*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Open the displayed URL (typically `http://localhost:5173`) in your browser.*

4. Log in using your configured credentials (default: `Festudev` / `11974`).

---

##  Testing & Code Quality

The frontend includes automated test suites covering pagination logic, persistent page state, editor actions, and authentication token handling.

```bash
cd frontend

# Run all tests
npx vitest run

# Run code linter
npm run lint

# Build production bundle
npm run build
```

---

##  Authentication Architecture

The application enforces an end-to-end authentication model:
- **Client Gate**: Renders a dedicated login view whenever a valid JWT is absent.
- **API Guard**: A global `requireAuth` middleware verifies `Bearer <token>` on all `/api` routes (excluding `/api/health` and `/api/auth/login`).
- **Session Expiry Handling**: An `auth:unauthorized` event automatically clears stale credentials and returns the user to the login screen on `401 Unauthorized`.

---

##  License

This project is open-source and available under the [ISC License](LICENSE).
