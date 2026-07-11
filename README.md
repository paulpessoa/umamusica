<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/46eaf5e6-9907-402c-9c07-aa7a6189d86f

## Deployments

* **Cloud Run (Produção / Independente):** [https://umamusica-369350924489.us-east1.run.app](https://umamusica-369350924489.us-east1.run.app)
* **Cloud Run (AI Studio Preview / Dev):** [https://ais-dev-nnhg6xmwqtqe6av4j4tmgt-511413117051.us-east1.run.app/](https://ais-dev-nnhg6xmwqtqe6av4j4tmgt-511413117051.us-east1.run.app/)
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
