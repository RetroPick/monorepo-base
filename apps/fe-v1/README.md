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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This app lives in a pnpm monorepo, so Vercel must target the app directory rather than the repository root.

Required Vercel project settings:

- Root Directory: `apps/fe-v1`
- Framework Preset: `Next.js`

The app-level [vercel.json](./vercel.json) then runs:

```json
{
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm --filter fe-v1 build"
}
```

If your Vercel project is currently building from the repository root, change the Root Directory to `apps/fe-v1`. Otherwise Vercel will execute the app-level `cd ../..` commands from the wrong starting directory and `pnpm install` will resolve to `/`, which fails with `ERR_PNPM_NO_PKG_MANIFEST`.

# fe-v1
