# Viyac

A modern web application with public and authenticated content, built with Next.js, [Clerk](https://clerk.com/) authentication, and Tailwind CSS.

## Features

- **Authentication**: Clerk (hosted sign-in / sign-up, social logins configurable in the Clerk dashboard)
- **Protected routes**: `clerkMiddleware` for `/dashboard`, `/profile`, `/settings`
- **Modern UI**: Tailwind CSS with shadcn/ui components
- **TypeScript**: Full type safety throughout

## Tech Stack

- [Next.js](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Clerk](https://clerk.com/) (auth)

## Getting Started

### Prerequisites

- Node.js 20+
- A [Clerk](https://dashboard.clerk.com/) application

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

3. Create `.env.local` from the example:
   ```bash
   cp .env.example .env.local
   ```

4. In the [Clerk Dashboard](https://dashboard.clerk.com/), create an application and copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

5. In Clerk **Paths**, set sign-in and sign-up URLs to match this app (e.g. `/login` and `/signup`) if prompted.

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with ClerkProvider
│   ├── page.tsx            # Landing page (public)
│   ├── login/[[...rest]]/page.tsx   # Clerk <SignIn /> (catch-all for path routing)
│   ├── signup/[[...rest]]/page.tsx  # Clerk <SignUp />
│   └── dashboard/page.tsx  # Protected dashboard
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── Navbar.tsx          # Nav with Clerk UserButton
├── lib/
│   └── utils.ts
└── middleware.ts           # clerkMiddleware + route protection
```

## Deployment (Vercel)

1. Push your code to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add environment variables from `.env.local` (at minimum `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`).
4. In the Clerk dashboard, add your production URL under **Allowed origins** / **Domains** as required.

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - ESLint

## License

MIT
