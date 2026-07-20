const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  try {
    let query = supabase.from("roasts").select("*");

    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      } catch (err) {
        console.error("History token validation error:", err);
      }
    }

    if (userId) {
      // User is authenticated, retrieve user-specific roasts
      query = query.eq("user_id", userId);
    } else {
      // User is anonymous, retrieve public roasts where user_id is null
      query = query.is("user_id", null);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

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