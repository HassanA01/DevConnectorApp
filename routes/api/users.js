const express = require("express");
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../../models/User");

// @route       POST api/users
// @desc        Register a user
// @access      public
router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required min 6 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password } = req.body;

      let user = await User.findOne({ email: email });

      if (user) {
        return res
          .status(400)
          .json({ error: [{ msg: "User already exists" }] });
      }
      // See if user is already registered, then get user's gravatar, then encrypt password and finally return jsonwebtoken

      const avatar = gravatar.url(email, {
        s: "200",
        r: "pg",
        d: "mm",
      });

      user = new User({
        name,
        email,
        avatar,
        password: await encrypt_password(password),
      });

      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 }, // Optional param
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server error: " + err);
    }
  }
);

const encrypt_password = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
};

module.exports = router;
