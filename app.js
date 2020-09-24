const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');
const fs = require('fs');


const app = express();

app.use(bodyParser.json());

var accesPath = path.join(__dirname, './uploads/images')
app.use('/uploads/images', express.static(accesPath));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

app.use('/api/places',placesRoutes);
app.use('/api/users', usersRoutes); 

app.use((req, res, next) => {
   const error = new HttpError('Could not found any route', 404);
   throw error;
});

app.use((error, req, res, next) => {
    if(req.file){
        fs.unlink(req.file.path, err => {
            console.log(err);
        });
    }
    if(res.headerSent){
        return next(error);
    }
    res.status(error.code || 500)
    res.json({message: error.message || 'An Unknown error occured!'});
});

mongoose.
    connect(
        `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.mg9gh.mongodb.net:27017,cluster0-shard-00-01.mg9gh.mongodb.net:27017,cluster0-shard-00-02.mg9gh.mongodb.net:27017/${process.env.DB_NAME}?ssl=true&replicaSet=atlas-ib4kzq-shard-0&authSource=admin&retryWrites=true&w=majority`
    )
    .then(() => {
        app.listen(5000);
    })
    .catch((error) =>{
        console.log(error);
    })

