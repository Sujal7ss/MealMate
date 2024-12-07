import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";
dotenv.config({ path: ".variables.env" });

const register = async (req, res) => {
  try {
    let { email, password, passwordCheck, name, surname } = req.body;
    if (!email || !password || !passwordCheck)
      return res.status(400).json({ msg: "Not all fields have been entered." });
    if (password.length < 5)
      return res
        .status(400)
        .json({ msg: "The password needs to be at least 5 characters long." });
    if (password !== passwordCheck)
      return res
        .status(400)
        .json({ msg: "Enter the same password twice for verification." });

    const existingAdmin = await Admin.findOne({ email: email });
    if (existingAdmin)
      return res
        .status(400)
        .json({ msg: "An account with this email already exists." });

    if (!name) name = email;

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      email,
      password: passwordHash,
      name,
      surname,
    });
    const savedAdmin = await newAdmin.save();
    res.status(200).send({
      success: true,
      admin: {
        id: savedAdmin._id,
        name: savedAdmin.name,
        surname: savedAdmin.surname,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      result: null,
      message: err.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body; // Get the rememberMe value from the request body
    console.log(req.body);
    // Validate fields
    if (!email || !password)
      return res.status(400).json({ msg: "Not all fields have been entered." });

    const admin = await Admin.findOne({ email: email });
    if (!admin)
      return res.status(400).json({
        success: false,
        result: null,
        message: "No account with this email has been registered.",
      });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({
        success: false,
        result: null,
        message: "Invalid credentials.",
      });

    // Set token expiration time based on Remember Me
    const expirationTime = rememberMe
      ? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
      : Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours

    const token = jwt.sign(
      {
        exp: expirationTime,
        id: admin._id,
      },
      process.env.JWT_SECRET
    );

    const result = await Admin.findOneAndUpdate(
      { _id: admin._id },
      { isLoggedIn: true },
      { new: true }
    ).exec();

    res
      .header("x-auth-token", token)
      .status(200)
      .json({
        success: true,
        result: {
          admin: {
            id: result._id,
            name: result.name,
            isLoggedIn: result.isLoggedIn,
          },
          userRole: "admin",
        },
        message: "Successfully login admin",
      });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, result: null, message: err.message });
  }
};

const isValidToken = async (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res.status(401).json({
        success: false,
        result: null,
        message: "No authentication token, authorization denied.",
        jwtExpired: true,
      });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified)
      return res.status(401).json({
        success: false,
        result: null,
        message: "Token verification failed, authorization denied.",
        jwtExpired: true,
      });

    const admin = await Admin.findOne({ _id: verified.id });
    if (!admin)
      return res.status(401).json({
        success: false,
        result: null,
        message: "Admin doens't Exist, authorization denied.",
        jwtExpired: true,
      });

    if (admin.isLoggedIn === false)
      return res.status(401).json({
        success: false,
        result: null,
        message: "Admin is already logout try to login, authorization denied.",
        jwtExpired: true,
      });
    else {
      req.admin = admin;
      next();
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      result: null,
      message: err.message,
      jwtExpired: true,
    });
  }
};

const logout = async (req, res) => {
  const result = await Admin.findOneAndUpdate(
    { _id: req.admin._id },
    { isLoggedIn: false },
    {
      new: true,
    }
  ).exec();

  res.status(200).json({ isLoggedIn: result.isLoggedIn });
};

export { logout, register, isValidToken, login };
