// dependencies

var crypto = require("crypto");
var uuid = require("uuid");
var bodyParser = require("body-parser");
var mysql = require("mysql");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
require("events").EventEmitter.prototype._maxListeners = 100;
const express = require("express");
const webpush = require("web-push");
const path = require("path");
const passport = require("passport");
var multer = require("multer");
var storage;
var fs = require("fs");
var form =
  "<!DOCTYPE HTML><html><body>" +
  "<form method='post' action='/upload' enctype='multipart/form-data'>" +
  "<input type='file' name='upload'/>" +
  "<input type='submit' /></form>" +
  "</body></html>";

//connect MYSQL

var connexion = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "intellectus",
  multipleStatements: true
});
/*
var connexion = mysql.createConnection({
  host: "41.226.11.252",
  port: 3306,
  user: "resauacademique",
  password: "resauacademique",
  database: "resauacademique"
});*/

//Password Encryption
var genRandomString = function(length) {
  return crypto
    .randomBytes(Math.ceil(length / 12))
    .toString("hex") /* Converts to hexadecimal format */
    .slice(0, length); /* Returns required number of characteres */
};

var sha512 = function(password, salt) {
  var hash = crypto.createHmac("sha512", salt); /* use sha512 */
  hash.update(password);
  var value = hash.digest("hex");
  return {
    salt: salt,
    passwordHash: value
  };
};

function saltHashPassword(userPassword) {
  var salt = genRandomString(16); //generate random string with 16 character to salt
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

function checkHashPassword(userPassword, salt) {
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

app.use(bodyParser.json({ limit: "50mb" })); // Accept JSON params
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" })); // Accept URL encoded PARAMS

////////////////////image uploader////////////////////////

app.get("/uploader", function(req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(form);
});

storage = multer.diskStorage({
  destination: "./uploads/",
  filename: function(req, file, cb) {
    return crypto.pseudoRandomBytes(16, function(err, raw) {
      if (err) {
        return cb(err);
      }
      return cb(
        null,
        "" + raw.toString("hex") + path.extname(file.originalname)
      );
    });
  }
});

// Post files
app.post(
  "/upload",
  multer({
    storage: storage
  }).single("upload"),
  function(req, res) {
    //console.log(req.file);
    //console.log(req.body);
    //res.redirect("/uploads/" + req.file.filename);
    console.log(req.file.filename);
    let uploadedImage = req.file.filename;
    //return res.status(200).end();
    return res.send(uploadedImage).end();
  }
);

app.get("/uploads/:upload", function(req, res) {
  file = req.params.upload;
  console.log(req.params.upload);
  var img = fs.readFileSync(__dirname + "/uploads/" + file);
  res.writeHead(200, { "Content-Type": "image/png" });
  res.end(img, "binary");
});

/*
app.post('/upload', function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv('./uploads/'+dateFormat(Date.now(), "yyyy-mm-dd-h.MM.ss") +'.jpg', function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
  });
});*/

////////////////////////image uploader////////////////////////////

////string to date converter //////

function stringToDate(_date, _format, _delimiter) {
  var formatLowerCase = _format.toLowerCase();
  var formatItems = formatLowerCase.split(_delimiter);
  var dateItems = _date.split(_delimiter);
  var monthIndex = formatItems.indexOf("mm");
  var dayIndex = formatItems.indexOf("dd");
  var yearIndex = formatItems.indexOf("yyyy");
  var month = parseInt(dateItems[monthIndex]);
  month -= 1;
  var formatedDate = new Date(dateItems[yearIndex], month, dateItems[dayIndex]);
  return formatedDate;
}

////////////////////////////////

// Insert
app.post("/insert/", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var uid = uuid.v4(); // get uuid v4
  var plain_password = post_data.password; // get password from post paprams
  var hash_data = saltHashPassword(plain_password);
  var password = hash_data.passwordHash;
  var salt = hash_data.salt; // get salt

  var name = post_data.name;
  var last_name = post_data.name;
  var email = post_data.email;
  var role = post_data.role;
  var isParent = post_data.isParent;
  var image = post_data.image;
  var dateNaissance = stringToDate(post_data.dateNaissance, "dd-mm-yyyy", "-");
  var classe = post_data.classe;

  connexion.query("SELECT * FROM user where email=?", [email], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      res.json("User already Exists !");
    } else {
      connexion.query(
        "INSERT INTO `user`(`unique_id`, `name`, `last_name`, `email`, `dataNaissance` ,`role`,`is_parent`,`image_url`,`encrypted_password`, `salt`, `created_at`, `updated_at`) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",
        [
          uid,
          name,
          last_name,
          email,
          dateNaissance,
          role,
          isParent,
          image,
          password,
          salt
        ],
        function(err, result, fields) {
          connexion.on("error", function(err) {
            console.log("[MySQL ERROR]", err);
            res.json("Registration Error", err);
          });
          res.json("Registration Successful");
        }
      );
    }
  });
});

