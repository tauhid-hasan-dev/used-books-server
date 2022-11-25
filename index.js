const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();


const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jjvuikj.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const usersCollection = client.db("usedBooks").collection("users");
        const categoryCollection = client.db("usedBooks").collection("categories");
        const booksCollection = client.db("usedBooks").collection("books");

        console.log('databse connected.....');


        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })

        app.post('/allbooks', async (req, res) => {
            const doc = req.body;
            console.log(doc);
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


        app.get('/books/:categoryId', async (req, res) => {
            const id = req.params.categoryId;
            console.log(id)
            const query = {
                categoryId: id,
            };
            const books = await booksCollection.find(query).toArray();
            res.send(books);
        })

        //all books by email(seller)
        app.get('/books', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email
            }
            const books = await booksCollection.find(query).toArray();
            res.send(books);
        })

        //all seller all buyers
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            console.log(role)
            const query = {
                userRole: role,
            }
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
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