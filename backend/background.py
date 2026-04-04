from apscheduler.schedulers.background import BackgroundScheduler
from crud import refresh_all_feeds
from database import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def refresh_task():
    db = SessionLocal()
    try:
        logger.info("Starting background feed refresh...")
        added_count = refresh_all_feeds(db)
        logger.info(f"Finished background refresh. Added {added_count} new articles.")
    except Exception as e:
        logger.error(f"Error in background refresh task: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run every 15 minutes
    scheduler.add_job(refresh_task, 'interval', minutes=15)
    # Run once at startup
    scheduler.add_job(refresh_task)
    scheduler.start()
    logger.info("Scheduler started.")
    return scheduler
