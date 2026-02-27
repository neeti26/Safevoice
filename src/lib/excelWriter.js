const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Complaints_Database.csv');

// Create CSV with Headers if it doesn't exist
function initCsv() {
    if (!fs.existsSync(EXCEL_PATH)) {
        const headers = "Case ID,Tracking Code,Date of Incident,Location,Type of Harassment,Accused Department,Accused Designation,Frequency,Witnesses,Action Requested,Description (Encrypted),Status,Reported On\n";
        fs.writeFileSync(EXCEL_PATH, headers, 'utf8');
    }
}

function saveToCsv(caseData) {
    initCsv();

    // Clean fields to prevent CSV breaking (removing commas and newlines)
    const clean = (str) => {
        if (!str) return 'N/A';
        return '"' + String(str).replace(/"/g, '""').replace(/\n/g, ' ') + '"';
    };

    const row = [
        caseData.id,
        clean(caseData.trackingCode),
        clean(caseData.date),
        clean(caseData.location),
        clean(caseData.incidentCategory),
        clean(caseData.accusedDept),
        clean(caseData.accusedDesignation),
        clean(caseData.frequency),
        clean(caseData.witnesses),
        clean(caseData.requestedAction),
        clean(caseData.description), // For privacy, keeping actual description encrypted in this export or just logging that it was recorded securely.
        'Pending',
        clean(new Date().toISOString())
    ].join(',') + '\n';

    fs.appendFileSync(EXCEL_PATH, row, 'utf8');
}

module.exports = { saveToCsv };
