import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/api",        // 🔥 IMPORTANT CHANGE
  withCredentials: true,
});
