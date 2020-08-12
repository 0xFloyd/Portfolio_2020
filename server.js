const express = require("express");
const path = require("path");
const port = process.env.PORT || 8080;
const app = express();

app.use(function (req, res, next) {
  if (req.header("x-forwarded-proto") !== "https") {
    res.redirect("https://" + req.header("host") + req.baseUrl);
  } else {
    next();
  }
});

// the __dirname is the current directory from where the script is running
app.use(express.static(__dirname));

// send the user to index html page inspite of the url
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.listen(port);
