from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import List, Optional

class ArticleBase(BaseModel):
    title: str
    summary: Optional[str] = None
    link: str
    published_at: Optional[datetime] = None
    read_status: bool = False
    favorite: bool = False
    feed_id: int

class ArticleUpdate(BaseModel):
    read_status: Optional[bool] = None
    favorite: Optional[bool] = None

class Article(ArticleBase):
    id: int
    content: Optional[str] = None

    class Config:
        from_attributes = True

class FeedBase(BaseModel):
    url: str
    category_id: Optional[int] = None

class FeedCreate(FeedBase):
    pass

class Feed(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    site_url: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category_id: Optional[int] = None
    last_fetched: Optional[datetime] = None
    error_count: int

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    feeds: List[Feed] = []

    class Config:
        from_attributes = True

class FeedDiscoveryResult(BaseModel):
    title: str
    url: str
    type: str  # rss, atom
