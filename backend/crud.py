from sqlalchemy.orm import Session
from sqlalchemy import desc
import models, schemas, rss_parser
from datetime import datetime

def get_categories(db: Session):
    return db.query(models.Category).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if category:
        db.delete(category)
        db.commit()
        return True
    return False

def get_feeds(db: Session, category_id: int = None):
    query = db.query(models.Feed)
    if category_id:
        query = query.filter(models.Feed.category_id == category_id)
    return query.all()

def create_feed(db: Session, feed: schemas.FeedCreate):
    # Check if feed already exists
    db_feed = db.query(models.Feed).filter(models.Feed.url == feed.url).first()
    if db_feed:
        return db_feed
        
    # Fetch initial data
    feed_data = rss_parser.fetch_feed_data(feed.url)
    if not feed_data:
        return None
        
    db_feed = models.Feed(
        url=feed.url,
        title=feed_data["title"],
        site_url=feed_data["site_url"],
        description=feed_data["description"],
        icon=feed_data["icon"],
        category_id=feed.category_id,
        last_fetched=datetime.utcnow()
    )
    db.add(db_feed)
    db.commit()
    db.refresh(db_feed)
    
    # Add initial articles
    for art in feed_data["articles"][:20]: # Only store 20 initially
        db_article = models.Article(
            feed_id=db_feed.id,
            title=art["title"],
            summary=art["summary"],
            content=art.get("content", art["summary"]),
            link=art["link"],
            published_at=art["published_at"],
            read_status=False,
            favorite=False
        )
        db.add(db_article)
    db.commit()
    
    return db_feed

def get_articles(db: Session, skip: int = 0, limit: int = 50, feed_id: int = None, category_id: int = None, unread_only: bool = False, published_since: datetime = None):
    query = db.query(models.Article)
    
    if published_since:
        query = query.filter(models.Article.published_at >= published_since)
        
    if feed_id:
        query = query.filter(models.Article.feed_id == feed_id)
    elif category_id:
        query = query.join(models.Feed).filter(models.Feed.category_id == category_id)
        
    if unread_only:
        query = query.filter(models.Article.read_status == False)
        
    return query.order_by(desc(models.Article.published_at)).offset(skip).limit(limit).all()

def update_article_status(db: Session, article_id: int, read_status: bool = None, favorite: bool = None):
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if article:
        if read_status is not None:
            article.read_status = read_status
        if favorite is not None:
            article.favorite = favorite
        db.commit()
        db.refresh(article)
    return article

def delete_feed(db: Session, feed_id: int):
    feed = db.query(models.Feed).filter(models.Feed.id == feed_id).first()
    if feed:
        db.delete(feed)
        db.commit()
        return True
    return False

def update_feed(db: Session, feed_id: int, category_id: int):
    feed = db.query(models.Feed).filter(models.Feed.id == feed_id).first()
    if feed:
        feed.category_id = category_id
        db.commit()
        db.refresh(feed)
        return feed
    return None

def mark_all_read(db: Session, feed_id: int = None, category_id: int = None):
    query = db.query(models.Article)
    if feed_id:
        query = query.filter(models.Article.feed_id == feed_id)
    elif category_id:
        query = query.join(models.Feed).filter(models.Feed.category_id == category_id)
    
    query.filter(models.Article.read_status == False).update({models.Article.read_status: True}, synchronize_session=False)
    db.commit()
    return True

def refresh_all_feeds(db: Session):
    feeds = db.query(models.Feed).all()
    total_added = 0
    for feed in feeds:
        try:
            feed_data = rss_parser.fetch_feed_data(feed.url)
            if not feed_data:
                feed.error_count += 1
                continue
                
            # Update feed metadata if changed
            feed.title = feed_data["title"]
            feed.site_url = feed_data["site_url"]
            feed.description = feed_data["description"]
            feed.error_count = 0
            feed.last_fetched = datetime.utcnow()
            
            # Find new articles (based on link uniqueness per feed)
            existing_links = {a.link for a in db.query(models.Article.link).filter(models.Article.feed_id == feed.id).all()}
            
            for art in feed_data["articles"]:
                if art["link"] not in existing_links:
                    db_article = models.Article(
                        feed_id=feed.id,
                        title=art["title"],
                        summary=art["summary"],
                        content=art.get("content", art["summary"]),
                        link=art["link"],
                        published_at=art["published_at"]
                    )
                    db.add(db_article)
                    total_added += 1
            db.commit()
        except Exception as e:
            print(f"Error refreshing feed {feed.url}: {e}")
            feed.error_count += 1
            db.commit()
    return total_added
