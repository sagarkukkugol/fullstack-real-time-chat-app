import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/api",   // 🔥 THIS FIXES YOUR 401
});

// ✅ attach token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});