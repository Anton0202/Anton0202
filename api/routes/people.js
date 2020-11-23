const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const people = require('../models/people');
const multer = require('multer');
const checkAuth = require('../middleware/check-auth');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'file/xlsx' || file.mimetype === 'file/txt') {
        cb(null, true);
    }else {
        cb(null, false);
    }
};

const upload = multer({storage: storage, limits: {
    fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

const People = require('../models/people');

router.get("/", (req, res, next) => {
    People.find().select('_id idnum name surname personImage').exec().then(docs => {
        const response = {
            count: docs.length,
            people: docs.map(doc => {
                return {
                    idnum: doc.idnum,
                    name: doc.name,
                    surname: doc.surname,
                    personImage: doc.personImage,
                    _id: doc._id,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3000/people/' + doc._id
                    }
                }
            })
        }
        if (docs.length >= 0) {
            res.status(200).json(response);
        }else {
            res.status(404).json({
                message: 'No entries found'
            });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

router.post("/", checkAuth, upload.single('personImage'), (req, res, next) => {
    var line = req.body.list;

    var regexMail = /\S+@\S+\.\S+/;
    var emailMatch = regexMail.exec(line);

    if (emailMatch == null) {

    } else {
        var emailValid = validateEmail(emailMatch[0]);

        if (emailValid == true) {
            Email = emailMatch[0];

        } else {
            res.status(200).json({

            });
        }
    }


    var IdNum = luhnCheck(line);
    if (IdNum == true) {
        Id = line;
        console.log("ID: " + line);
    } else {
        console.log("Not an ID");
    }

    var numberP = validatePhone(line);

    if (numberP == true) {
        Phone = line;
    }

    res.status(200).json({
        message: 'Validated Fields',
        Email: Email,
        IDNumber: Id,
        Phone: Phone
    })

    const people = new People({
        _id: new mongoose.Types.ObjectId(),
        idnum: req.body.idnum,
        name: req.body.name,
        surname: req.body.surname,
        personImage: req.file.path
    });
    people.save().then(result => {
        console.log(result);
        res.status(201).json({
            message: 'Created person successfully',
            createdPerson: {
                idnum: result.idnum,
                name: result.name,
                surname: result.surname,
                _id: result._id,
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/people/' + result._id
                }
            } 
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    })
});

router.get('/:_id', (req, res, next) => {
    const id = req.params._id;
    People.findById(id).select('idnum name surname _id personImage').exec().then(doc => {
        console.log("From database", doc);
        if (doc) {
            res.status(200).json({
                people: doc,
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/people'
                }
            });
        }else{
            res.status(404).json({message: 'No valid entry found'});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

router.patch("/:_id", checkAuth, (req, res, next) => {
    const id = req.params._id;
    const updateOps = {};
    for (const ops of req.body) {
        updateOps[ops.propName] = ops.value;
    }
    People.update({_id: id}, { $set: updateOps}).exec().then(result => {
        res.status(200).json({
            message: 'Person updated',
            request: {
                type: 'GET',
                url: 'http://localhost:3000/people/' + id
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

router.delete("/:_id", checkAuth, (req, res, next) => {
    const id = req.params._id;
    People.remove({_id: id}).exec().then(result => {
        res.status(200).json({
            message: 'Person deleted',
            request: {
                type: 'POST',
                url: 'http://localhost:3000/people',
                body: {idnum: 'Number', name:'String', surname: 'String'}
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

function validateEmail(email) {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}

const luhnCheck = num => {
    let arr = (num + '')
        .split('')
        .reverse()
        .map(x => parseInt(x));
    let lastDigit = arr.splice(0, 1)[0];
    let sum = arr.reduce((acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9), 0);
    sum += lastDigit;
    return sum % 10 === 0;
};

function validatePhone(number) {
    var re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    return re.test(number);
}

module.exports = router;