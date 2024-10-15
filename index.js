const express = require("express");
const app = express();
cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
//const { ObjectId } = require("mongodb");
//middleware

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.myz2n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.myz2n.mongodb.net/myFirstDatabase?tls=true&retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("bistoDb").collection("users");
    const menuCollection = client.db("bistoDb").collection("menu");
    const reviewsCollection = client.db("bistoDb").collection("reviews");
    const cartCollection = client.db("bistoDb").collection("carts");
    // console.log(menuCollection);

    //jwt related Api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //middleware

    const VerifyToken = (req, res, next) => {
      console.log(req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forebidden access" });
        }
        req.decoded = decoded;
        next();
      });
      // next();
    };

    //use verify admin after verify Token

    const VerifyAdmin = async (req, res, next) => {
      // Add next as a parameter
      try {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === "admin";
        if (!isAdmin) {
          return res.status(403).send({ message: "forbidden access" });
        }
        next(); // Call next if user is admin
      } catch (error) {
        res.status(500).send({ message: "Internal server error" });
      }
    };

    //users related api

    app.get("/user/admin/:email", VerifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);

      let admin = false; // Initialize admin to false
      if (user) {
        admin = user.role === "admin";
      }

      res.send({ admin });
    });

    app.get("/users", VerifyToken, VerifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      VerifyToken,
      VerifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc); // Make sure the 'filter' is used
        res.send(result);
      }
    );

    app.delete("/users/:id", VerifyToken, VerifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //menu api

    app.post("/menu", VerifyToken, VerifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await menuCollection.findOne(query);
      res.send(result);
      console.log(result);
    });

    // app.delete("/menu/:id", VerifyToken, VerifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   try {
    //     const query = { _id: new ObjectId(id) }; // Ensure it's an ObjectId
    //     const result = await menuCollection.deleteOne(query);
    //     res.send(result);
    //     console.log(result);
    //   } catch (error) {
    //     console.error("Error deleting item:", error);
    //     res.status(500).send({ message: "Internal Server Error" });
    //   }
    // });

    // app.delete("/carts/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await cartCollection.deleteOne(query);
    //   res.send(result);
    // });

    app.delete("/menu/:id", VerifyToken, VerifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
      console.log(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    //carts collections

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss is here");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
