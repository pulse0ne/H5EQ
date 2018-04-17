'use strict';

const path = require('path');
const express = require('express');
const app = express();
app.use(express.static(path.join(__dirname, 'dev')));
app.listen(50005, () => console.log('Test server started'));
