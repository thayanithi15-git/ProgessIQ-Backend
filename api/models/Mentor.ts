import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contactNo: { type: String, required: true },
  place: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true }
});

const Mentor = mongoose.model('Mentor', mentorSchema);

export default Mentor;
