const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
    Username: String,
    Password: String,
    Token: String
});

module.exports = mongoose.model('accounts', scheme);
