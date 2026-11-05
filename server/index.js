require('dotenv').config();
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

// Root health check
app.get('/', (req, res) => {
    res.send('Crema & Co. API is running');
});

// Only listen if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
