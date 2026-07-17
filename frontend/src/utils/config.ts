export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://fifa-backend-z106.onrender.com";

export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || (() => {
  try {
    const url = new URL(API_BASE_URL);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${url.host}/api/ws`;
  } catch (e) {
    if (API_BASE_URL.startsWith("https://")) {
      return API_BASE_URL.replace("https://", "wss://") + "/api/ws";
    } else if (API_BASE_URL.startsWith("http://")) {
      return API_BASE_URL.replace("http://", "ws://") + "/api/ws";
    }
    return "wss://fifa-backend-z106.onrender.com/api/ws";
  }
})();
