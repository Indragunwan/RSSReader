import React, { useState, useEffect } from 'react';
import { 
  Rss, 
  Plus, 
  Search, 
  Settings, 
  Inbox, 
  Star, 
  CheckCircle,
  Hash,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Trash2,
  Clock,
  FolderPlus,
  ChevronDown,
  Folder,
  MoreHorizontal,
  Moon,
  Sun
} from 'lucide-react';
import { FeedService } from './services/FeedService';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

function App() {
  const [categories, setCategories] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'last24'
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const fetchInitialData = async () => {
    try {
      const [catsRes, feedsRes, artsRes] = await Promise.all([
        FeedService.getCategories(),
        FeedService.getFeeds(),
        FeedService.getArticles({ limit: 50 })
      ]);
      setCategories(catsRes.data);
      setFeeds(feedsRes.data);
      setArticles(artsRes.data);
      
      // Expand all folders by default on first load
      const initialExpanded = {};
      catsRes.data.forEach(cat => {
        initialExpanded[cat.id] = true;
      });
      setExpandedFolders(prev => ({ ...initialExpanded, ...prev }));
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const getFeedUnreadCount = (feedId) => {
    return articles.filter(a => Number(a.feed_id) === Number(feedId) && !a.read_status).length;
  };

  const getFolderUnreadCount = (categoryId) => {
    const folderFeeds = feeds.filter(f => Number(f.category_id) === Number(categoryId));
    const folderFeedIds = folderFeeds.map(f => f.id);
    return articles.filter(a => folderFeedIds.includes(a.feed_id) && !a.read_status).length;
  };

  const getFolderRecentCount = (categoryId) => {
    const folderFeeds = feeds.filter(f => Number(f.category_id) === Number(categoryId));
    const folderFeedIds = folderFeeds.map(f => f.id);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return articles.filter(a => folderFeedIds.includes(a.feed_id) && new Date(a.published_at) > yesterday).length;
  };

  const handleDiscovery = async () => {
    if (!newFeedUrl) return;
    setLoading(true);
    try {
      const res = await FeedService.discoverFeeds(newFeedUrl);
      setDiscoveryResults(res.data);
      if (res.data.length === 0) setError("No feeds found at this URL");
    } catch (error) {
      console.error("Discovery failed:", error);
      setError("Failed to connect to backend. Is the API running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (url) => {
    try {
      await FeedService.createFeed(url, selectedFolderId || null);
      setShowAddFeed(false);
      setNewFeedUrl('');
      setSelectedFolderId('');
      setDiscoveryResults([]);
      setError(null);
      fetchInitialData();
    } catch (error) {
      console.error("Failed to add feed:", error);
      setError("Failed to add feed. Check if the URL is valid and reachable.");
    }
  };

  const toggleFolder = (categoryId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      await FeedService.createCategory(newFolderName);
      setShowAddFolder(false);
      setNewFolderName('');
      fetchInitialData();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleDeleteFolder = async (e, categoryId, categoryName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the folder "${categoryName}"? This will also delete all feeds inside it.`)) return;
    
    try {
      await FeedService.deleteCategory(categoryId);
      if (selectedFeed?.isFolder && selectedFeed.categoryId === categoryId) {
        setSelectedFeed(null);
      }
      fetchInitialData();
    } catch (error) {
      console.error("Failed to delete folder:", error);
      alert("Failed to delete folder. Please try again.");
    }
  };

  const handleMoveToFolder = async (feedId, categoryId) => {
    try {
      await FeedService.updateFeed(feedId, categoryId);
      fetchInitialData();
    } catch (error) {
      console.error("Failed to move feed:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await FeedService.refreshFeeds();
      setTimeout(fetchInitialData, 2000); // Wait for bg task
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleSelectArticle = async (article) => {
    setSelectedArticle(article);
    if (!article.read_status) {
      try {
        await FeedService.updateArticle(article.id, { read_status: true });
        setArticles(articles.map(a => a.id === article.id ? { ...a, read_status: true } : a));
      } catch (error) {
        console.error("Update failed:", error);
      }
    }
  };

  const toggleReadStatus = async (e, article) => {
    e.stopPropagation();
    try {
      const newStatus = !article.read_status;
      await FeedService.updateArticle(article.id, { read_status: newStatus });
      setArticles(articles.map(a => a.id === article.id ? { ...a, read_status: newStatus } : a));
      if (selectedArticle?.id === article.id) {
        setSelectedArticle({ ...selectedArticle, read_status: newStatus });
      }
    } catch (error) {
      console.error("Read status toggle failed:", error);
    }
  };

  const handleMarkAllRead = async () => {
    const params = {};
    if (selectedFeed) {
      if (selectedFeed.isFolder) params.category_id = selectedFeed.categoryId;
      else params.feed_id = selectedFeed.id;
    }
    
    try {
      await FeedService.markAllRead(params);
      // Update local state
      setArticles(articles.map(a => {
        if (params.category_id) {
          const feed = feeds.find(f => f.id === a.feed_id);
          if (feed && Number(feed.category_id) === Number(params.category_id)) return { ...a, read_status: true };
        } else if (params.feed_id) {
          if (Number(a.feed_id) === Number(params.feed_id)) return { ...a, read_status: true };
        } else {
          return { ...a, read_status: true };
        }
        return a;
      }));
    } catch (error) {
      console.error("Mark all read failed:", error);
    }
  };

  const toggleFavorite = async (e, article) => {
    e.stopPropagation();
    try {
      await FeedService.updateArticle(article.id, { favorite: !article.favorite });
      setArticles(articles.map(a => a.id === article.id ? { ...a, favorite: !article.favorite } : a));
      if (selectedArticle?.id === article.id) {
        setSelectedArticle({ ...selectedArticle, favorite: !selectedArticle.favorite });
      }
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    }
  };

  const handleDeleteFeed = async (e, feedId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this feed? All associated articles will be removed.")) return;
    
    try {
      await FeedService.deleteFeed(feedId);
      if (selectedFeed?.id === feedId) {
        setSelectedFeed(null);
      }
      fetchInitialData();
    } catch (error) {
      console.error("Failed to delete feed:", error);
      alert("Failed to delete feed. Please try again.");
    }
  };

  return (
    <div className={`h-screen flex overflow-hidden font-sans ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar - 240px */}
      <aside 
        className={`flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out ${isFullScreen ? 'w-0 opacity-0 overflow-hidden border-none' : 'w-64'}`}
      >
        <div className="p-4 flex items-center justify-between min-w-[256px]">
          <div className="flex items-center gap-2">
            <Rss className="text-orange-500 w-6 h-6" />
            <h1 className="font-bold text-xl tracking-tight">Feeds</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1 min-w-[256px]">
          <button 
            onClick={() => { setViewMode('all'); setSelectedFeed(null); fetchInitialData(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${viewMode === 'all' && !selectedFeed ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Inbox size={18} /> <span>All Feeds</span>
          </button>
          <button 
            onClick={() => {
              setViewMode('last24');
              setSelectedFeed(null);
              const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              FeedService.getArticles({ published_since: yesterday, limit: 100 }).then(res => setArticles(res.data));
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${viewMode === 'last24' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Clock size={18} /> <span>Last 24 Hours</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Star size={18} /> <span>Favorites</span>
          </button>

          <div className="pt-6 pb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span>Folders</span>
            <button onClick={() => setShowAddFolder(true)} className="hover:text-orange-500"><FolderPlus size={14} /></button>
          </div>

          <div className="space-y-1">
            {(categories || []).map(category => (
              <div key={category.id} className="space-y-1">
                <div 
                  onClick={() => {
                    toggleFolder(category.id);
                    setViewMode('folder');
                    setSelectedFeed({ id: `folder-${category.id}`, title: category.name, isFolder: true, categoryId: category.id });
                    FeedService.getArticles({ limit: 100, category_id: category.id }).then(res => setArticles(res.data));
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm group/folder cursor-pointer ${viewMode === 'folder' && selectedFeed?.categoryId === category.id ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2 group/folder-actions flex-shrink-0">
                    {getFolderUnreadCount(category.id) > 0 && (
                      <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {getFolderUnreadCount(category.id)}
                      </span>
                    )}
                    <button 
                      onClick={(e) => handleDeleteFolder(e, category.id, category.name)}
                      className="opacity-0 group-hover/folder:opacity-100 p-1 hover:text-red-500 transition-opacity"
                      title="Delete Folder"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronDown size={14} className={`transition-transform ${expandedFolders[category.id] ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {expandedFolders[category.id] && (
                  <div className="ml-4 pl-4 border-l border-slate-100 dark:border-slate-800 space-y-1">
                    {/* Folder-specific Last 24h */}
                    <button 
                      onClick={() => {
                        setViewMode('folder-last24');
                        setSelectedFeed({ id: `folder-last24-${category.id}`, title: `Last 24 Hours - ${category.name}`, isFolder: true, categoryId: category.id });
                        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                        FeedService.getArticles({ limit: 100, category_id: category.id, published_since: yesterday }).then(res => setArticles(res.data));
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs ${viewMode === 'folder-last24' && selectedFeed?.categoryId === category.id ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                    >
                      <Clock size={12} />
                      <span className="flex-1 text-left font-medium">Recent (24h)</span>
                      {getFolderRecentCount(category.id) > 0 && (
                        <span className="text-[9px] opacity-70">{getFolderRecentCount(category.id)}</span>
                      )}
                    </button>

                    {(feeds || []).filter(f => Number(f.category_id) === Number(category.id)).map(feed => (
                      <div key={feed.id} className="group/feed relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setViewMode('all'); setSelectedFeed(feed); FeedService.getArticles({ limit: 50, feed_id: feed.id }).then(res => setArticles(res.data)); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs ${viewMode === 'all' && selectedFeed?.id === feed.id ? 'bg-slate-200 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                          {feed.icon ? <img src={feed.icon} className="w-3 h-3 rounded-sm" alt="" /> : <Hash size={12} className="dark:text-slate-500" />}
                          <span className="truncate flex-1 text-left">{feed.title}</span>
                          {getFeedUnreadCount(feed.id) > 0 && (
                            <span className="text-[9px] text-blue-500 font-bold flex-shrink-0">
                              {getFeedUnreadCount(feed.id)}
                            </span>
                          )}
                        </button>
                        <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover/feed:opacity-100 z-50">
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFeed(e, feed.id); }} className="p-1 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"><Trash2 size={10} /></button>
                          <div className="relative group/move">
                            <div className="p-1 -m-1 cursor-pointer text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                              <MoreHorizontal size={14} />
                            </div>
                            <div className="absolute right-0 top-full pt-0 hidden group-hover/move:block z-[100] min-w-[150px]">
                              {/* Invisible bridge to prevent mouse-out */}
                              <div className="h-1 bg-transparent" />
                              <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 overflow-hidden">
                                <div className="px-3 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700 mb-1">Move to...</div>
                                <div className="max-h-48 overflow-y-auto">
                                  {(categories || []).filter(c => c.id !== feed.category_id).map(c => (
                                    <button 
                                      key={c.id} 
                                      onClick={(e) => { e.stopPropagation(); handleMoveToFolder(feed.id, c.id); }}
                                      className="w-full text-left px-3 py-2 text-[11px] hover:bg-orange-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
                                    >
                                      <Folder size={10} className="text-slate-400" />
                                      <span className="truncate">{c.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(feeds || []).filter(f => Number(f.category_id) === Number(category.id)).length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">Empty Folder</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* All Subscriptions List */}
            <div className="pt-6 pb-2 px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <span>All Subscriptions</span>
            </div>
            <div className="space-y-1">
              {(feeds || []).map(feed => (
                <div key={feed.id} className="group/feed relative">
                  <button 
                    onClick={() => { setViewMode('all'); setSelectedFeed(feed); FeedService.getArticles({ limit: 50, feed_id: feed.id }).then(res => setArticles(res.data)); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs ${viewMode === 'all' && selectedFeed?.id === feed.id ? 'bg-slate-200 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                  >
                    {feed.icon ? <img src={feed.icon} className="w-3 h-3 rounded-sm" alt="" /> : <Hash size={12} className="dark:text-slate-500" />}
                    <span className="truncate flex-1 text-left">{feed.title}</span>
                    {getFeedUnreadCount(feed.id) > 0 && (
                      <span className="text-[9px] text-blue-500 font-bold flex-shrink-0">
                        {getFeedUnreadCount(feed.id)}
                      </span>
                    )}
                  </button>
                </div>
              ))}
              {feeds.length === 0 && (
                <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">No feeds added yet</div>
              )}
            </div>

            {/* Uncategorized Feeds */}
            {(feeds || []).filter(f => !f.category_id).length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Uncategorized</div>
                {(feeds || []).filter(f => !f.category_id).map(feed => (
                  <div key={feed.id} className="group/feed relative">
                    <button 
                      onClick={() => { setViewMode('all'); setSelectedFeed(feed); FeedService.getArticles({ limit: 50, feed_id: feed.id }).then(res => setArticles(res.data)); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs ${viewMode === 'all' && selectedFeed?.id === feed.id ? 'bg-slate-200 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      {feed.icon ? <img src={feed.icon} className="w-3 h-3 rounded-sm" alt="" /> : <Hash size={12} className="dark:text-slate-500" />}
                      <span className="truncate flex-1 text-left">{feed.title}</span>
                      {getFeedUnreadCount(feed.id) > 0 && (
                        <span className="text-[9px] text-blue-500 font-bold flex-shrink-0">
                          {getFeedUnreadCount(feed.id)}
                        </span>
                      )}
                    </button>
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover/feed:opacity-100 z-50">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteFeed(e, feed.id); }} className="p-1 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"><Trash2 size={10} /></button>
                      <div className="relative group/move">
                        <div className="p-1 -m-1 cursor-pointer text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <MoreHorizontal size={14} />
                        </div>
                        <div className="absolute right-0 top-full pt-0 hidden group-hover/move:block z-[100] min-w-[150px]">
                          {/* Invisible bridge to prevent mouse-out */}
                          <div className="h-1 bg-transparent" />
                          <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 overflow-hidden">
                            <div className="px-3 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700 mb-1">Move to...</div>
                            <div className="max-h-48 overflow-y-auto">
                              {(categories || []).map(c => (
                                <button 
                                  key={c.id} 
                                  onClick={(e) => { e.stopPropagation(); handleMoveToFolder(feed.id, c.id); }}
                                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-orange-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
                                >
                                  <Folder size={10} className="text-slate-400" />
                                  <span className="truncate">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 pb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest flex justify-between items-center">
            <span>Actions</span>
            <button onClick={() => setShowAddFeed(true)} className="hover:text-orange-500 flex items-center gap-1">
              <Plus size={14} /> Add Feed
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 min-w-[256px]">
          <button 
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> 
            {isRefreshing ? 'Updating...' : 'Update All'}
          </button>
        </div>
      </aside>

      {/* Article List - 384px */}
      <main 
        className={`flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out ${isFullScreen ? 'w-0 opacity-0 overflow-hidden border-none' : 'w-96'}`}
      >
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md min-w-[384px]">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-lg dark:text-slate-100 truncate pr-2">
              {viewMode === 'last24' ? 'Last 24 Hours' : (selectedFeed ? selectedFeed.title : 'All Articles')}
            </h2>
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <CheckCircle size={12} /> Mark all read
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {articles.length} entries • {articles.filter(a => !a.read_status).length} unread
          </p>
        </header>

        <div className="flex-1 overflow-y-auto min-w-[384px] dark:bg-slate-900">
          {viewMode === 'last24' ? (
            // Daily Digest Grouped View
            Object.values(articles.reduce((acc, art) => {
              const feedId = art.feed_id;
              if (!acc[feedId]) acc[feedId] = { feed: feeds.find(f => f.id === feedId), articles: [] };
              acc[feedId].articles.push(art);
              return acc;
            }, {})).map(({ feed, articles: feedArticles }) => (
              <div key={feed?.id} className="mb-4">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                  {feed?.icon ? <img src={feed.icon} className="w-4 h-4" alt="" /> : <Clock size={12} className="dark:text-slate-500" />}
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{feed?.title || 'Unknown Feed'}</span>
                </div>
                {feedArticles.map(article => (
                  <article 
                    key={article.id}
                    onClick={() => handleSelectArticle(article)}
                    className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${selectedArticle?.id === article.id ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!article.read_status && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm mb-1 leading-tight ${article.read_status ? 'text-slate-500 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>
                          {article.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))
          ) : (
            // Standard List View
            articles.filter(a => {
              if (!selectedFeed) return true;
              if (selectedFeed.isFolder) return true;
              return a.feed_id === selectedFeed.id;
            }).map(article => (
              <article 
                key={article.id}
                onClick={() => handleSelectArticle(article)}
                className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${selectedArticle?.id === article.id ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!article.read_status && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter truncate">
                      {feeds.find(f => f.id === article.feed_id)?.title || 'Feed'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                  </span>
                </div>
                <h3 className={`text-sm mb-2 leading-tight ${article.read_status ? 'text-slate-500 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>
                  {article.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {article.summary?.replace(/<[^>]*>?/gm, '')}
                </p>
                <div className="mt-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => toggleFavorite(e, article)} className={`${article.favorite ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500'}`}>
                     <Star size={14} fill={article.favorite ? "currentColor" : "none"} />
                   </button>
                   <button 
                    onClick={(e) => toggleReadStatus(e, article)}
                    className={`${article.read_status ? 'text-slate-400 dark:text-slate-500' : 'text-blue-500'} hover:text-blue-600 transition-colors`}
                    title={article.read_status ? "Mark as unread" : "Mark as read"}
                   >
                     <CheckCircle size={14} fill={article.read_status ? "currentColor" : "none"} />
                   </button>
                </div>
              </article>
            )))}
        </div>
      </main>

      {/* Reader View - Flexible */}
      <section className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto">
        {selectedArticle ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto px-8 py-12"
          >
            <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm mb-4">
                 <span>{feeds.find(f => f.id === selectedArticle.feed_id)?.title}</span>
                 <span>•</span>
                 <span>{new Date(selectedArticle.published_at).toLocaleDateString()}</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight mb-6">
                {selectedArticle.title}
              </h1>
              <div className="flex gap-4">
                <a 
                  href={selectedArticle.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-orange-500/20"
                >
                  Visit Website <ExternalLink size={14} />
                </a>
                <button 
                  onClick={(e) => toggleFavorite(e, selectedArticle)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Star size={14} fill={selectedArticle.favorite ? "currentColor" : "none"} />
                  {selectedArticle.favorite ? 'Saved' : 'Save for Later'}
                </button>
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  {isFullScreen ? 'Exit' : 'Full Screen'}
                </button>
              </div>
            </div>

            <div 
              className={`prose prose-slate max-w-none 
              prose-headings:font-bold prose-a:text-orange-500 
              prose-img:rounded-xl prose-img:shadow-lg
              ${isDarkMode ? 'prose-invert' : ''}
              text-lg leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: selectedArticle.content || selectedArticle.summary }}
            />
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
             <Rss size={64} className="mb-4 opacity-10" />
             <p className="text-lg">Select an article to start reading</p>
          </div>
        )}
      </section>

      {/* Add Feed Modal */}
      {showAddFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            onClick={() => setShowAddFeed(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
                 <h2 className="text-xl font-bold mb-4 dark:text-slate-100">Add Content</h2>
                 <div className="relative mb-6">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                   </div>
                   <input
                     type="text"
                     value={newFeedUrl}
                     onChange={(e) => setNewFeedUrl(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
                     placeholder="Enter website URL or RSS feed"
                     className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                   />
                 </div>

                 <div className="mb-6">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Select Folder</label>
                   <select 
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                   >
                     <option value="">No Folder (Uncategorized)</option>
                     {categories.map(cat => (
                       <option key={cat.id} value={cat.id}>{cat.name}</option>
                     ))}
                   </select>
                 </div>

                 {error && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400"
                   >
                     {error}
                   </motion.div>
                 )}

                 {loading ? (
                   <div className="py-8 flex justify-center"><RefreshCw className="animate-spin text-orange-500" /></div>
                 ) : discoveryResults.length > 0 ? (
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                     {discoveryResults.map((res, i) => (
                       <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between group hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                         <div className="flex-1 min-w-0 pr-4">
                           <p className="text-sm font-bold truncate dark:text-slate-100">{res.title}</p>
                           <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{res.url}</p>
                         </div>
                         <button 
                           onClick={() => handleAddFeed(res.url)}
                           className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-transform active:scale-95"
                         >
                           Subscribe
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="py-8 text-center text-slate-400 dark:text-slate-600 text-sm">
                     <Plus className="mx-auto mb-2 opacity-20" size={32} />
                     <p>Paste a URL and press Enter to search for feeds</p>
                   </div>
                 )}
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            onClick={() => setShowAddFolder(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 dark:text-slate-100">New Folder</h2>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name..."
                className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateFolder}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold"
                >
                  Create
                </button>
                <button 
                  onClick={() => setShowAddFolder(false)}
                  className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
