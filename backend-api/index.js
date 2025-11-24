const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const projectsRoutes = require('./src/routes/projects.routes');
const analysisRoutes = require('./src/routes/analysis.routes');

app.use('/api/projects', projectsRoutes);
app.use('/api/analysis', analysisRoutes);

app.get('/', (req, res) => {
    res.send('Mining Analysis API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
