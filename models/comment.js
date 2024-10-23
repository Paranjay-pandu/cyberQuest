const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
  comment: { type: String, required: true }, // Comment content
  type: { 
    type: String, 
    enum: ["report", "feedback", "comment"], // Allowed values for comment type
    required: true 
  }, 
  date: { type: Date, default: Date.now }, // Default to current date
  resolved: { type: Boolean, default: false }, // Indicates if the issue is resolved
}, { timestamps: true }); // Add timestamps for tracking creation and update time

module.exports = mongoose.model("Comment", commentSchema);
