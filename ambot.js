const jwt = require('jsonwebtoken')
const { secret } = require('./config.json');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImlkIjozLCJpYXQiOjE3MTkxMzg0OTEsImV4cCI6MTcxOTEzODY3MX0.-rAQl3vfemD8sB4xGTOgdJAf-kpzUoiYnt5eKvYgWK4';

const decoded = jwt.verify(token, secret);
console.log(decoded);