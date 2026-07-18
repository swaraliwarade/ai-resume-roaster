export async function getRoastHistory() {
  const response = await fetch(
    "http://localhost:8000/api/history"
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.roasts;
}