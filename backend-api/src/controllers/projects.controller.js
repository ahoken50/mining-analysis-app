const { db } = require('../config/firebase');

const createProject = async (req, res) => {
    try {
        const data = req.body;
        // Basic validation
        if (!data.metadata || !data.metadata.title) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Add server-side metadata
        const projectData = {
            ...data,
            metadata: {
                ...data.metadata,
                createdAt: new Date().toISOString(), // Store as ISO string for JSON compatibility
                status: 'ANALYSIS_PENDING'
            }
        };

        const docRef = await db.collection('projects').add(projectData);

        // Create initial history event
        await db.collection('history').add({
            projectId: docRef.id,
            action: 'CREATED',
            userId: data.metadata.createdBy || 'system',
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ id: docRef.id, message: 'Project created successfully' });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('projects').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createProject,
    getProject
};
