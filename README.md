This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Speech recognition

Pronunciation practice currently uses the browser's built-in speech-recognition API for live captions and word-by-word comparison. OpenAI transcription is temporarily disabled.

## Local PostgreSQL connection

Set `DATABASE_URL` in `.env` to the PostgreSQL connection URL. Keep the URL private and do not prefix it with `NEXT_PUBLIC_`.

`GET /api/dailytalk/conversations` loads a conversation from PostgreSQL; use `?conversationId=1` to choose another. Configure `DATABASE_URL` in the deployment environment (for example, Railway's app service variables) to enable this endpoint in production. Conversation text and timing are loaded from the database.

The conversation picker fetches 10 conversations with their lesson data at a time and loads another page when you scroll to the end of its dropdown. Conversation lists and lesson data are cached in Zustand for the current page session.

To play original recordings from a public Cloudflare R2 bucket, set `DAILYTALK_AUDIO_BASE_URL` in `.env` to the bucket's public URL (for example, its `r2.dev` URL or custom domain). The app appends each row's `audio_key` to this base URL. Leave it empty to use browser speech synthesis instead.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
