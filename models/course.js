const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Make title required
  background_image: { type: String, trim: true }, // Add trim for URLs
  progress_tracking: { type: Boolean, default: true }, // Add default value
  modules: [
    {
      module_id: { type: String, required: true }, // Make module_id required
      title: { type: String, required: true },
      level: { type: Number, min: 1 }, // Add validation
      content: { type: String, required: true },
      points: { type: Number, default: 0, min: 0 }, // Add min validation
      quiz: [
        {
          quiz_id: { type: String, required: true },
          title: { type: String, required: true },
          questions: [
            {
              question_text: { type: String, required: true },
              options: [{ type: String, required: true }],
              correct_option: { type: Number, required: true, min: 0 },
            },
          ],
        },
      ],
    },
  ],
  feedback: [
    {
      user_id: { type: String, required: true },
      comment: { type: String, trim: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      date: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);