// Insert without date naissance
app.post("/insert/manager", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var uid = uuid.v4(); // get uuid v4
  var plain_password = post_data.email; // get password from post paprams
  var hash_data = saltHashPassword(plain_password);
  var password = hash_data.passwordHash;
  var salt = hash_data.salt; // get salt

  var name = post_data.name;
  var last_name = post_data.last_name;
  var email = post_data.email;
  var role = post_data.role;
  var isParent = post_data.isParent;
  var image = post_data.image;

  let myid;

  connexion.query("SELECT * FROM user where email=?", [email], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      res.json("User already Exists !");
    } else {
      connexion.query(
        "INSERT INTO `user`(`unique_id`, `name`, `last_name`, `email`, `role`,`is_parent`,`image_url`,`encrypted_password`, `salt`, `created_at`, `updated_at`) " +
          "VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())",
        [uid, name, last_name, email, role, isParent, image, password, salt],
        function(err, result, fields) {
          connexion.on("error", function(err) {
            console.log("[MySQL ERROR]", err);
            res.json("Registration Error", err);
          });
        }
      );
      res.json("Registration Successful");
    }
  });
});

app.post("/getUserByEmail/", (req, res, next) => {
  var post_data = req.body;

  //Extract Email and password from data
  var user_password = post_data.password;
  var email = post_data.email;

  connexion.query("SELECT * FROM user where email=?", [email], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      res.end(JSON.stringify(result[0]));
    } else {
      console.log(err);
      res.json("User with this email does not Exist !");
    }
  });
});

app.post("/getIdByEmail/", (req, res, next) => {
  var post_data = req.body;

  console.log(req.body);

  //Extract id from data
  var email = post_data.email;

  connexion.query("SELECT id FROM user where email=?", [email], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      console.log(result[0]);
      res.end(JSON.stringify({ x: result[0] }));
    } else {
      console.log(err);
      res.json("User with this email does not Exist !");
    }
  });
});

app.post("/getIdByClass/", (req, res, next) => {
  var post_data = req.body;

  console.log(req.body);
  //Extract class
  var email = post_data.classe;

  connexion.query(
    "SELECT class_Id FROM class where class_name=?",
    [email],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        console.log(result[0]);
        res.end(JSON.stringify({ x: result[0] }));
      } else {
        console.log(err);
        res.json("User with this email does not Exist !");
      }
    }
  );
});

app.post("/affect/", (req, res, next) => {
  var post_data = req.body;
  console.log(req.body);
  //Extract Email and password from data
  var user_id = post_data.id;
  var class_id = post_data.classid;

  connexion.query(
    "INSERT INTO `class_affectation`(`user_id`, `class_id`) " + "VALUES (?,?)",
    [user_id, class_id],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
        res.json("Registration Error", err);
      });
      res.json("Affectation Successful");
    }
  );
});

//get all users
app.get("/users/", (req, res, next) => {
  connexion.query(
    "SELECT * FROM user where role = 'Student' GROUP BY id",
    function(err, rows, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (!err) {
        res.send(JSON.stringify({ user: rows }));
      } else {
        res.json("No user found !");
      }
    }
  );
});

//get user by id
app.get("/getUserInfo/:id", (req, res, next) => {
  console.log("Enter getUser");
  var strQuery = "SELECT * FROM `user` WHERE id = " + req.params.id;

  connexion.query(strQuery, function(err, result, field) {
    connexion.on("error", function(err) {
      console.log("MySQL Error", err);
      res.json("UserController Error", err);
    });
    console.log(result);
    res.send(result[0]);
  });
});

