const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

async function handleResponse(response) {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Es ist ein Fehler aufgetreten.");
  }

  return result;
}

export async function createPoll(data) {
  const response = await fetch(`${API_BASE_URL}/polls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function getPoll(publicId) {
  const response = await fetch(`${API_BASE_URL}/polls/${publicId}`);

  return handleResponse(response);
}

export async function vote(publicId, data) {
  const response = await fetch(`${API_BASE_URL}/polls/${publicId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function getParticipation(publicId, voterToken) {
  const response = await fetch(
    `${API_BASE_URL}/polls/${publicId}/participation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voterToken }),
    }
  );

  return handleResponse(response);
}

export async function getPollResults(publicId) {
  const response = await fetch(`${API_BASE_URL}/polls/${publicId}/results`);

  return handleResponse(response);
}

export async function getAdminPoll(adminToken) {
  const response = await fetch(`${API_BASE_URL}/polls/admin/${adminToken}`);

  return handleResponse(response);
}

export async function updateAdminPoll(adminToken, data) {
  const response = await fetch(`${API_BASE_URL}/polls/admin/${adminToken}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function closeAdminPoll(adminToken) {
  const response = await fetch(
    `${API_BASE_URL}/polls/admin/${adminToken}/close`,
    {
      method: "POST",
    }
  );

  return handleResponse(response);
}

export async function extendAdminPoll(adminToken, durationDays) {
  const response = await fetch(
    `${API_BASE_URL}/polls/admin/${adminToken}/extend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ durationDays }),
    }
  );

  return handleResponse(response);
}

export async function deleteAdminPoll(adminToken) {
  const response = await fetch(`${API_BASE_URL}/polls/admin/${adminToken}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || "Es ist ein Fehler aufgetreten.");
  }

  return null;
}
