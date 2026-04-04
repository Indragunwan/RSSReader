import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const FeedService = {
  getCategories: () => axios.get(`${API_URL}/categories`),
  createCategory: (name) => axios.post(`${API_URL}/categories`, { name }),
  deleteCategory: (id) => axios.delete(`${API_URL}/categories/${id}`),
  getFeeds: (categoryId = null) => axios.get(`${API_URL}/feeds`, { params: { category_id: categoryId } }),
  createFeed: (url, categoryId = null) => axios.post(`${API_URL}/feeds`, { url, category_id: categoryId }),
  updateFeed: (id, categoryId) => axios.patch(`${API_URL}/feeds/${id}`, null, { params: { category_id: categoryId } }),
  deleteFeed: (id) => axios.delete(`${API_URL}/feeds/${id}`),
  getArticles: (params) => axios.get(`${API_URL}/articles`, { params }),
  updateArticle: (id, data) => axios.put(`${API_URL}/articles/${id}`, data),
  markAllRead: (params) => axios.post(`${API_URL}/articles/mark-all-read`, null, { params }),
  discoverFeeds: (url) => axios.get(`${API_URL}/discover`, { params: { url } }),
  refreshFeeds: () => axios.post(`${API_URL}/refresh`),
};
