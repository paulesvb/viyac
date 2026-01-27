# Viyac

A modern web application with public and authenticated content, built with Next.js 15, Firebase Auth, and Tailwind CSS.

## Features

- **Authentication**: Email/password and Google sign-in via Firebase Auth
- **Protected Routes**: Middleware-based route protection
- **Modern UI**: Tailwind CSS with shadcn/ui components
- **TypeScript**: Full type safety throughout

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Firebase](https://firebase.google.com/) (Auth + Firestore)

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project with Authentication enabled

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/viyac.git
   cd viyac
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication (Email/Password and Google providers)
   - Go to Project Settings > General > Your apps
   - Copy the Firebase config values

4. Create `.env.local` from the example:
   ```bash
   cp .env.example .env.local
   ```

5. Fill in your Firebase credentials in `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Landing page (public)
│   ├── login/page.tsx      # Login page
│   ├── signup/page.tsx     # Signup page
│   └── dashboard/page.tsx  # Dashboard (protected)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Navbar.tsx          # Navigation bar
│   └── AuthForm.tsx        # Login/signup form
├── context/
│   └── AuthContext.tsx     # Firebase auth context
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   └── utils.ts            # Utility functions
└── middleware.ts           # Route protection middleware
```

## Deployment to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your GitHub repository
5. Add environment variables:
   - Go to Settings > Environment Variables
   - Add all variables from `.env.local`
6. Deploy!

### Option 2: Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   # Repeat for all variables
   ```

4. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### Environment Variables for Vercel

Add these in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

## Firebase Setup

### Enable Authentication Providers

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable **Email/Password**
3. Enable **Google** (requires OAuth consent screen setup)

### Configure Authorized Domains

1. Go to Authentication > Settings > Authorized domains
2. Add your Vercel deployment URL (e.g., `your-app.vercel.app`)

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
