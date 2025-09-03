import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  interests: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }]
}, {
  timestamps: true
});


UserSchema.index({ username: 1 });
UserSchema.index({ interests: 1 });

export default mongoose.model<IUser>('User', UserSchema);