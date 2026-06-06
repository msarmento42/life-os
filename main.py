from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from database import init_db
from routers import finance, travel, crm, wiki, health, habits, reading, projects, mood, trading, search, tasks, time_tracking, decisions, fantasy, insights

app = FastAPI(title="Life OS API", version="1.0.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers first (takes precedence over catch-all)
app.include_router(finance.router)
app.include_router(travel.router)
app.include_router(crm.router)
app.include_router(wiki.router)
app.include_router(health.router)
app.include_router(habits.router)
app.include_router(reading.router)
app.include_router(projects.router)
app.include_router(mood.router)
app.include_router(trading.router)
app.include_router(search.router)
app.include_router(tasks.router)
app.include_router(time_tracking.router)
app.include_router(decisions.router)
app.include_router(fantasy.router)
app.include_router(insights.router)


@app.on_event("startup")
async def startup():
    init_db()
    from seed import seed_if_empty
    seed_if_empty()


# Serve React frontend static assets
FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Serve the assets folder (JS, CSS bundles)
    assets_path = FRONTEND_DIST / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # SPA catch-all: serve index.html for all non-API routes
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Frontend not built. Run: cd frontend && npm run build")

    @app.get("/", include_in_schema=False)
    async def root():
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"message": "Frontend not built yet."}
else:
    @app.get("/")
    async def root():
        return {
            "message": "Life OS API running. Build the frontend: cd frontend && npm run build",
            "modules": ["finance", "travel", "crm", "wiki"],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
