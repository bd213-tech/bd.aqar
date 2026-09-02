# BD AQAR

BD AQAR is a real-estate platform for Algeria with property listings, buyer contact, seller listing tools, multilingual UI, and a Node.js API.

## Run locally

```bash
npm start
```

Open http://localhost:3000

The local database is stored in `data/db.json` and is intentionally ignored by Git.

## Google sign-in

Google sign-in is wired through the backend. To enable it, create a Web OAuth client in Google Cloud, add `http://localhost:3000/auth/google/callback` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` from `.env.example` in the server environment. Do not put the secret in HTML or commit it to Git.
