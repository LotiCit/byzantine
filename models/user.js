var FRAUD_LIMIT = 3;

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/byzantine');

var AccountSchema = new mongoose.Schema({
    userId:     { type: String, unique: true },
    password:  { type: String },
    age: { type: Number },
    gender: {type: String },
    address: {type: String },
    phone: { type: String },
    department: { type: String },
    name: {
        first:   { type: String },
        last:    { type: String }
    },
    perms: {type: Array},
    userType: { type: String }
});

var Account = mongoose.model('Account', AccountSchema);

exports.authenticate = function (req, res) {
    Account.findOne({userId: req.body.userId, password: req.body.password},
        function(err,doc) {
            if(err) {
                throw new Error('Error occured: ' + err);
            }
            if (doc) {
                req.session.loggedIn = true;
                req.session.userId = doc.userId;
                req.session.perms = doc.perms;
                exports.loggedInUsers.push({
                    id: doc.userId,
                    time: new Date().toUTCString()
                });

                res.redirect('/dashboard');
            } else {
                res.render('index', {error: true});
            }
        });
};

exports.authenticateManager = function (req, res) {
    Account.findOne({userId: req.body.userId, password: req.body.password,
        userType: 'manager'}, function(err,doc) {
            if(err) {
                throw new Error('Error occured: ' + err);
            }
            if (doc) {
                req.session.loggedIn = true;
                res.redirect('/manager-dashboard');
            } else {
                console.log('no doc found');
                res.render('manager-login', {error: true});
            }
        });
};

exports.register = function (req, res)  {
    var user = new Account({
        userId: req.body.userId,
        password: req.body.password,
        name: {
            first: req.body.first,
            last: req.body.last
        },
        age: req.body.age,
        gender: req.body.gender,
        address: req.body.address,
        phone: req.body.phone,
        department: req.body.department,
        perms: req.body.perms, // [upload, download, analyse]
        userType: 'client'
    });
    user.save(function (d) {
        console.log('saved');
        console.log(JSON.stringify(d));
    });
    res.send(200);
};

function delUser(req, res) {
    var id;
    if (typeof req === 'object') {
        id = req.body.userId;
    } else {
        id = req;
    }
    Account.remove({userId: id}, function (err) {
        if (err) {
            console.log('Error occured:' + err);
            res.send(400);
            // TODO - mongoose doesnt issue error on invalid delete
        }
        console.log('User successfully deleted');
        res.send(200);
    });
}

exports.deleteUser = delUser;

exports.createAdmin = function () {
    var user = new Account({
        userId: 'admin',
        password: 'admin',
        name: {
            first: 'Rohit',
            last: 'GS'
        },
        age: 22,
        gender: 'male',
        address: 'Bangalore',
        phone: '',
        department: 'ISE',
        perms: ['upload', 'download', 'analyse'], //[upload, download, analyse]
        userType: 'manager'
    });
    user.save(function (err, d) {
        if (err) {
            console.log(err);
        } else {
            console.log('Manager admin created');
            console.log(JSON.stringify(d));
        }
    });
};


function logout (req, res) {
    req.session = {};
    res.session.loggedIn = false;
    res.redirect('/');
}

exports.logout = logout;

exports.userRequest = function (req, res) {
    var userOp = req.body.reqType.substring(4);
    if (req.session.perms.indexOf(userOp) === -1) {
        console.log('Fradulent operation');
        ++exports.fraudCount;
        if (exports.fraudCount > FRAUD_LIMIT) {
            delUser(req, res);
            console.log('Fradulent access limit exceeded');
            res.redirect('/fraud-deletion');
        } else {
            res.send(400);
        }
    } else {
        console.log('Legal operation');
        res.send(200);
    }
};

exports.fraudDeletion = function (req, res) {
    logout(req, res);
    res.render('fraud-deletion');
};
exports.noOfUsers = 0;
exports.loggedInUsers = [];
exports.fraudCount = 0;
