const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  points: {
    type: Number,
    default: 0,
  },
  streak: {
    current: { type: Number, default: 0 },
    highest: { type: Number, default: 0 },
  },
  level: {
    type: Number,
    default: 1,
  },
  region: {
    type: String,
    trim: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
