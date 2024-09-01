import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import JSDOM from "jsdom";

// cosnt document = dom.window.document;

const app = express();
const port = 3000;
const saltround=10;
env.config();
var str ="Login";

var data = []


app.use(session({
    secret: process.env.TOP_SECRET,
    resave: false,
    saveUninitialized : true,
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:process.env.PG_PORT,
});
db.connect();

const clickedHeading = "";
function handleClick(heading) {
    clickedHeading = heading;
    console.log("Clicked Heading:", clickedHeading);
}

app.get("/",async(req,res)=>{
  // console.log(str);
  const isLoggedIn = req.isAuthenticated();
  try{
    if(str=="Login"){
      const result = await db.query("select * from blog_posts order by post_id asc");
      let items = result.rows;
      // console.log(items);
      res.render("index.ejs",{val:str,listitems:items,isLoggedIn});
    }else{
      const result = await db.query("select * from blog_posts where user_name=$1 order by post_id asc",[str,]);
      let items = result.rows;
      // console.log(items);
      res.render("index.ejs",{val:str,listitems:items,isLoggedIn});
    }
  }catch(err){
    console.log(err);
  }
});

app.get("/about",(req,res)=>{
    res.render("about.ejs",{val:str})
});

app.get("/contact",(req,res)=>{
    res.render("contact.ejs",{val:str});
});

app.get("/read",async (req,res)=>{
  // res.render("read.ejs",{val:str});
  
  try{
    if(data.length ==0){
      const result = await db.query("select * from blog_posts order by post_id asc");
      let items = result.rows;
      res.render("read.ejs",{val:str,listitems:items,});
    }else{
      let items = data.rows;
      res.render("read.ejs",{val:str,listitems:items,});
    }
  }catch(err){
    console.log(err);
  }
  data = []
})

app.get("/login",(req,res)=>{
    // res.render("home.ejs");
    res.render("login-form.ejs",{val:str});
});

app.get("/blog",async(req,res)=>{
  const clickedHeading = req.query.title; // Get the clicked heading from the query parameters
    try {
        const result = await db.query("select * from blog_posts where title=$1", [clickedHeading]);
        if (result.rows.length > 0) {
            const item = result.rows[0];
            var isLoggedIn = false;
            if (item.user_name == str) {
                isLoggedIn = true;
            }
            res.render("blog.ejs", { val: str, title: item.title, content: item.content,id:item.post_id, isLoggedIn,});
            // res.render("blog.ejs", { val: str, title: item.title, content: item.content });
        } else {
            res.send("Blog post not found.");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching blog post.");
    }
});

function confirmDelete(event) {
  event.preventDefault(); 
  if (confirm("Are you sure you want to delete this blog post?")) {
      document.getElementById("delete").submit();
  }
}

app.post("/delete",async (req,res)=>{
  const id = req.body.deleteItemId;
  try{
    await db.query("delete from blog_posts where post_id=$1",[id,]);
    res.redirect("/");
  }catch(err){
    console.log(err);
  }
});

app.post("/edit", async(req, res) => {
  try {
    const postId = req.body.postId; // Retrieve post ID from form submission
    console.log(postId);
    const result = await db.query("SELECT * FROM blog_posts WHERE post_id = $1", [postId]); // Fetch corresponding blog post
    const item = result.rows[0];
    // console.log(item);
    // Render the update page with the retrieved blog post data
    res.render("update.ejs", { val: str, title: item.title, content: item.content, id: postId });
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit-form",async(req,res)=>{
  const title = req.body.updatedItemTitle;
  const id = req.body.updatedItemID;
  const content = req.body.updatedItemContent.replace(/\r?\n/g, '<br>');
  console.log(id);

  try {
    await db.query("UPDATE blog_posts SET title = $1, content=$2 WHERE post_id = $3", [title,content, id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }

});

app.post("/search",async(req,res)=>{
  const keyword = req.body.SHeading;
  try {
    data = await db.query("SELECT * FROM blog_posts WHERE content LIKE '%' || $1 || '%' ORDER BY post_id ASC", [keyword]);
    res.redirect("/read");
  } catch (err) {
    console.log(err);
  }
});

app.get("/register-form",(req,res)=>{
    res.render("register-form.ejs",{val:str});
});


app.get("/logout", (req, res) => {
    str = "Login";
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

app.get("/write", (req, res) => {
//   console.log(req.user.email);
    str = req.user ? req.user.username : "Login";
  if (req.isAuthenticated()) {
    res.render("create.ejs",{val:str});
  } else {
    res.redirect("/login");
  }
});

app.post("/submit",(req,res)=>{
    str = req.user ? req.user.username : "Login";
  if (req.isAuthenticated()) {
    res.render("create.ejs",{val:str});
  } else {
    res.redirect("/login");
  }
});

app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
}));

app.get(
    "/auth/google/secrets",
    passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}));

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/write",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const name = req.body.name;
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM blogusers WHERE email = $1", [
      email,
    ]);
    // console.log(checkResult);
    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltround, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO blogusers (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [name, email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/login");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

passport.use("local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM blogusers WHERE email = $1 ", [username,]);
      // console.log(result);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check

              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          console.log(profile);
          const result = await db.query("SELECT * FROM blogusers WHERE email = $1", [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO blogusers (username, email, password) VALUES ($1, $2)",
              [profile.email, "google"]
            );
            return cb(null, newUser.rows[0]);
          } else {
            return cb(null, result.rows[0]);
          }
        } catch (err) {
          return cb(err);
        }
      }
    )
  );

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.post("/create-submit",async (req,res)=>{
    const hdr = req.body["ttl"];
    const cnt = req.body["ctnt"].replace(/\r?\n/g, '<br>');
    // console.log(str);
    await db.query("insert into blog_posts (user_name,title,content) values ($1, $2, $3) ",[str, hdr, cnt]);
    res.redirect("/");
});

app.post("/contact-submit",(req,res)=>{
    const name=req.body.username;
    res.render("sender.ejs",{val:str,name:name});
});

app.listen(port,(req,res)=>{
    console.log(`Server is running on ${port}`);
});
