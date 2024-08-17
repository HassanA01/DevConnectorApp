const express = require("express");
const auth = require("../../middleware/auth");
const config = require("config");
const request = require("request");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route       GET api/profile/
// @desc        Get All User's profiles
// @access      Public
router.get("/", async (req, res) => {
  try {
    const allProfiles = await Profile.find({}).populate("user", [
      "name",
      "avatar",
    ]);

    if (!allProfiles) {
      res.status(404).json({ message: "Error retrieving all profiles" });
    } else {
      res.status(200).json({ profiles: allProfiles });
    }
  } catch (err) {
    console.error("Server error");
    res.status(500).json({ message: err.message });
  }
});

// @route       GET api/profile/user/:user_id
// @desc        Get user profile from user_id
// @access      Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const userProfile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name", "avatar"]);

    if (!userProfile) {
      res.status(400).json({ message: "Profile not found" });
    } else {
      res.status(200).json({ userProfile });
    }
  } catch (err) {
    if (err.kind == "ObjectId") {
      return res.status(400).json({ message: "Profile not found" });
    }
    console.error("Server error");
    res.status(500).json({ message: err.message });
  }
});

// @route       DELETE api/profile/user/:user_id
// @desc        Delete user profile from user_id
// @access      Private
router.delete("/", auth, async (req, res) => {
  try {
    await Profile.findOneAndDelete({ user: req.user.id });

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({ message: "User successfully deleted." });
  } catch (err) {
    if (err.kind == "ObjectId") {
      return res.status(400).json({ message: "Profile not found" });
    }
    console.error("Server error");
    res.status(500).json({ message: err.message });
  }
});

// @route       GET api/profile/me
// @desc        Get Current user profile
// @access      Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      "user",
      ["name", "avatar"]
    );

    if (!profile) {
      return res
        .status(400)
        .json({ message: "no profile found for this user" });
    }

    res.status(200).json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// @route       POST api/profile
// @desc        Create user profile
// @access      Private
router.post(
  "/",
  [
    auth,
    check("status", "Status is required").not().isEmpty(),
    check("skills", "Skills are required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const fields = [
      "company",
      "website",
      "location",
      "bio",
      "status",
      "githubprofile",
      "skills",
    ];

    const socialFields = [
      "youtube",
      "twitter",
      "facebook",
      "linkedin",
      "instagram",
    ];

    const profileFields = { user: req.user.id, socials: {} };

    fields.forEach((field) => {
      if (req.body[field]) {
        if (field === "skills") {
          profileFields[field] = req.body[field]
            .split(",")
            .map((skill) => skill.trim());
        } else {
          profileFields[field] = req.body[field];
        }
      }
    });

    socialFields.forEach((field) => {
      if (req.body[field]) profileFields.socials[field] = req.body[field];
    });

    console.log(profileFields.skills);

    try {
      let profile = await Profile.findOne({ user: profileFields.user });

      if (profile) {
        // Since we found the user exists we need to update their profile
        profile = await Profile.findOneAndUpdate(
          { user: profileFields.user },
          { $set: profileFields },
          { new: true }
        );

        return res.status(200).json(profile);
      }

      // No profile found means we need to create a profile for the user:
      profile = new Profile(profileFields);

      await profile.save();

      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server error: " + err.message });
    }
  }
);

// @route       POST api/profile/experience
// @desc        Add profile experience
// @access      Private
router.post(
  "/experience",
  [
    auth,
    check("title", "Title is required").not().isEmpty(),
    check("company", "Company is required").not().isEmpty(),
    check("startdate", "Start date is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const expFields = {};

    const fields = [
      "title",
      "company",
      "location",
      "startdate",
      "enddate",
      "current",
      "description",
    ];

    fields.forEach((field) => {
      if (req.body[field]) {
        expFields[field] = req.body[field];
      }
    });

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      if (!profile) {
        return res.status(404).json({ msg: "Profile not found" });
      }

      profile.experience.unshift(expFields);

      await profile.save();

      return res.status(200).json(profile);

      b;
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server error");
    }
  }
);

