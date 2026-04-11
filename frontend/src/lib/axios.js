import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://your-backend.onrender.com/api",
  withCredentials: true, // 🔥 VERY IMPORTANT (sends cookies)
});

// ❌ REMOVE TOKEN INTERCEPTOR (not needed for cookie auth)

// Optional: response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API ERROR:", error?.response?.data || error.message);
    return Promise.reject(error);
  }
);