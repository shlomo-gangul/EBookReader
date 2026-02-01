# BookReader

A free, web-based book reader with realistic page-flip experience that streams books from public APIs and handles user PDF uploads.

## Features

- **Book Discovery**: Search millions of free books from Open Library and Project Gutenberg
- **Realistic Page Flip**: Beautiful page-turn animations using StPageFlip
- **PDF Upload**: Upload and read your own PDF files
- **Reading Modes**: Day, Night, and Sepia themes
- **Progress Tracking**: Automatic reading progress saved locally
- **Bookmarks**: Save and navigate to your favorite pages
- **PWA Support**: Install as an app, read offline
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Page Flip**: page-flip (StPageFlip)
- **Backend**: Node.js, Express, TypeScript
- **Cache**: Redis (with in-memory fallback)
- **PDF**: pdf.js for client-side rendering

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Redis (optional, will use in-memory cache if not available)

### Development

1. Install dependencies:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

2. Start the development servers:

```bash
# Terminal 1 - Start the backend
cd server
npm run dev

# Terminal 2 - Start the frontend
cd client
npm run dev
```

3. Open http://localhost:3000 in your browser

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
BookReader/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand store
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── server/                 # Express backend
│   └── src/
│       ├── routes/        # API routes
│       ├── services/      # Business logic
│       └── middleware/    # Express middleware
└── docker-compose.yml     # Docker configuration
```

## API Endpoints

### Books
- `GET /api/books/search?q=<query>` - Search books
- `GET /api/books/:id` - Get book details
- `GET /api/books/gutenberg/:id/text` - Get book text content

### PDF
- `POST /api/pdf/upload` - Upload a PDF file
- `GET /api/pdf/:sessionId/page/:num` - Get PDF page
- `DELETE /api/pdf/:sessionId` - Delete PDF session

### Session
- `POST /api/session/progress` - Save reading progress
- `GET /api/session/progress/:bookId` - Get reading progress

### Auth (Optional)
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/sync` - Sync reading progress

## License

MIT
