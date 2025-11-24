const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure Nodemailer (Simulation or Real SMTP)
// For production, use a service like SendGrid, Mailgun, or Gmail with App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'votre-email@gmail.com', // Placeholder
        pass: 'votre-mot-de-passe-app' // Placeholder
    }
});

/**
 * Trigger: When a project document is updated in Firestore.
 * Action: Check if 'status' field has changed.
 */
exports.onProjectStatusChange = functions.firestore
    .document("projects/{projectId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // Check if status changed
        if (newValue.status === previousValue.status) {
            return null;
        }

        const projectId = context.params.projectId;
        const newStatus = newValue.status;
        const projectTitle = newValue.metadata.title;

        console.log(`Statut du projet ${projectId} changé de ${previousValue.status} à ${newStatus}`);

        // Prepare Email Content
        const subject = `Mise à jour du dossier : ${projectTitle}`;
        let text = `Le statut du dossier "${projectTitle}" a été mis à jour.\n\nNouveau statut : ${newStatus}\n\n`;

        if (newStatus === 'APPROVED') {
            text += "Félicitations ! Ce dossier a été approuvé et passera à l'étape suivante.\n";
        } else if (newStatus === 'REJECTED') {
            text += "Ce dossier a été refusé. Veuillez consulter les détails dans l'application.\n";
        } else if (newStatus === 'ANALYZED') {
            text += "L'analyse IA est terminée. Vous pouvez consulter les résultats.\n";
        }

        text += `\nConsulter le dossier : https://mining-analysis-app.web.app/projects/${projectId}`;

        const mailOptions = {
            from: '"Mining Analysis App" <noreply@mining-app.com>',
            to: 'destinataire@example.com', // In real app, get from user profile or project metadata
            subject: subject,
            text: text
        };

        try {
            // In a real deployment with valid credentials, uncomment the next line:
            // await transporter.sendMail(mailOptions);

            // For now, we log the email content to Cloud Logging
            console.log("--- SIMULATION ENVOI EMAIL ---");
            console.log(`To: ${mailOptions.to}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Body: ${mailOptions.text}`);
            console.log("------------------------------");

            // Add notification to Firestore 'notifications' collection (for in-app display)
            await admin.firestore().collection('notifications').add({
                projectId: projectId,
                message: `Statut changé à ${newStatus}`,
                type: 'STATUS_CHANGE',
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error("Erreur lors de l'envoi de l'email:", error);
        }

        return null;
    });
