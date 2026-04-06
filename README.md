# Sri Vara Lakshmi Balaji Enterprises

## 📁 File Structure (IMPORTANT — keep this exact layout)
```
your-github-repo/
├── index.html      ← Website (must be at ROOT, not inside any folder)
├── vercel.json     ← Vercel config
└── .gitignore
```

---

## 🚀 Deploy via GitHub → Vercel

### Step 1 — Upload to GitHub
1. Go to **https://github.com** → Sign in
2. Click **"New repository"** → Name it (e.g. `svlb-shop`) → Create
3. Click **"uploading an existing file"**
4. Drag ALL files (`index.html`, `vercel.json`, `.gitignore`) into the upload area
5. Click **"Commit changes"**

### Step 2 — Connect to Vercel
1. Go to **https://vercel.com** → Sign in with Google
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repo → Click **"Import"**
5. On the Configure page:
   - Framework Preset: **Other**
   - Root Directory: **`.`** (leave as default — dot means root)
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty)*
6. Click **"Deploy"** ✅

Your site will be live at: `https://svlb-shop.vercel.app`

---

## 🎬 Add Videos After Deployment
Visit: `https://your-site.vercel.app?admin=1`
→ Admin panel appears at bottom-right
→ Paste your YouTube links → Save
