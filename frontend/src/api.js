export const roastResume = async (resume) => {
  const response = await fetch(
    "http://localhost:8000/api/roast",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resume,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to roast resume");
  }

  return response.json();
};