app.get("/getSchoolInfo/:id", (req, res, next) => {
  console.log("Enter geSchool");
  var strQuery = "SELECT * FROM `school` WHERE school_id = " + req.params.id;

  connexion.query(strQuery, function(err, result, field) {
    connexion.on("error", function(err) {
      console.log("MySQL Error", err);
      res.json("UserController Error", err);
    });
    console.log(result);
    res.send(result[0]);
  });
});

//get all users with class name
app.get("/students/", (req, res, next) => {
  connexion.query(
    "SELECT u.*,c.class_name as classname FROM user u,class c,class_affectation e where u.role = 'Student' AND u.id = e.user_id GROUP BY id",
    function(err, rows, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (!err) {
        res.send(rows);
      } else {
        res.json("No user found !");
      }
    }
  );
});

//update user
app.put("/update/user", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var userId = post_data.id;
  var email = post_data.email;
  var image = post_data.image;

  connexion.query(
    "Update `user`set `image_url`=?,`updated_at`=NOW() WHERE `id`=? ",
    [image, userId],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
        res.json("Registration Error", err);
      });
      console.log(image, userId);
      res.json("Update Successful");
    }
  );
});

//Delete a user
app.delete("/user/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM user WHERE id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//Get a user
app.get("/user/:id", (req, res) => {
  connexion.query(
    "SELECT * FROM user WHERE id = ?",
    [req.params.id],
    (err, rows, fields) => {
      var newObj = {};
      rows.forEach(function(elem, index) {
        newObj[index] = elem;
      });
      if (!err) res.json(newObj);
      else console.log(err);
    }
  );
});

////////////////////////Teacher//////////////////////////

//get all teachers
app.get("/teachers/", (req, res, next) => {
  connexion.query(
    "SELECT u.*,c.school_name as schoolname FROM user u,school c,affectation_school e where u.role = 'Teacher' AND u.id = e.user_id and e.school_id = c.school_id GROUP BY u.id",
    function(err, rows, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (!err) {
        res.send(rows);
      } else {
        res.json("No user found !");
      }
    }
  );
});

//get all Managers
app.get("/managers/", (req, res, next) => {
  connexion.query(
    "SELECT u.*,c.school_name as schoolname FROM user u,school c,affectation_school e where u.role = 'Manager' AND u.id = e.user_id and e.school_id = c.school_id GROUP BY u.id",
    function(err, rows, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (!err) {
        res.send(rows);
      } else {
        res.json("No user found !");
      }
    }
  );
});

/////////////////////////////////////////////////////////

// Login

app.post("/login/", (req, res, next) => {
  var post_data = req.body;

  //Extract Email and password from data
  var user_password = post_data.password;
  var email = post_data.email;

  connexion.query("SELECT * FROM user where email=?", [email], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      var salt = result[0].salt; //get salt of result if account exists
      var encrypted_password = result[0].encrypted_password;
      //hash password from Login request with Salt in database
      var hashed_password = checkHashPassword(user_password, salt).passwordHash;

      if (encrypted_password == hashed_password)
        res.end(JSON.stringify(result[0]));
      //if password is true return all info of user
      else res.end(JSON.stringify("Wrong Password"));
    } else {
      //res.json("User does not Exist !");
      res.json(err);
    }
  });
});

// CRUD entities seperated by each entity

// CRUD entities seperated by each entity

// CRUD entities seperated by each entity

// CRUD entities seperated by each entity

//CRUD homework
//Insert homework
app.post("/homework/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var usermail = post_data.usermail;
  var title = post_data.title;
  var content = post_data.content;
  var link = post_data.link;

  connexion.query(
    "SELECT * FROM homework where homework_title=?",
    [title],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        res.json("homework already Exists !");
      } else {
        connexion.query(
          "INSERT INTO `homework` (`user_mail`,`homework_title`, `homework_content` , `homework_link`) VALUES (?,?,?,?)",
          [usermail, title, content, link],
          function(err, result, fields) {
            connexion.on("error", function(err) {
              console.log("[MySQL ERROR]", err);
              res.json("Insertion Error", err);
            });
            res.json("Insertion Successful");
          }
        );
      }
    }
  );
});

