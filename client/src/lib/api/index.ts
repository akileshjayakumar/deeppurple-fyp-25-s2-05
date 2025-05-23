import axios, { AxiosError, AxiosResponse } from "axios";

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // If the error is 401 (unauthorized) and we're not already retrying
    if (
      error.response?.status === 401 &&
      originalRequest &&
      originalRequest.headers &&
      !originalRequest.headers["X-Retry"]
    ) {
      // Attempt to refresh token logic would go here
      // For now, just redirect to login if token is invalid
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs
export const authApi = {
  login: async (email: string, password: string) => {
    // Create URLSearchParams for form data
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post("/auth/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  signup: async (userData: {
    email: string;
    fullName: string;
    password: string;
    isAdmin: boolean;
    userTier: string;
  }) => {
    const response = await api.post("/auth/signup", {
      email: userData.email,
      full_name: userData.fullName,
      password: userData.password,
      is_admin: userData.isAdmin,
      user_tier: userData.userTier,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    localStorage.removeItem("token");
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

// Session APIs
export const sessionApi = {
  createSession: async (name: string) => {
    const response = await api.post(
      "/sessions",
      { name },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  },

  getSessions: async (filter?: {
    archived?: boolean;
    emotion?: string;
    search?: string;
  }) => {
    const response = await api.get("/sessions", { params: filter });
    return response.data;
  },

  getSessionById: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  updateSession: async (
    sessionId: string,
    data: { name?: string; is_archived?: boolean }
  ) => {
    const response = await api.patch(`/sessions/${sessionId}`, data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  },

  deleteSession: async (sessionId: string) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  getSessionInsights: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/insights`);
    return response.data;
  },

  exportSessionReport: async (
    sessionId: string,
    format: "markdown" | "pdf" | "csv"
  ) => {
    const response = await api.get(`/sessions/${sessionId}/export`, {
      params: { format },
      responseType: "blob",
    });

    // Return the blob directly
    return response.data;
  },

  getSessionMessages: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/messages`);
    return response.data;
  },
};

// Analysis APIs
export const analysisApi = {
  analyzeText: async (sessionId: string, text: string) => {
    const response = await api.post(
      `/analysis/text`,
      {
        session_id: sessionId,
        text,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  },

  askQuestion: async (sessionId: string, question: string) => {
    try {
      const response = await api.post(
        `/analysis/question`,
        {
          session_id: sessionId,
          question,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error in askQuestion API call:", error);
      // If the question API fails (likely due to no files), try to directly analyze the text
      // This ensures users can still interact with the system even without uploaded files
      try {
        console.log("Falling back to text analysis for the question");
        const analysisResponse = await api.post(
          `/analysis/text`,
          {
            session_id: sessionId,
            text: question,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        // Transform the analysis response to match question response format
        return {
          answer: `I've analyzed your text: "${question}"\n\nSentiment: ${analysisResponse.data.sentiment.overall}\nDominant emotion: ${analysisResponse.data.emotions.dominant_emotion}\n\nI can analyze more text or answer questions about sentiment analysis. What else would you like to know?`,
          sources: [],
        };
      } catch (secondError) {
        console.error("Failed fallback to text analysis:", secondError);
        return {
          answer:
            "I can help answer your questions about sentiment analysis and emotions. What would you like to know?",
          sources: [],
        };
      }
    }
  },

  // New function to ask a question with file upload in a single request
  askQuestionWithFile: async (
    sessionId: string,
    question: string,
    file: File
  ) => {
    console.log("Asking question with file upload:", {
      sessionId,
      question,
      fileName: file.name,
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);
    formData.append("question", question);

    try {
      const response = await api.post(
        "/analysis/question/with-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error in askQuestionWithFile API call:", error);
      throw error;
    }
  },

  // Stream version for token-by-token responses
  streamQuestion: async (
    sessionId: string,
    question: string,
    onTokenCallback: (token: string) => void
  ) => {
    try {
      console.log("Starting streaming response for question:", question);

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/analysis/question/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            question,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Process the stream using ReadableStream API
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const token = decoder.decode(value);
          onTokenCallback(token);
        }
      }

      return true;
    } catch (error) {
      console.error("Error in streamQuestion API call:", error);
      onTokenCallback("\nError: Failed to stream response. Please try again.");
      return false;
    }
  },
};

// File APIs
export const fileApi = {
  uploadFile: async (sessionId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId.toString());

    console.log("Sending to API:", {
      file: file.name,
      session_id: sessionId.toString(),
      size: file.size,
    });

    try {
      const response = await api.post("/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(
        "File upload API error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getFiles: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/files`);
    return response.data;
  },

  deleteFile: async (fileId: string) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },
};

// User Profile APIs
export const userApi = {
  updateProfile: async (data: { fullName?: string; profilePicture?: File }) => {
    const formData = new FormData();

    if (data.fullName) {
      formData.append("full_name", data.fullName);
    }

    if (data.profilePicture) {
      formData.append("profile_picture", data.profilePicture);
    }

    const response = await api.patch("/users/profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.post("/users/change-password", {
      current_password: data.currentPassword,
      new_password: data.newPassword,
    });
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete("/users/profile");
    return response.data;
  },
};

// Admin APIs
export const adminApi = {
  getUsers: async () => {
    console.log("Fetching users from admin API");
    const response = await api.get("/admin/users");
    console.log("Admin API Response:", response.data);
    return response.data;
  },

  updateUser: async (
    userId: string,
    data: { fullName?: string; isActive?: boolean; isAdmin?: boolean }
  ) => {
    console.log("Updating user:", userId, data);
    const response = await api.put(`/admin/users/${userId}`, {
      full_name: data.fullName,
      is_active: data.isActive,
      is_admin: data.isAdmin,
    });
    return response.data;
  },

  deactivateUser: async (userId: string) => {
    console.log("Deactivating user:", userId);
    const response = await api.put(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  activateUser: async (userId: string) => {
    console.log("Activating user:", userId);
    const response = await api.put(`/admin/users/${userId}/activate`);
    return response.data;
  },
};

export default api;
