const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const roastRoute = require("./routes/roast");
const uploadRoute = require("./routes/upload");
const supabase = require("./config/supabase");
const app = express();
const historyRoute = require("./routes/history");

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.send("Resume Roaster API Running 🚀");
});

app.use("/api/upload", uploadRoute);
app.use("/api/roast", roastRoute);
app.use("/api/history", historyRoute);

const PORT = process.env.PORT || 8000;

app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase
    .from("roasts")
    .select("*");

  res.json({
    data,
    error,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});