//get all homework
app.get("/homeworks/", (req, res, next) => {
  connexion.query("SELECT * FROM homework", function(err, rows, fields) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No homeworks found !");
    }
  });
});

//Get a homework
app.get("/homework/:id", (req, res) => {
  connexion.query(
    "SELECT * FROM homework WHERE homework_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//Delete a homework
app.delete("/homework/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM homework WHERE homework_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//Update a homework
app.put("/homework/update", (req, res) => {
  let Homework = req.body;
  var sql =
    "SET @homework_id = ?;SET @homework_title = ?;SET @homework_content = ?;SET @homework_link = ?; \
    CALL EmployeeAddOrEdit(@homework_id,@homework_title,@homework_content,@homework_link);";
  mysqlConnection.query(
    sql,
    [
      Homework.homework_id,
      Homework.homework_title,
      Homework.homework_content,
      Homework.homework_link
    ],
    (err, rows, fields) => {
      if (!err) res.send("Updated successfully");
      else console.log(err);
    }
  );
});

////////////////////////
app.post("/teacherclass/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var usermail = post_data.usermail;
  var classname = post_data.classname;

  connexion.query(
    "SELECT * FROM class_affectation where user_mail=? and class_name=?",
    [usermail, classname],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        res.json("already Exists !");
      } else {
        connexion.query(
          "INSERT INTO `class_affectation` (`user_mail`, `class_name`) VALUES (?,?)",
          [usermail, classname],
          function(err, result, fields) {
            connexion.on("error", function(err) {
              console.log("[MySQL ERROR]", err);
              res.json("Insertion Error", err);
            });
            res.json("Insertion Successful");
          }
        );
      }
    }
  );
});
////////////////////////
app.post("/eleveclass/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var usermail = post_data.usermail;
  var classname = post_data.classname;

  connexion.query(
    "SELECT * FROM class_affectation where usermail=?",
    [usermail],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        res.json("already Exists !");
      } else {
        connexion.query(
          "INSERT INTO `class_affectation` (`user_mail`, `class_name`) VALUES (?,?)",
          [usermail, classname],
          function(err, result, fields) {
            connexion.on("error", function(err) {
              console.log("[MySQL ERROR]", err);
              res.json("Insertion Error", err);
            });
            res.json("Insertion Successful");
          }
        );
      }
    }
  );
});

////////////////////////
app.post("/emploiTeacher/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var Id = post_data.Id;
  var link = post_data.link;

  connexion.query(
    "SELECT * FROM emploi_teacher_affectation where user_id=?",
    [Id],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        res.json("Emploi already Exists !");
      } else {
        connexion.query(
          "INSERT INTO `emploi_teacher_affectation` (`user_id`, `emploi_link`) VALUES (?,?)",
          [Id, link],
          function(err, result, fields) {
            connexion.on("error", function(err) {
              console.log("[MySQL ERROR]", err);
              res.json("Insertion Error", err);
            });
            res.json("Insertion Successful");
          }
        );
      }
    }
  );
});
//CRUD emploi
//Insert emploi
app.post("/emploi/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var name = post_data.name;
  var link = post_data.link;

  connexion.query(
    "SELECT * FROM emploi_class_affecation where class_name=?",
    [name],
    function(err, result, fields) {
      connexion.on("error", function(err) {
        console.log("[MySQL ERROR]", err);
      });
      if (result && result.length) {
        res.json("Emploi already Exists !");
      } else {
        connexion.query(
          "INSERT INTO `emploi_class_affecation` (`class_name`, `emploi_link`) VALUES (?,?)",
          [name, link],
          function(err, result, fields) {
            connexion.on("error", function(err) {
              console.log("[MySQL ERROR]", err);
              res.json("Insertion Error", err);
            });
            res.json("Insertion Successful");
          }
        );
      }
    }
  );
});

//get all emploi
app.get("/emplois/", (req, res, next) => {
  connexion.query("SELECT * FROM emploi", function(err, rows, fields) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No emplois found !");
    }
  });
});

