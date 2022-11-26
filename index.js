const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();
var jwt = require('jsonwebtoken');


const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send("Unauthorized Access")
    }
    const token = authHeader.split(' ')[1];
    //console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send('Forbidden Access')
        }
        req.decoded = decoded;
        next();
    })

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jjvuikj.mongodb.net/?retryWrites=true&w=majority`;
//console.log(uri)

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const usersCollection = client.db("usedBooks").collection("users");
        const categoryCollection = client.db("usedBooks").collection("categories");
        const booksCollection = client.db("usedBooks").collection("books");
        const bookingCollection = client.db("usedBooks").collection("bookings");

        //getting bookings(my orders)
        app.get('/bookings', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send('Forbidden Access')
            }
            console.log(email);
            const query = {
                buyerEmail: email
            }
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
        })


        //api for sending jwt token to the client
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            //console.log(email)
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                //for login if user already in users collection
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
                return res.send({ accessToken: token });
            } else {
                //for sign up only if user is new entry to the site
                return res.send({ accessToken: token });
            }

        })


        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })

        app.post('/allbooks', async (req, res) => {
            const doc = req.body;
            //console.log(doc);
            const book = await booksCollection.insertOne(doc);
            res.send(book);
        })

        //storing user info to the database and preventing google users data duplicating
        app.post('/users', async (req, res) => {
            const doc = req.body;
            const query = {
                email: doc.email
            }
            const isExits = await usersCollection.findOne(query)
            if (isExits) {
                return res.send({ message: 'This user already exists' })
            } else {
                const user = await usersCollection.insertOne(doc);
                res.send(user);
            }
        })

        //getting books by category
        app.get('/books/:categoryId', async (req, res) => {

            const id = req.params.categoryId;
            //console.log(id)
            const query = {
                categoryId: id,
            };
            const books = await booksCollection.find(query).toArray();
            res.send(books);
        })

        //all books by email(posted books of the seller)
        app.get('/books', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email
            }
            const books = await booksCollection.find(query).toArray();
            res.send(books);
        })

        //all seller and all buyers by role 
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            //console.log(role)
            const query = {
                userRole: role,
            }
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
        })

        //storing booking info
        app.post('/bookings', async (req, res) => {
            const doc = req.body;
            const bookedItem = await bookingCollection.insertOne(doc);
            res.send(bookedItem);
        })






    } finally {


    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server running for Used Book Store Project');
})

app.listen(port, () => {
    console.log(`Server running for Used Book Store Project on port ${port}`);
})