const uuid = require('uuid').v4
const HttpError = require('../models/http-error');
const { validationResult } = require('express-validator');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const mongoose = require('mongoose');
const fs = require('fs');

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    
    let place;

    try {
         place = await Place.findById(placeId); 
    } catch (err) {
        const error = new HttpError(
            'Could not find Place.', 500
        );
        return next(error);
    }

    if(!place){
        const error = new HttpError('Could Not Place for Provided ID',404);
        return next(error);
    }

    res.json({place: place.toObject( { getters: true } ) });
}

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    console.log(userId)
    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        const error = new HttpError(
            'Could not find Place using UserID.', 500
        );
        return next(err);
    }
    
    console.log(places)
    if(!places || places.length === 0){ 
        return next(
            new HttpError('Could Not Find Places for Provided User ID',404)
        );
    }

    res.json({ places: places.map(place => place.toObject({ getters: true })) });
}

const createPlace = async (req, res, next) => {
    const error = validationResult(req);

    if(!error.isEmpty()){
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    const { title, description, address } = req.body;

    const coordinates = getCoordsForAddress();
    
    const createPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;

    try {
        user = await User.findById(req.userData.userId);
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again',
            500
       ); 
       return next(error);
    }

    if(!user){
        const error = new HttpError('Could not find User for Provided Id', 404); 
        return next(error);
    }

    console.log(user);

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createPlace.save({ session: sess });
        user.places.push(createPlace);
        await user.save({ session: sess })
        await sess.commitTransaction();

    }catch(err){
        const error = new HttpError(
             'Creating place failed, please try again',
             500
        ); 
        return next(error);
    }

    
    res.status(201).json({place: createPlace})
};

const updatePlace = async (req, res, next) => {
    const error = validationResult(req);

    if(!error.isEmpty()){
        return next(
            new HttpError('Invalid inputs passed, please check your data', 422)
        );
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;

    try {
         place = await Place.findById(placeId); 
    } catch (err) {
        const error = new HttpError(
            'Could not find Place.', 500
        );
        return next(error);
    }

    if(place.creator.toString() !== req.userData.userId){
        const error = new HttpError(
            'You are not allowed to edit this place', 401
        );
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError(
            'Something went Wrong, Could not Update Place.', 500
        );
        return next(error);
    }

    res.status(201).json({ place: place.toObject({ getters: true }) })

}

const deletePlace = async(req, res, next) => {
    const placeId = req.params.pid;

    let place;

    try {
         place = await Place.findById(placeId).populate('creator'); 
    } catch (err) {
        const error = new HttpError(
            'Could not delete Place.', 500
        );

        return next(error);
    }

    if(!place){
        const error = new HttpError('Could Not Find Place for this ID', 404);
        return next(error);
    }

    if(place.creator.id !== req.userData.userId){
        const error = new HttpError(
            'You are not allowed to delete this place', 401
        );
        return next(error);
    }

    const imagePath = place.image;
    
    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Could not delete Place.', 500
        );
        return next(error);
    }

    fs.unlink(imagePath, err => {
        console.log(err);
    });

    
    res.status(200).json({ message: 'Deleted Place'});
}


exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;