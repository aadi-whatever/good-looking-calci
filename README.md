# Smart Calculator

## Run it locally

1. Install dependencies:
   npm install

2. Start the dev server:
   npm run dev

3. Open the printed local URL (usually http://localhost:5173).

## Build for production

npm run build

Output goes to the `dist/` folder.

## Deploy to GitHub Pages

This repo already includes a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds and deploys automatically on every push to `main`. Steps:

1. Create a new repo on GitHub (don't initialize it with a README).
2. From this folder, run:
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
3. On GitHub, go to Settings -> Pages, and under "Build and deployment" set
   Source to "GitHub Actions".
4. Push again (or re-run the workflow from the Actions tab) if it doesn't
   trigger automatically. After it finishes, your site will be live at:
   https://YOUR_USERNAME.github.io/YOUR_REPO/
