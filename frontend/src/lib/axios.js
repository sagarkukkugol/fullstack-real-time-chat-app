import axios from "axios";

export const axiosInstance = axios.create({
  // ✅ FIX #3: baseURL must end with /api — VITE_API_URL is now the bare base URL
  baseURL: import.meta.env.VITE_API_URL + "/api",
  withCredentials: true, // ✅ sends cookies cross-origin
});
