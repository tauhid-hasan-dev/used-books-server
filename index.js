const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET);


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
        const paymentCollection = client.db("usedBooks").collection("payments");
        const addCollection = client.db("usedBooks").collection("adds");

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


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query)
            res.send(booking);
        })

        //checking if user has the role called "admin"
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            //console.log(email);
            const query = { email }
            const user = await usersCollection.findOne(query);
            console.log(user)
            res.send({ isAdmin: user?.userRole === 'admin' });
        })


        //checking if user has the role called "seller"
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            //console.log(email);
            const query = { email }
            const user = await usersCollection.findOne(query);
            console.log(user)
            res.send({ isSeller: user?.userRole === 'seller' });
        })

        //checking if user has the role called "seller"
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            //console.log(email);
            const query = { email }
            const user = await usersCollection.findOne(query);
            console.log(user)
            res.send({ isBuyer: user?.userRole === 'buyer' });
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
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
                return res.send({ accessToken: token });
            }

        })

        //categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })


        //listed books by seller
        app.post('/allbooks', async (req, res) => {
            const doc = req.body;
            //console.log(doc);
            const book = await booksCollection.insertOne(doc);
            res.send(book);
        })


        //getting books by category
        app.get('/books/:categoryId', async (req, res) => {
            const id = req.params.categoryId;
            //console.log(id)
            const query = {
                categoryId: id,
            };
            const books = await booksCollection.find(query).toArray();
            const availableBooks = books.filter(book => !book?.paid)
            res.send(availableBooks);
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


        app.delete('/books/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })

        //all seller and all buyers by role 
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = {
                userRole: role,
            }
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
        })


        app.get('/seller', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            res.send(user)
        })

        //storing booking info and preventing multiple bookings
        app.post('/bookings', async (req, res) => {
            const doc = req.body;
            const query = {
                buyerEmail: doc.buyerEmail,
                sellerPostId: doc.sellerPostId
            }
            const isExits = await bookingCollection.findOne(query);
            if (isExits) {
                return res.send({ message: 'This user already exists' })
            } else {
                const bookedItem = await bookingCollection.insertOne(doc);
                res.send(bookedItem);
            }

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

        //seller verification bu admin
        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    verified: 'Verified'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        //report to admin

        app.put('/reported/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    reported: 'Reported'
                },
            };
            const result = await booksCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        app.get('/reporteditems', async (req, res) => {
            const query = {}
            const books = await booksCollection.find(query).toArray();
            const reportedItems = books.filter(book => book.reported);
            res.send(reportedItems)
        })



        //seller and buyer delete
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //stripe payment method api
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.productPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        //updating data after payment
        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const result = await paymentCollection.insertOne(payment);

            const postid = payment.sellerPostId;
            const filter = { _id: ObjectId(postid) }
            const updatedDocBook = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateSellerBook = await booksCollection.updateOne(filter, updatedDocBook);

            const id = payment.bookingId;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateBooking = await bookingCollection.updateOne(query, updatedDoc);

            res.send(result);
        })



        //posting adds to the homepage by seller
        app.post('/adds', async (req, res) => {
            const add = req.body;

            const id = add.sellerPostId;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    advertised: 'advertised'
                }
            }
            const advertisedBook = await booksCollection.updateOne(query, updatedDoc)

            const filter = {
                sellerPostId: add.sellerPostId
            }

            const isExits = await addCollection.findOne(filter)
            if (isExits) {
                return res.send({ message: 'This book has already been advertised' })
            } else {
                const adds = await addCollection.insertOne(add)
                res.send(adds)
            }

        });

        //getting adds into the home page after getting advertised

        app.get('/adds', async (req, res) => {
            const query = {};
            const adds = await addCollection.find(query).toArray();
            const querybooks = {};
            const books = await booksCollection.find(querybooks).toArray();
            const advertisedBooks = books.filter(book => book?.advertised && !book?.paid)
            res.send(advertisedBooks);
        })



    } finally {


    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server running for Used Book Store Project.......');
})

app.listen(port, () => {
    console.log(`Server running for Used Book Store Project on port ${port}`);
})