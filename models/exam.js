const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // link to the course
  questions: [
    {
      question_text: { type: String, required: true },
      options: [{ type: String, required: true }],
      correct_option: { type: Number, required: true },
    }
  ],
  badge: { type: String },
  e_certificate: { type: String },
  points: { type: Number, required: true },
});

module.exports = mongoose.model("Exam", examSchema);