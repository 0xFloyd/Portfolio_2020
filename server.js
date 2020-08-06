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

/*
could be req.headers.host instead of req.hostname or req.url
or req.get('hostname') or 'Host'

For anyone using a newer version of Express (4.x) you will need to update the redirect to use baseUrl instead of url. The line 
should read: return res.redirect(['https://', req.get('Host'), req.baseUrl].join('')); – n-devr Sep 27 '18 at 18:22
*/

// the __dirname is the current directory from where the script is running
app.use(express.static(__dirname));

// send the user to index html page inspite of the url
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.listen(port);
