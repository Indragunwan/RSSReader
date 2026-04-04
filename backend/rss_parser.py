import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime
import time
from typing import List, Dict, Optional

def parse_date(date_struct):
    if not date_struct:
        return datetime.utcnow()
    try:
        return datetime.fromtimestamp(time.mktime(date_struct))
    except (ValueError, OverflowError):
        return datetime.utcnow()

def fetch_feed_data(url: str):
    """Fetch and parse an RSS/Atom feed."""
    feed = feedparser.parse(url)
    if feed.bozo:
        # Some bozo errors are minor, but if there's no entries, it's likely invalid
        if not feed.entries:
            return None
            
    title = feed.feed.get('title', 'Unknown Feed')
    site_url = feed.feed.get('link', url)
    description = feed.feed.get('description', '')
    
    # Try to find a favicon
    parsed_site = urlparse(site_url)
    icon = f"{parsed_site.scheme}://{parsed_site.netloc}/favicon.ico"
    
    articles = []
    for entry in feed.entries:
        articles.append({
            "title": entry.get('title', 'No Title'),
            "summary": entry.get('summary', entry.get('description', '')),
            "content": entry.get('content', [{}])[0].get('value', entry.get('summary', '')),
            "link": entry.get('link', ''),
            "published_at": parse_date(entry.get('published_parsed', entry.get('updated_parsed')))
        })
        
    return {
        "title": title,
        "site_url": site_url,
        "description": description,
        "icon": icon,
        "articles": articles
    }

def discover_feeds(url: str) -> List[Dict]:
    """Discover RSS/Atom feeds from a website URL."""
    feeds = []
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # 1. Check if the URL itself is a feed
        feed = feedparser.parse(url)
        if not feed.bozo and feed.entries:
            return [{
                "title": feed.feed.get('title', url),
                "url": url,
                "type": "rss/atom"
            }]
            
        # 2. Parse HTML to find common link tags
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Typical feed types
        feed_types = [
            'application/rss+xml',
            'application/atom+xml',
            'application/rdf+xml',
            'application/rss',
            'application/atom',
            'text/xml',
        ]
        
        for link in soup.find_all('link'):
            if link.get('rel') and 'alternate' in link.get('rel'):
                if link.get('type') in feed_types:
                    feed_url = urljoin(url, link.get('href'))
                    feeds.append({
                        "title": link.get('title', feed_url),
                        "url": feed_url,
                        "type": link.get('type')
                    })
                    
        # 3. Check common paths if nothing found
        if not feeds:
            common_paths = ['/feed', '/rss', '/rss.xml', '/index.xml', '/atom.xml']
            for path in common_paths:
                test_url = urljoin(url, path)
                try:
                    test_resp = requests.get(test_url, timeout=5)
                    if test_resp.status_code == 200:
                        feed = feedparser.parse(test_url)
                        if not feed.bozo and feed.entries:
                            feeds.append({
                                "title": feed.feed.get('title', test_url),
                                "url": test_url,
                                "type": "discovered"
                            })
                            # Stop after first discovery to avoid noise
                            break
                except:
                    continue
                    
    except Exception as e:
        print(f"Discovery error: {e}")
        
    return feeds
