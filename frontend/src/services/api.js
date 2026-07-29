const API_URL =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, ""); // default goes through Vite proxy

const buildUrl = (endpoint) =>
  `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

async function request(endpoint, options = {}) {
  const res = await fetch(buildUrl(endpoint), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Non-JSON response from server" };
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || data?.msg || `Request failed (${res.status})`);
  }

  return data;
}

// Export the request function for use by other services
export { request };

export const registerUser = (userData) => {
  console.log("Attempting to register user:", userData);
  return request("/users/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const loginUser = (userData) => {
  return request("/users/login", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const getGrievances = (page = 1, limit = 10, token, submitterUserId = null) => {
  const url = `/grievances?page=${page}&limit=${limit}${submitterUserId ? `&submitterUserId=${submitterUserId}` : ''}`;
  return request(url, {
    headers: token ? { "x-auth-token": token } : {},
  }).then((response) =>
    Array.isArray(response) ? response : response.data || []
  );
};

export const createGrievance = (grievanceData, token) => {
  return request("/grievances", {
    method: "POST",
    headers: { "x-auth-token": token },
    body: JSON.stringify(grievanceData),
  });
};

export const deleteGrievance = (id, token) => {
  return request(`/grievances/${id}`, {
    method: "DELETE",
    headers: { "x-auth-token": token },
  });
};

export const updateGrievance = (id, grievanceData, token) => {
  return request(`/grievances/${id}`, {
    method: "PUT",
    headers: { "x-auth-token": token },
    body: JSON.stringify(grievanceData),
  });
};

export const upvoteGrievance = (id, userId) => {
  return request(`/grievances/${id}/upvote`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
};

export const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const serverBase = API_URL.replace(/\/api$/, "");
  return `${serverBase}${url}`;
};

export const askChatbot = (messages, userContext) => {
  return request("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, userContext }),
  });
};

export const checkDuplicates = (category, latitude, longitude, title) => {
  return request("/grievances/check-duplicates", {
    method: "POST",
    body: JSON.stringify({ category, latitude, longitude, title }),
  });
};

export const forgotPassword = (email) => {
  return request("/users/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const resetPassword = (email, newPassword) => {
  return request("/users/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, newPassword }),
  });
};
