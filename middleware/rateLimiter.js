// rate-limiter.js
const rateLimiter = require("express-rate-limit");

const limiter = rateLimiter({
    max: 25,
    windowMS: 10000, // 10 seconds
    message: "Among Us is a game of incomplete information pitting an uninformed majority against an informed minority (sus)",
});

module.exports = limiter