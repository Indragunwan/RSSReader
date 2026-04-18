import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

# 1. Pastikan variabel lingkungan DATABASE_URL diset ke URL PostgreSQL Anda sebelum menjalankan script ini.
PG_DATABASE_URL = os.getenv("DATABASE_URL")

if not PG_DATABASE_URL or not PG_DATABASE_URL.startswith("postgres"):
    print("Error: Harap atur environment variable DATABASE_URL dengan URL PostgreSQL Anda.")
    print("Contoh: set DATABASE_URL=postgresql://user:password@host/dbname")
    exit(1)

if PG_DATABASE_URL.startswith("postgres://"):
    PG_DATABASE_URL = PG_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Set up SQLite (sumber data)
SQLITE_URL = "sqlite:///./feeds.db"
sqlite_engine = create_engine(SQLITE_URL)
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

# Set up PostgreSQL (tujuan data)
pg_engine = create_engine(PG_DATABASE_URL)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

def migrate_data():
    sqlite_db = SqliteSessionLocal()
    pg_db = PgSessionLocal()
    
    try:
        # Buat tabel di PostgreSQL jika belum ada
        models.Base.metadata.create_all(bind=pg_engine)
        print("Tabel berhasil dibuat di PostgreSQL.")

        # Pindahkan Categories
        categories = sqlite_db.query(models.Category).all()
        for cat in categories:
            # Cek apakah sudah ada
            existing = pg_db.query(models.Category).filter_by(id=cat.id).first()
            if not existing:
                new_cat = models.Category(id=cat.id, name=cat.name)
                pg_db.add(new_cat)
        pg_db.commit()
        print(f"{len(categories)} Categories dipindahkan.")

        # Pindahkan Feeds
        feeds = sqlite_db.query(models.Feed).all()
        for feed in feeds:
            existing = pg_db.query(models.Feed).filter_by(id=feed.id).first()
            if not existing:
                new_feed = models.Feed(
                    id=feed.id, url=feed.url, title=feed.title, site_url=feed.site_url,
                    description=feed.description, icon=feed.icon, 
                    last_fetched=feed.last_fetched, error_count=feed.error_count,
                    category_id=feed.category_id
                )
                pg_db.add(new_feed)
        pg_db.commit()
        print(f"{len(feeds)} Feeds dipindahkan.")

        # Pindahkan Articles
        articles = sqlite_db.query(models.Article).all()
        for art in articles:
            existing = pg_db.query(models.Article).filter_by(id=art.id).first()
            if not existing:
                new_art = models.Article(
                    id=art.id, feed_id=art.feed_id, title=art.title, summary=art.summary,
                    content=art.content, link=art.link, published_at=art.published_at,
                    read_status=art.read_status, favorite=art.favorite
                )
                pg_db.add(new_art)
        pg_db.commit()
        print(f"{len(articles)} Articles dipindahkan.")
        
        print("\nMigrasi selesai! Sekarang aplikasi Anda siap menggunakan PostgreSQL.")
    except Exception as e:
        print(f"Terjadi kesalahan saat migrasi: {e}")
        pg_db.rollback()
    finally:
        sqlite_db.close()
        pg_db.close()

if __name__ == "__main__":
    migrate_data()
