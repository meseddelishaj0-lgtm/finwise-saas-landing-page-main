import axios from "axios";

const api = axios.create({
  baseURL: "https://wallstreetstocks.ai/api",
  headers: { "Content-Type": "application/json" },
});

export default api;
