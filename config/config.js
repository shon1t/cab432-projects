require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    TOKEN_SECRET: process.env.TOKEN_SECRET
}