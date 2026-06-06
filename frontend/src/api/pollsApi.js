const API_BASE_URL = "http://localhost:3000/api";

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

export async function getPollResults(publicId) {
  const response = await fetch(`${API_BASE_URL}/polls/${publicId}/results`);

  return handleResponse(response);
}

export async function getAdminPoll(adminToken) {
  const response = await fetch(`${API_BASE_URL}/polls/admin/${adminToken}`);

  return handleResponse(response);
}