//Get a emploi
app.get("/emploi/:id", (req, res) => {
  connexion.query(
    "SELECT * FROM emploi WHERE emploi_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//Delete a emploi
app.delete("/emploi/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM emploi WHERE emploi_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//Update a Emploi
app.put("/emploi/update", (req, res) => {
  let Emploi = req.body;
  var sql =
    "SET @emploi_id = ?;SET @emploi_class = ?;SET @emploi_link = ?; \
    CALL EmployeeAddOrEdit(@emploi_id,@emploi_class,@emploi_link);";
  mysqlConnection.query(
    sql,
    [Emploi.emploi_id, Emploi.emploi_class, Emploi.emploi_link],
    (err, rows, fields) => {
      if (!err) res.send("Updated successfully");
      else console.log(err);
    }
  );
});

//CRUD class
//Insert class
app.post("/class/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var name = post_data.name;
  var capacite = post_data.capacite;

  connexion.query("SELECT * FROM class where class_name=?", [name], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      res.json("Class already Exists !");
    } else {
      connexion.query(
        "INSERT INTO `class` (`class_name`, `class_capacite`) VALUES (?,?)",
        [name, capacite],
        function(err, result, fields) {
          connexion.on("error", function(err) {
            console.log("[MySQL ERROR]", err);
            res.json("Insertion Error", err);
          });
          res.json("Insertion Successful");
        }
      );
    }
  });
});

//get all class
app.get("/classes/", (req, res, next) => {
  connexion.query("SELECT * FROM class", function(err, rows, fields) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No classes found !");
    }
  });
});

//get all class
app.get("/eleves/", (req, res, next) => {
  connexion.query("SELECT * FROM user where role = 'Student'", function(
    err,
    rows,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No classes found !");
    }
  });
});

//Delete a class
app.delete("/eleve/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM user WHERE id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//get all class
app.get("/profs/", (req, res, next) => {
  connexion.query("SELECT * FROM user where role = 'Teacher'", function(
    err,
    rows,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No classes found !");
    }
  });
});

//Delete a class
app.delete("/prof/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM user WHERE id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//get all class
app.get("/admins/", (req, res, next) => {
  connexion.query("SELECT * FROM user where role = 'Admin'", function(
    err,
    rows,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json("No classes found !");
    }
  });
});

//Delete a class
app.delete("/admin/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM user WHERE id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});
//Get a class
app.get("/class/:id", (req, res) => {
  connexion.query(
    "SELECT * FROM class WHERE class_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//Delete a class
app.delete("/class/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM class WHERE class_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//Update a class
app.put("/class/update", (req, res) => {
  let Class = req.body;
  var sql =
    "SET @class_name = ?;SET @class_capacite = ?; \
    CALL EmployeeAddOrEdit(@class_id,@class_name,@class_capacite);";
  mysqlConnection.query(
    sql,
    [Class.class_id, Class.class_name, Class.class_capacite],
    (err, rows, fields) => {
      if (!err) res.send("Updated successfully");
      else console.log(err);
    }
  );
});

//CRUD schools

//insert a school
app.post("/schools/add", (req, res, next) => {
  var post_data = req.body; // Get POST PARAMS

  var name = post_data.name;
  var address = post_data.address;
  var state = post_data.state;
  var city = post_data.city;
  var postal_code = post_data.postal_code;
  var phone1 = post_data.phone1;
  var phone2 = post_data.phone2;
  var email = post_data.email;
  var fax = post_data.fax;
  var logo = post_data.logo;
  var fb = post_data.fb;
  var school_principal = post_data.school_principal;

  connexion.query("SELECT * FROM user where school_name=?", [name], function(
    err,
    result,
    fields
  ) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (result && result.length) {
      res.json("School already Exists !");
    } else {
      connexion.query(
        "INSERT INTO `school` (`school_name`, `school_address`, `school_state`, `school_city`, `school_postal_code`, `school_phone1`," +
          " `school_phone2`, `school_email`, `school_fax`, `school_logo`, `school_facebook`, `school_principal`) VALUES" +
          "(?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          name,
          address,
          state,
          city,
          postal_code,
          phone1,
          phone2,
          email,
          fax,
          logo,
          fb,
          school_principal
        ],
        function(err, result, fields) {
          connexion.on("error", function(err) {
            console.log("[MySQL ERROR]", err);
            res.json("Insertion Error", err);
          });
          res.json("Insertion Successfull");
        }
      );
    }
  });
});

//get all schools
app.get("/schools/", (req, res, next) => {
  connexion.query("SELECT * FROM school", function(err, rows, fields) {
    connexion.on("error", function(err) {
      console.log("[MySQL ERROR]", err);
    });
    if (!err) {
      res.send(rows);
    } else {
      res.json(err);
      //res.json("No schools found !");
    }
  });
});

//Get a school
app.get("/schools/:id", (req, res) => {
  connexion.query(
    "SELECT * FROM school WHERE school_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      var newObj = {};
      rows.forEach(function(elem, index) {
        newObj[index] = elem;
      });
      if (!err) res.json(newObj);
      else console.log(err);
    }
  );
});

//Delete a school
app.delete("/school/delete/:id", (req, res) => {
  connexion.query(
    "DELETE FROM school WHERE school_id = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Deleted successfully.");
      else console.log(err);
    }
  );
});

