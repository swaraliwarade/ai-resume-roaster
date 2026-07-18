const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No PDF file uploaded.",
      });
    }

    const data = await pdfParse(req.file.buffer);
    let text = data.text;
    text = text
    .replace(/�/g, "")
    .replace(/■/g, "")
    .replace(/7/g, " ")
    .replace(/\s+/g, " ")
    .trim();
    

    return res.json({
      success: true,
      text: data.text,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;