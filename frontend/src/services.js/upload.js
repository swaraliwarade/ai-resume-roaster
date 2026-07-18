export const uploadResume = async (file) => {
  const formData = new FormData();

  formData.append("resume", file);

  const response = await fetch(
    "http://localhost:8000/api/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.text;
};