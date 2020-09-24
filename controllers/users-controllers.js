const HttpError = require('../models/http-error');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getUsers = async (req, res, next) => {

    let users;
    try {
        users = await User.find({}, '-password');
    } catch (err) {
        const error = new HttpError(
            'Fetching User Failed, please try again',
            500
       ); 
       return next(error);
    }
    
    res.json({ users: users.map(user => user.toObject({ getters: true }))  });
};

const signup = async (req, res, next) => {
    const error = validationResult(req);

    if(!error.isEmpty()){
        return next(
            new HttpError('Invalid inputs passed, please check your data', 422)
        );
    }

    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email : email });
    } catch (err) {
        const error = new HttpError(
            'Sign up failed, please try again later',500
        )
    }

    if(existingUser){
        const error = new HttpError(
            'User exist already, please login in instead',422
        );
        return next(error);
    }
    
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Could not Create user, Please try again', 500);
        return next(error);
    }
    
    const createdUser =  new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places:[]
    })

    try{
        await createdUser.save();
    }catch(err){
        const error = new HttpError(
             'sign Up failed, please try again',
             500
        ); 
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email }, 
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError(
            'sign Up failed, please try again',
            500
       ); 
       return next(error); 
    }
  
    res.status(201).json({ userId : createdUser.id, email: createdUser.email, token: token });
};

const login = async(req, res, next) => {
    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email : email });
    } catch (err) {
        const error = new HttpError(
            'login in failed, please try again later',500
        )
    }

    if(!existingUser){
        const error = new HttpError(
            'Invalid credentails, could not login', 403
        );
        return next(error);
    }

    let isVaildPassword = false;
    try {
        isVaildPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError('Could Not log you in, Please provide correct Credentials', 500);
        return next(error);
    }
    
    if(!isVaildPassword){
        const error = new HttpError(
            'Invalid credentails, could not login', 403
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email }, 
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again',
            500
       ); 
       return next(error); 
    }
  
    res.json({ userId: existingUser.id, email: existingUser.email, token: token });
};


exports.getUsers =  getUsers;
exports.signup = signup;
exports.login = login;