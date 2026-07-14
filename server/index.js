const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Resume Roaster API Running 🚀");
});

app.listen(8000, () => {
  console.log("Server running on port 5000");
});