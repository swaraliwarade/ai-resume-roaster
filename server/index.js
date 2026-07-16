const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const roastRoute = require("./routes/roast");

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Resume Roaster API Running 🚀");
});

app.use("/api/roast", roastRoute);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});