from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    feeds = relationship("Feed", back_populates="category", cascade="all, delete-orphan")

class Feed(Base):
    __tablename__ = "feeds"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True)
    title = Column(String)
    site_url = Column(String)
    description = Column(String)
    icon = Column(String)
    last_fetched = Column(DateTime, default=datetime.utcnow)
    error_count = Column(Integer, default=0)
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="feeds")
    articles = relationship("Article", back_populates="feed", cascade="all, delete-orphan")

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    feed_id = Column(Integer, ForeignKey("feeds.id"))
    title = Column(String)
    summary = Column(String)
    content = Column(String)
    link = Column(String, index=True)
    published_at = Column(DateTime)
    read_status = Column(Boolean, default=False)
    favorite = Column(Boolean, default=False)
    
    feed = relationship("Feed", back_populates="articles")
