# Chatter Frontend

A modern chat application built with Next.js, React, and Tailwind CSS.

## Features

- Real-time chat functionality
- User authentication (login/register)
- Image upload support
- Emoji picker integration
- Responsive design
- Dark mode support

## Prerequisites

- Node.js 18.x or later
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with the following content:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

1. The application is configured to use the backend at https://mayflask.vercel.app
2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Set the following environment variables in your Vercel project settings:
   - `NEXT_PUBLIC_API_URL`: https://mayflask.vercel.app

## Project Structure

```
frontend_submit/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
├── public/
├── .env.local
├── .env.production
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Emoji Picker React 