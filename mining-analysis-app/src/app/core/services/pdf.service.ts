import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project } from '../../models/project.model';

@Injectable({
    providedIn: 'root'
})
export class PdfService {

    constructor() { }

    generateProjectReport(project: Project) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.text('Rapport d\'Analyse - Dossier ATI', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Généré le : ${new Date().toLocaleDateString()}`, 14, 28);

        // Project Info
        doc.setDrawColor(0);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 35, pageWidth - 28, 40, 'F');

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Titre : ${project.metadata.title}`, 20, 45);
        doc.text(`Source : ${project.metadata.sender}`, 20, 55);
        doc.text(`Reçu le : ${new Date(project.metadata.receivedDate).toLocaleDateString()}`, 20, 65);
        doc.text(`Statut : ${project.status}`, 120, 45);

        // Content
        doc.setFontSize(14);
        doc.text('Contenu de la demande', 14, 90);

        const splitText = doc.splitTextToSize(project.metadata.emailContent, pageWidth - 28);
        doc.setFontSize(10);
        doc.text(splitText, 14, 100);

        // Documents
        let yPos = 100 + (splitText.length * 5) + 10;

        // 3. AI Analysis Summary
        if (project.analysis) {
            yPos += 10;
            doc.setFontSize(14);
            doc.text('Analyse Intelligente (IA)', 14, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Summary
            if (project.analysis.summary) {
                doc.text('Résumé Exécutif :', 14, yPos);
                yPos += 5;
                const splitSummary = doc.splitTextToSize(project.analysis.summary, 180);
                doc.text(splitSummary, 14, yPos);
                yPos += (splitSummary.length * 5) + 5;
            }

            // Entities Table (Locations & Orgs)
            const entitiesData = [];
            if (project.analysis.locations?.length) {
                entitiesData.push(['Lieux identifiés', project.analysis.locations.join(', ')]);
            }
            if (project.analysis.entities?.length) {
                entitiesData.push(['Organisations', project.analysis.entities.join(', ')]);
            }

            if (entitiesData.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    head: [['Catégorie', 'Détails']],
                    body: entitiesData,
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185] }
                });
                // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 10;
            }

            // Impacts & Permits (Critical Info)
            const criticalData = [];
            if (project.analysis.permits?.length) {
                criticalData.push(['Permis / Certificats', project.analysis.permits.join('\n')]);
            }
            if (project.analysis.impacts?.length) {
                criticalData.push(['Impacts Environnementaux', project.analysis.impacts.join('\n')]);
            }

            if (criticalData.length > 0) {
                doc.text('Points de Vigilance :', 14, yPos);
                yPos += 5;
                autoTable(doc, {
                    startY: yPos,
                    head: [['Type', 'Éléments détectés']],
                    body: criticalData,
                    theme: 'striped',
                    headStyles: { fillColor: [192, 57, 43] } // Red for alert
                });
                // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 10;
            }
        } else {
            yPos += 10;
            doc.text('Aucune analyse IA disponible pour ce projet.', 14, yPos);
        }

        // 4. Documents List
        // @ts-ignore
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : yPos + 10;
        doc.text('Documents Sources :', 14, finalY);

        const docRows = project.documents?.map(d => [
            d.name,
            d.type,
            new Date(d.uploadedAt).toLocaleDateString()
        ]) || [];

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Nom du fichier', 'Type', 'Date']],
            body: docRows,
        });

        // Save
        doc.save(`Rapport_${project.metadata.title.replace(/\s+/g, '_')}.pdf`);
    }
}
