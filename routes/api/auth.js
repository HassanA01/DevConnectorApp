const express = require("express");
const auth = require("../../middleware/auth");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("config");

const User = require("../../models/User");

// @route       GET api/auth
// @desc        Get a user
// @access      public
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // the -password is to remove the password from the data given

    res.json(user);
  } catch (err) {
    console.err(err.message);
    res.status(500).json({ message: err.message });
  }
});

// @route       POST api/auth
// @desc        Authenicate a user and getting token
// @access      public
router.post(
  "/",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      let user = await User.findOne({ email: email });

      if (!user) {
        return res
          .status(400)
          .json({ error: [{ msg: "Invalid credentials." }] });
      }

      const passwordIsMatch = await bcrypt.compare(password, user.password);

      if (!passwordIsMatch) {
        return res
          .status(400)
          .json({ error: [{ msg: "Invalid credentials." }] });
      }

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

module.exports = router;
