import mongoose from "mongoose";
mongoose.Promise = global.Promise;
import bcrypt from "bcrypt";

const AdminSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  photo: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isLoggedIn: {
    type: Boolean,
  },
});

// generating a hash
AdminSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(), null);
};

// checking if password is valid
AdminSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

const Admin = mongoose.model("Admin", AdminSchema);

export default Admin; 
