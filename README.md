# Banks Family Reunion

The family website and household portals for the Banks Family Reunion (Summer 2027).

Built with Next.js, Postgres (Neon on Vercel), and Vercel Blob for photos.

## Setting it up on Vercel

1. In Vercel, **Add New → Project**, import this GitHub repository, and click **Deploy**. The first deploy builds the site, but it can't save anything until step 2 is done.
2. Open the project's **Storage** tab:
   - **Create Database → Neon (Postgres)** → connect it to this project. This adds `DATABASE_URL`.
   - **Create → Blob** → connect it to this project. This adds `BLOB_READ_WRITE_TOKEN` for photos.
3. Optional but recommended, under **Settings → Environment Variables**:
   - `ADMIN_EMAILS`: the email(s) that should be admins, comma separated.
   - `SESSION_SECRET`: any long random phrase.
4. **Deployments → ⋯ → Redeploy** so the new settings take effect.
5. Visit the site and **Join your household**. If `ADMIN_EMAILS` isn't set, the very first household to sign up becomes the admin, so sign up first.

The database tables create themselves the first time the site runs.

## Admin basics

- New sign-ups get in right away. To require approval, turn it on under **Admin → Access and Admins**.
- Make co-planners admins from **Admin → Access and Admins** after they sign up.
- Reset a forgotten password from the household's page under **Admin → Households**.
- Photos are resized in the browser before upload to stay within the free 1 GB of Blob storage.

## Running locally

```
npm install
DATABASE_URL=postgres://... npm run dev
```

Without `BLOB_READ_WRITE_TOKEN`, uploaded photos are stored in the database instead.
