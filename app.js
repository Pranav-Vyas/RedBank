//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Expecto Patronum",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/redbankDB", {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  gender: String,
  phone_no: String,
  bg: String,
  city: String,
  last_donated: String,
  status: {
    type: Boolean,
    default: false
  }
})

userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


let not_login = {
  "Home": "/",
  "Search": "/list",
  "Donate": "/register",
  "About Us": "#footer"
}

let with_login = {
  "Home":"/",
  "Search": "/list",
  "About Us":"#footer",
  "Profile":["/secret","Pranav Vyas"]
}

app.get("/", (req, res) => {
  if (req.isAuthenticated()){
    with_login.Profile=["/secret",req.user.name];
    res.render("home",{nav_content:with_login});
  }else{
    res.render("home", {
      nav_content: not_login
    });
  }

})

app.get("/register", (req, res) => {
  if (! req.isAuthenticated()){
    res.render("register", {
      nav_content: not_login
    });
  }

})

app.get("/login", (req, res) => {
  if (! req.isAuthenticated()){
    res.render("login", {
      nav_content: not_login
    });
  }
})

app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect("/");
});

app.get("/secret", (req, res) => {
  if (req.isAuthenticated()) {
    User.findOne({
      email: req.user.email
    }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          with_login.Profile=["/secret",req.user.name];
          res.render("secret", {
            nav_content: with_login,
            name_of_user: foundUser.name,
            status: foundUser.status,
            user_email: foundUser.email
          });
        }
      }
    })

  } else {
    res.redirect("/login");
  }
})

app.get("/list",(req,res)=>{
  User.find({status: false},(err,foundlist)=>{
    if (err){
      console.log(err);
    }else{
      if (req.isAuthenticated()){
        with_login.Profile=["/secret",req.user.name];
        res.render("list", {
          nav_content: with_login,
          list: foundlist
        });
      }else{
        res.render("list", {
          nav_content: not_login,
          list: foundlist
        });
      }
    }
  })
})


app.post("/register", (req, res) => {
  var d = new Date();
  d.setDate(d.getDate() - 85);
  d = d.toLocaleDateString('en-US');

  User.register(new User({
    name: String(req.body.fname) + ' ' + String(req.body.lname),
    email: req.body.email,

    gender: req.body.gender,
    phone_no: req.body.phone,
    bg: req.body.BG,
    city: req.body.city,
    last_donated: d,
  }), req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secret");
      })
    }
  })

});



app.post("/login", (req, res) => {

  const curUser = new User({
    email: req.body.email,
    password: req.body.password
  });

  req.login(curUser, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req,res,()=>{
          var today = new Date();
          var pre = new Date(req.user.last_donated);
          const diffTime = Math.abs(today - pre);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays>=84){
            User.updateOne({email:req.user.email},{status:false},(err)=>{
              if(err){
                console.log(err);
              }else{
                console.log("Successfully updated");
              }
            })
            res.redirect("/secret");
          } else {
            User.updateOne({email:req.user.email},{status:true},(err)=>{
              if(err){
                console.log(err);
              }else{
                console.log("Successfully updated");
              }
            })
            res.redirect("/secret");
          }
      })
    }
  })
})

app.post("/secret", (req, res) => {
  var today = new Date();
  today = today.toLocaleDateString('en-US');
  User.updateOne({
    email: req.body.save_button
  }, {
    status: true,
    last_donated: today
  }, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully updated!");
      res.redirect("/secret");
    }
  });
})

app.post("/", (req, res) => {
  User.find({}, (err, list) => {
    if (err) {
      console.log(err);
    } else {
      var today = new Date();
      list.forEach((user) => {
        var pre = new Date(user.last_donated);
        const diffTime = Math.abs(today - pre);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 84) {
          User.updateOne({
            email: user.email
          }, {
            status: false
          }, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Successfully updated!");
            }
          });
        } else {
          User.updateOne({
            email: user.email
          }, {
            status: true
          }, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Successfully updated!");
            }
          });
        }
      });

    }
  })

  User.find({
    status: false,
    city: req.body.city,
    bg: req.body.BG
  }, (err, list) => {
    if (err) {
      console.log(err);
    } else {
      if (req.isAuthenticated()){
        res.render("list", {
          nav_content: with_login,
          list: list
        });
      }else{
        res.render("list", {
          nav_content: not_login,
          list: list
        });
      }
    }

    }
  )
});


app.listen(3000, () => {
  console.log("Server has started on port 3000");
})