// @route       PUT api/profile/experience/:exp_id
// @desc        Update profile experience
// @access      Private
router.put(
  "/experience/:exp_id",
  [
    auth,
    check("title", "Title is required").not().isEmpty(),
    check("company", "Company is required").not().isEmpty(),
    check("startdate", "Start date is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const expFields = {};

    const fields = [
      "title",
      "company",
      "location",
      "startdate",
      "enddate",
      "current",
      "description",
    ];

    fields.forEach((field) => {
      if (req.body[field]) {
        expFields[field] = req.body[field];
      }
    });

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      if (!profile) {
        return res.status(404).json({ msg: "Profile not found" });
      }

      const profileExpIndex = profile.experience.findIndex(
        (exp) => exp._id.toString() === req.params.exp_id
      );

      if (profileExpIndex === -1) {
        return res.status(404).json({ msg: "Experience not found" });
      }

      profile.experience[profileExpIndex] = {
        ...profile.experience[profileExpIndex]._doc,
        ...expFields,
      };

      await profile.save();

      return res.status(200).json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server error");
    }
  }
);

// @route       DELETE api/profile/experience/:exp_id
// @desc        Delete profile experience
// @access      Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  const errors = await validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    const profileExpIndex = profile.experience.findIndex(
      (exp) => exp._id.toString() === req.params.exp_id
    );

    if (profileExpIndex === -1) {
      return res.status(404).json({ msg: "Experience not found" });
    }

    profile.experience.splice(profileExpIndex, 1);

    await profile.save();

    return res.status(200).json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// @route       POST api/profile/education
// @desc        Add profile education
// @access      Private
router.post(
  "/education",
  [
    auth,
    check("school", "School is required").not().isEmpty(),
    check("degree", "Degree type is required").not().isEmpty(),
    check("fieldofstudy", "Field of study is required").not().isEmpty(),
    check("startdate", "Start date is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const eduFields = {};

    const fields = [
      "school",
      "degree",
      "fieldofstudy",
      "startdate",
      "enddate",
      "current",
      "courses",
    ];

    fields.forEach((field) => {
      if (field === "courses") {
        eduFields[field] = req.body[field]
          .split(",")
          .map((course) => course.trim());
      } else if (req.body[field]) {
        eduFields[field] = req.body[field];
      }
    });

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      if (!profile) {
        return res.status(404).json({ msg: "Profile not found" });
      }

      profile.education.unshift(eduFields);

      await profile.save();

      return res.status(200).json(profile);

      b;
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server error");
    }
  }
);

// @route       PUT api/profile/education/:edu_id
// @desc        Update profile education
// @access      Private
router.put(
  "/education/:edu_id",
  [
    auth,
    check("school", "School is required").not().isEmpty(),
    check("degree", "Degree type is required").not().isEmpty(),
    check("fieldofstudy", "Field of study is required").not().isEmpty(),
    check("startdate", "Start date is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      console.error(errors);
      return res.status(400).json({ errors: errors.array() });
    }

    const eduFields = {};

    const fields = [
      "school",
      "degree",
      "fieldofstudy",
      "startdate",
      "enddate",
      "current",
      "courses",
    ];

    fields.forEach((field) => {
      if (field === "courses") {
        eduFields[field] = req.body[field]
          .split(",")
          .map((course) => course.trim());
      } else if (req.body[field]) {
        eduFields[field] = req.body[field];
      }
    });

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      if (!profile) {
        return res.status(404).json({ msg: "Profile not found" });
      }

      const profileEduIndex = profile.education.findIndex(
        (edu) => edu._id.toString() === req.params.edu_id
      );

      if (profileEduIndex === -1) {
        return res.status(404).json({ msg: "Education not found" });
      }

      profile.education[profileEduIndex] = {
        ...profile.education[profileEduIndex]._doc,
        ...eduFields,
      };

      await profile.save();

      return res.status(200).json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).json("Server error");
    }
  }
);

// @route       DELETE api/profile/education/:edu_id
// @desc        Delete education
// @access      Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  const errors = await validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    const profileEduIndex = profile.education.findIndex(
      (edu) => edu._id.toString() === req.params.edu_id
    );

    if (profileEduIndex === -1) {
      return res.status(404).json({ msg: "Education not found" });
    }

    profile.education.splice(profileEduIndex, 1);

    await profile.save();

    return res.status(200).json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// @route       GET api/profile/github/:username
// @desc        Get user repos from github
// @access      Public
router.get("/github/:username", (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "githubClientId"
      )}&client_secret=${config.get("githubClientSecret")}`,
      method: "GET",
      headers: { "user-agent": "node.js" },
    };

    request.get(options, (err, response, body) => {
      if (err) {
        console.error(err);
      }

      if (response.statusCode !== 200) {
        res.status(404).json({ msg: "No github profile found" });
      }

      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});
module.exports = router;
