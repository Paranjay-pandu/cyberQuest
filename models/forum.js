const mongoose = require("mongoose");

const forumSchema = new mongoose.Schema({
  forum_id: { type: String, required: true }, // Unique identifier for the forum
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // Optional reference to the Course model
  messages: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
      message: { type: String, required: true }, // Message content
      timestamp: { type: Date, default: Date.now }, // Default to current date
    }
  ]
}, { timestamps: true }); // Add timestamps for tracking creation and update time

module.exports = mongoose.model("Forum", forumSchema);