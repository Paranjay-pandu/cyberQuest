const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  points: {
    type: Number,
    default: 0, // Default points can be set to 0
  },
  highest_streak: {
    type: Number,
    default: 0, // Default highest streak can be set to 0
  },
  current_streak: {
    type: Number,
    default: 0, // Default current streak can be set to 0
  },
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
