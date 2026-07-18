const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("roasts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      roasts: data,
    });
  } catch (error) {
    console.error("History Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;