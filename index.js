const express = require ("express");
const cors = require ("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require ('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY)
const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://quizlytics.vercel.app",
  ],
}));
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `${process.env.URI}`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const database = client.db("quizlyticsDb");
    const userHistoryCollection = database.collection("quizHistory");
    const manualQuizCollection = database.collection("manualQuiz");
    const feedbackCollection = database.collection("feedback")

    app.post("/saveHistory", async(req, res)=>{
        const userHistory = req.body;
        const result = await userHistoryCollection.insertOne(userHistory);
        res.send(result)
    })

    app.get("/userHistory", async(req, res)=>{
      const user = req.query?.email;
      const result = await userHistoryCollection.find()
    })

    // Musa vai api
    app.post("/saveManualQuiz", async(req, res)=>{
      const quizSet = req.body;
      console.log(quizSet);
      const result = await manualQuizCollection.insertOne(quizSet);
      res.send(result);
    })

    app.get("/allCustomQuiz", async(req, res)=>{
      const result = await manualQuizCollection.find().toArray();
      res.send(result)
    })

    app.get("/getCustomQuizByKey", async(req, res)=>{
      const key = req.query.qKey;
      const query = {
        quizStartKey: key
      }
      // console.log(query);
      const result = await manualQuizCollection.find(query).toArray();
      res.send(result)
    })

    app.delete("/deleteCustomQuiz", async(req, res)=>{
      const key = req.query.qKey;
      const query = {
        quizStartKey: key
      }
      const result = await manualQuizCollection.deleteOne(query);
      res.send(result)
    })

    app.post("/feedback", async(req, res)=>{
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result)
    })

    app.get("/all-feedback", async(req, res)=>{
      const allFeedback = await feedbackCollection.find().toArray();
      res.send(allFeedback)
    })



    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/quiz", async(req, res)=>{
    const category = req.query?.category;
    const skill = req.query?.skill
    const model = genAI.getGenerativeModel({model: "gemini-pro"});

    const prompt = `generate a json containing 10 multiple choice question on ${category} and the questions must be declared as "question". Prepare the questions assuming the examinee as a ${skill} learner. The question must have four answer options declared as "options". The question can be fill-up the blanks, find the true statement or other. The answer options must be in a different array inside the question object. The correct answer's index-number will also be provided in a different variable as a string which will also kept inside the question object and will be declared as "correct_answer". Each of the questions must be unique and must have an unique id which will be an index number as a string declared as "id". Provide the json only, avoid any extra information while providing the result. result must be a json array. avoid the heading in reply.`;

    
    const result = await model.generateContent(prompt);


    const response = await result.response;

    const text = await response.text();
    
    const cleanedText = text.replace(/\\\"/g, '"')          // Removes escaped quotes
    .replace(/```json/g, '')                                // Removes '```json' code block markers
    .replace(/```/g, '')                                    // Removes any other triple backticks
    .replace(/`/g, '')                                      // Removes single backticks
    .trim();
    const jsonResult = JSON.parse(cleanedText);
    res.json(jsonResult); 
})


app.get("/", (req, res)=>{
    res.send("Updated Quiz server is running")
})

app.listen(port, ()=>{
    console.log(`Listening to the port: ${port}`)
})