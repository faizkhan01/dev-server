const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://looking-for-talented-devoloper.web.app",
      "https://looking-for-talented-devoloper.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfkgk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//MIDDLEWARE FOR VERIFY
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // await client.connect();

    const developersBd = client.db("developersHouse").collection("developers");
    const wishlistBd = client.db("developersHouse").collection("wishlist");
    const commentBd = client.db("developersHouse").collection("comment");
    const subscribeBd = client.db("developersHouse").collection("subscribe");

    //API RELATED
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log(user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    //SERVICES RELATED API
    app.post("/developers", async (req, res) => {
      const card = req.body;
      const result = await developersBd.insertOne(card);
      res.send(result);
    });

    app.get("/developers", async (req, res) => {
      const cursor = developersBd.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/developers/:_id", async (req, res) => {
      const { _id } = req.params;

      try {
        const query = { _id: new ObjectId(_id) };

        const result = await developersBd.findOne(query);

        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "Developer not found" });
        }
      } catch (error) {
        console.error("Error fetching developer:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.patch("/developers/:_id", async (req, res) => {
      const { _id } = req.params;
      const filter = { _id: new ObjectId(_id) };
      const card = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title: card.title,
          image: card.image,
          bio: card.bio,

          description: card.description,
          category: card.category,
        },
      };

      const result = await developersBd.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // /////////////////developers close///////////////////////////////////////////////////////

    app.post("/comment", async (req, res) => {
      const card = req.body;

      try {
        const existingCard = await commentBd.findOne({
          email: card.email,
          title: card.title,
        });

        if (existingCard) {
          return res.status(400).json({
            message: "A comment with this email and title already exists",
          });
        }

        const result = await commentBd.insertOne(card);
        res.send(result);
      } catch (error) {
        console.error("Error inserting comment:", error);
        res.status(500).json({ message: "Error inserting comment" });
      }
    });

    app.get("/comment/:blogId", async (req, res) => {
      const blogId = req.params.blogId;

      const cursor = commentBd.find({ blogId });
      const result = await cursor.toArray();
      res.send(result);
    });

    //////////////////////////// comment close///////////////////////////////////////////////

    app.post("/wishlist", async (req, res) => {
      const card = req.body;

      try {
        const existingCard = await wishlistBd.findOne({
          title: card.title,
          email: card.email,
        });

        if (existingCard) {
          return res
            .status(400)
            .json({ message: "Wishlist item with this _id already exists" });
        }

        const result = await wishlistBd.insertOne(card);

        res.send(result);
      } catch (error) {
        console.error("Error inserting wishlist:", error);
        res.status(500).json({ message: "Error inserting wishlist" });
      }
    });

    app.get("/wishlist/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      try {
        const cursor = wishlistBd.find({ email: email });

        const result = await cursor.toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send({ error: "Failed to fetch wishlist" });
      }
    });

    // ////////////////////////wishlist close///////////////////////////////////////////

    app.post("/subscribe", async (req, res) => {
      const card = req.body;
      const result = await subscribeBd.insertOne(card);
      res.send(result);
    });
    // ///////////////////////delete from wishlist//////////////////////////////////

    app.delete("/wishlist/:_id", async (req, res) => {
      const { _id } = req.params;

      const query = { _id: _id };
      const result = await wishlistBd.deleteOne(query);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello developers");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
