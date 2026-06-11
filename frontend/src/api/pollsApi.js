const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Die API hat keine JSON-Antwort geliefert. Bitte VITE_API_BASE_URL und die Backend-Route pruefen."
    );
  }

  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error("Die API-Antwort konnte nicht gelesen werden.");
  }

  if (!response.ok) {
    throw new Error(result?.error || "Es ist ein Fehler aufgetreten.");
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

export async function activatePoll(activationToken) {
  const response = await fetch(`${API_BASE_URL}/polls/activate/${activationToken}`, {
    method: "POST",
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

export async function reportPoll(publicId, data) {
  const response = await fetch(`${API_BASE_URL}/polls/${publicId}/report`, {
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

  await handleResponse(response);

  return null;
}

export async function getOperatorPolls(token) {
  const response = await fetch(`${API_BASE_URL}/polls/operator/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

export async function updateOperatorPollStatus(token, publicId, data) {
  const response = await fetch(
    `${API_BASE_URL}/polls/operator/admin/${publicId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse(response);
}

export async function addIgnoredCreatorEmail(token, data) {
  const response = await fetch(`${API_BASE_URL}/polls/operator/admin/ignored-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function removeIgnoredCreatorEmail(token, email) {
  const response = await fetch(
    `${API_BASE_URL}/polls/operator/admin/ignored-emails/${encodeURIComponent(
      email
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  await handleResponse(response);

  return null;
}

export async function deleteOperatorPoll(token, publicId) {
  const response = await fetch(`${API_BASE_URL}/polls/operator/admin/${publicId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await handleResponse(response);

  return null;
}
