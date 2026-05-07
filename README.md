# UdayAIbot

Simple Node/JS project. Instructions:

- Install dependencies: `npm install`
- Start: `node server.js` (or use project's start script)

Secrets and local configuration are stored in `.env` and are excluded from the repository.

Deployment (Render):

- This repository includes `render.yaml` so Render can auto-detect and deploy the Node web service.
- Recommended flow:
	1. Go to https://render.com and sign in (connect your GitHub account).
	2. Click "New" → "Web Service" and select this repository (`UdayAIbot`).
	3. Render will detect `render.yaml` and use `npm start` to run the app.
	4. Add any secrets (for example `OPENROUTER_API_KEY`) in Render's dashboard under the service's Environment settings.

Alternatively you can deploy to other hosts (Railway, Vercel, Heroku). Do NOT commit `.env` to the repo — use provider environment variables instead.
