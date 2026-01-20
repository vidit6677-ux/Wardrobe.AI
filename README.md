# Wardrobe AI

A full‑stack **AI wardrobe + outfit recommender**:
- Upload clothing → stored in Cloudinary and saved to MongoDB.
- A Python **Vision AI** service (CLIP) analyzes the image and returns category + dominant color + embedding.
- The backend builds outfits using **color compatibility** + **cosine similarity** and adds a **weather + occasion** bonus.
- A **Gemini stylist** ranks outfits and returns short “Best/Good/Pass” verdicts + tips.

---

## Demo (Local)

### What you can do
- Sign up / log in (cookie-based auth)
- Upload clothes to your closet
- Edit item category/colors/styles/seasons
- Generate outfits by **occasion** + **city**
- See AI verdicts + stylist tips

---

## How to run locally (on your PC)

### Prerequisites
- **Node.js** (LTS recommended) + npm
- **Python 3.10+**
- A running **MongoDB** (local or MongoDB Atlas)
- API keys (Cloudinary / OpenWeather / Gemini)

### 1) Clone + install dependencies
From the project root:

```bash
# Server deps
cd server
npm install

# Client deps
cd ../client
npm install
```

For the Vision AI service:

```bash
cd ../ai-service
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 2) Start each service (3 terminals)

**Terminal A — Backend (Express)**
```bash
cd server
node src/server.js
```

**Terminal B — Vision AI (FastAPI)**
This `uvicorn ...` command is run **from the `ai-service/` folder** (the one that contains `app.py`), after you’ve activated the virtual environment and installed requirements:

```bash
cd ai-service
# make sure venv is activated
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

> `app:app` means: `app.py` (module) and the FastAPI instance named `app` inside it.

**Terminal C — Frontend (React)**
```bash
cd client
npm start
```

### 3) Configure environment variables
Create `server/.env` (or update it) with:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>

CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
CLOUDINARY_UPLOAD_PRESET=xxxxx

OPENWEATHER_API_KEY=xxxxx
GEMINI_API_KEY=xxxxx

JWT_SECRET=your_long_secret_here
```

### 4) Open the app
- Frontend: `http://localhost:3001`
- Backend health: `http://localhost:3000/health`
- Vision health: `http://localhost:8000/health`

> Note: the backend CORS config currently allows `http://localhost:3001`, so keep the client on that port.
