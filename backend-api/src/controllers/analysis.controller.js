const axios = require('axios');
const { db } = require('../config/firebase');

const startAnalysis = async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'Missing projectId' });
        }

        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const projectData = projectDoc.data();
        // Find the first PDF document to analyze
        // In a real scenario, we might analyze all or let the user choose
        const documentToAnalyze = projectData.documents?.find(d => d.type === 'application/pdf' || d.name.endsWith('.pdf'));

        if (!documentToAnalyze) {
            return res.status(400).json({ error: 'No PDF document found in project' });
        }

        // Call Python AI Microservice
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8080';

        try {
            await axios.post(`${aiServiceUrl}/analyze`, {
                projectId: projectId,
                documentPath: `projects/${projectId}/${documentToAnalyze.name}`
            });

            res.json({ message: 'Analysis started successfully', projectId });
        } catch (aiError) {
            console.error('Error calling AI service:', aiError.message);
            // Fallback for dev/demo if AI service is offline
            console.log('Falling back to simulation...');

            await projectRef.update({
                'metadata.status': 'ANALYZED',
                'metadata.analyzedAt': new Date().toISOString()
            });

            await db.collection('history').add({
                projectId: projectId,
                action: 'ANALYSIS_COMPLETED',
                userId: req.user.uid,
                details: 'Analyse simulée (Service IA non joignable)',
                timestamp: new Date().toISOString()
            });

            res.json({ message: 'Analysis simulated (AI Service offline)', projectId });
        }

    } catch (error) {
        console.error('Error starting analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    startAnalysis
};
