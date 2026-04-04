from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import crud, models, schemas, rss_parser
from database import engine, Base, get_db
from background import start_scheduler
import logging

# Set up database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Feeds API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start background scheduler at startup
@app.on_event("startup")
async def startup_event():
    logging.info("Starting up FastAPI application...")
    start_scheduler()

@app.get("/api/articles", response_model=List[schemas.Article])
def get_articles(
    db: Session = Depends(get_db), 
    skip: int = 0, 
    limit: int = 50, 
    feed_id: Optional[int] = None, 
    category_id: Optional[int] = None,
    unread_only: bool = False,
    published_since: Optional[datetime] = None
):
    return crud.get_articles(db, skip=skip, limit=limit, feed_id=feed_id, category_id=category_id, unread_only=unread_only, published_since=published_since)

@app.put("/api/articles/{article_id}", response_model=schemas.Article)
def update_article(article_id: int, article_update: schemas.ArticleUpdate, db: Session = Depends(get_db)):
    updated_article = crud.update_article_status(db, article_id, article_update.read_status, article_update.favorite)
    if not updated_article:
        raise HTTPException(status_code=404, detail="Article not found")
    return updated_article

@app.post("/api/articles/mark-all-read")
def mark_all_read(feed_id: Optional[int] = None, category_id: Optional[int] = None, db: Session = Depends(get_db)):
    crud.mark_all_read(db, feed_id=feed_id, category_id=category_id)
    return {"status": "success"}

@app.get("/api/feeds", response_model=List[schemas.Feed])
def get_feeds(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_feeds(db, category_id=category_id)

@app.post("/api/feeds", response_model=schemas.Feed)
def create_feed(feed: schemas.FeedCreate, db: Session = Depends(get_db)):
    new_feed = crud.create_feed(db, feed)
    if not new_feed:
        raise HTTPException(status_code=400, detail="Invalid RSS/Atom feed URL or feed could not be fetched")
    return new_feed

@app.delete("/api/feeds/{feed_id}")
def delete_feed(feed_id: int, db: Session = Depends(get_db)):
    success = crud.delete_feed(db, feed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"status": "success"}

@app.patch("/api/feeds/{feed_id}", response_model=schemas.Feed)
def update_feed(feed_id: int, category_id: int, db: Session = Depends(get_db)):
    updated_feed = crud.update_feed(db, feed_id, category_id)
    if not updated_feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    return updated_feed

@app.get("/api/categories", response_model=List[schemas.Category])
def get_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)

@app.post("/api/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    return crud.create_category(db, category)

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    success = crud.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success"}

@app.get("/api/discover", response_model=List[schemas.FeedDiscoveryResult])
def discover_feed(url: str):
    return rss_parser.discover_feeds(url)

@app.post("/api/refresh")
def manual_refresh(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Run in background to avoid blocking API
    background_tasks.add_task(crud.refresh_all_feeds, db)
    return {"message": "Refresh started in background"}
