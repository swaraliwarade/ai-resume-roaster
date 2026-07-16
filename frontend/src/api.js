const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);

export const roastResume = async (resume) => {
  const response = await fetch(`${API_URL}/api/roast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resume }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to roast resume");
  }

  return response.json();
};