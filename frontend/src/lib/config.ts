// Use Environment Variable for API URL (Vercel) or fallback to local network IP
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.97:8000";