//Update a school
app.put("/school/update", (req, res) => {
  let school = req.body;
  var sql =
    "SET @school_id = ?;SET @school_name = ?;SET @school_address = ?;SET @school_state = ?;SET @school_city = ?;SET @school_postal_code = ?;SET @school_phone1 = ?;SET @school_phone2 = ?;SET @school_email = ?;SET @school_logo = ?;SET @school_facebook = ?;SET @school_principal = ?; \
    CALL EmployeeAddOrEdit(@school_id,@school_name,@school_address,@school_state,@school_city,@school_postal_code,@school_phone1,@school_phone2,@school_email,@school_logo,@school_facebook,@school_principal);";
  mysqlConnection.query(
    sql,
    [
      school.school_id,
      school.school_name,
      school.school_address,
      school.school_state,
      school.school_city,
      school.school_postal_code,
      school.school_phone1,
      school.school_phone2,
      school.school_email,
      school.school_fax,
      school.school_logo,
      school.school_facebook,
      school.school_principal
    ],
    (err, rows, fields) => {
      if (!err) res.send("Updated successfully");
      else console.log(err);
    }
  );
});

//CRUD schools

//chat

app.get("/chat", function(req, res) {
  res.sendFile(__dirname + "/webpage.html");
});

io.on("connection", socket => {
  console.log("user connected");

  socket.on("join", function(userNickname) {
    console.log(userNickname + " : has joined the chat ");

    socket.broadcast.emit(
      "userjoinedthechat",
      userNickname + " : has joined the chat "
    );
  });

  socket.on("messagedetection", (senderNickname, messageContent, avatar) => {
    //log the message in console

    console.log(senderNickname + " :" + messageContent + avatar);
    //create a message object

    let message = {
      message: messageContent,
      senderNickname: senderNickname,
      avatar: avatar
    };

    // send the message to the client side

    socket.emit("message", message);
  });

  socket.on("disconnect", function() {
    console.log("user has left ");
    socket.broadcast.emit("userdisconnect", " user has left");
  });
});

// Set static path
app.use(express.static(path.join(__dirname, "client")));
app.use(bodyParser.json());
const publicVapidKey =
  "BF849ZLJMmAHY5I2w2PdkSaiVrjV235Hkd7uy0dPnjkTH3zeFgCoNJgr47p49lFHXHCDqEMoIqHERQe7I8Crx1U";
const privateVapidKey = "ENzfD3QjSttyqB5x_gxy5xEOr5uqq7skbqAK-fkEaGc";

webpush.setVapidDetails(
  "mailto:test@test.com",
  publicVapidKey,
  privateVapidKey
);

// Subscribe Route
app.post("/subscribe", (req, res) => {
  //Get push Subscription object
  const subscription = req.body;

  // Send 201 - resource created
  res.status(201).json({});

  // Create payload
  const payload = JSON.stringify({ title: "Push Test" });

  // Pass object into sendNotification
  webpush
    .sendNotification(subscription, payload)
    .catch(err => console.error(err));
});

// Passport
app.post("/auth", passport.authenticate("local"), function(req, res) {
  // If this function gets called, authentication was successful.

  res.redirect("/admin/" + req.admin.username);
});

//Starting server
http.listen(3036, () => {
  console.log("Server running on port 3000");
});
