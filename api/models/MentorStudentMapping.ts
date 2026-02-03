import mongoose from 'mongoose';

const mentorStudentMappingSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  mappedOn: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const MentorStudentMapping = mongoose.model('MentorStudentMapping', mentorStudentMappingSchema);

export default MentorStudentMapping;
