(() => {
  'use strict';

  const STORAGE_KEY = 'csk-clinic-management-v1';
  const API_BASE_URL = window.CSK_CLINIC_API_BASE_URL || 'http://localhost:3001/api';
  const API_TOKEN_KEY = 'csk-clinic-api-token';
  const API_USER_KEY = 'csk-clinic-api-user';
  const UI_FONT_SCALE_KEY = 'csk-clinic-ui-font-scale-v1';
  const SIDEBAR_COLLAPSED_KEY = 'csk-clinic-sidebar-collapsed-v1';
  const WORKSPACE_MODE = new URLSearchParams(window.location.search).get('workspace');
  let doctorQueuePollingTimer = null;
  let doctorQueueRefreshInFlight = false;
  let doctorQueueRefreshPending = false;
  let doctorQueueInitialized = false;
  let doctorRealtimeConnected = false;
  let doctorDashboardRefreshInFlight = false;
  const knownDoctorQueueIds = new Set();
  const DEMO_DATA_VERSION = 2;
  const today = new Date();
  const dateKey = (date) => {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const shiftDate = (days) => {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return dateKey(value);
  };
  const makeId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const makeUuid = () => window.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;
      return (character === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
    });
  const demoPatientHistory = [
    {
      id: 'patient-history-demo-1',
      patientId: 'patient-demo-1',
      medicalConditions: [{ id: 'condition-demo-1-1', condition: 'Hypertension', diagnosedAt: shiftDate(-1200), status: 'CONTROLLED', currentMedication: 'Amlodipine 5 mg once daily', previousTreatment: 'Lifestyle changes and home BP monitoring', doctorRemarks: 'Synthetic demo history; confirm all details.' }],
      familyHistoryMembers: [{ id: 'family-demo-1-1', relationship: 'Mother', ageAtDiagnosis: 58, conditions: [{ condition: 'Hypertension' }, { condition: 'Type 2 Diabetes Mellitus' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 1, teaPerDay: 2, sleepAdequate: true, sleepingHours: 7, otherHabits: 'Walks 30 minutes most days.' },
      femaleHistory: { menstrualCycle: 'REGULAR', lastMenstrualPeriod: shiftDate(-18), cycleDurationDays: 28, menstrualComplaints: 'None reported in this synthetic sample.', whiteDischarge: false, dischargeDuration: '', associatedSymptoms: '', doctorRemarks: 'Sample only.' },
    },
    {
      id: 'patient-history-demo-2',
      patientId: 'patient-demo-2',
      medicalConditions: [{ id: 'condition-demo-2-1', condition: 'Osteoarthritis', diagnosedAt: shiftDate(-730), status: 'ACTIVE', currentMedication: 'Topical pain relief as needed', previousTreatment: 'Activity modification and physiotherapy', doctorRemarks: 'Synthetic demo history; confirm all details.' }],
      familyHistoryMembers: [{ id: 'family-demo-2-1', relationship: 'Father', ageAtDiagnosis: 62, conditions: [{ condition: 'Hypertension' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: true, alcoholFrequency: 'Occasional', alcoholQuantity: '1–2 drinks per month', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 2, teaPerDay: 1, sleepAdequate: true, sleepingHours: 7.5, otherHabits: 'Desk-based work; light exercise twice weekly.' },
      femaleHistory: null,
    },
    {
      id: 'patient-history-demo-3',
      patientId: 'patient-demo-3',
      medicalConditions: [{ id: 'condition-demo-3-1', condition: 'Iron deficiency anemia', diagnosedAt: shiftDate(-180), status: 'ACTIVE', currentMedication: 'Oral iron supplement per prior clinician', previousTreatment: 'Dietary counselling and follow-up CBC', doctorRemarks: 'Synthetic demo history; confirm all details.' }],
      familyHistoryMembers: [{ id: 'family-demo-3-1', relationship: 'Mother', ageAtDiagnosis: 45, conditions: [{ condition: 'Hypothyroidism' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 1, teaPerDay: 2, sleepAdequate: false, sleepingHours: 6, otherHabits: 'Mostly vegetarian diet; sample information only.' },
      femaleHistory: { menstrualCycle: 'REGULAR', lastMenstrualPeriod: shiftDate(-12), cycleDurationDays: 29, menstrualComplaints: 'Occasional fatigue around menstruation.', whiteDischarge: false, dischargeDuration: '', associatedSymptoms: 'No other symptoms recorded in this sample.', doctorRemarks: 'Sample only.' },
    },
    {
      id: 'patient-history-demo-4',
      patientId: 'patient-demo-4',
      medicalConditions: [{ id: 'condition-demo-4-1', condition: 'Type 2 Diabetes Mellitus', diagnosedAt: shiftDate(-1600), status: 'ACTIVE', currentMedication: 'Metformin 500 mg twice daily (sample)', previousTreatment: 'Diet counselling and glucose monitoring', doctorRemarks: 'Synthetic demo history; confirm all details.' }, { id: 'condition-demo-4-2', condition: 'Dyslipidemia', diagnosedAt: shiftDate(-900), status: 'CONTROLLED', currentMedication: 'Medication per prior clinician (sample)', previousTreatment: 'Diet and activity counselling', doctorRemarks: 'Sample only.' }],
      familyHistoryMembers: [{ id: 'family-demo-4-1', relationship: 'Father', ageAtDiagnosis: 55, conditions: [{ condition: 'Type 2 Diabetes Mellitus' }, { condition: 'Hypertension' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 1, teaPerDay: 2, sleepAdequate: true, sleepingHours: 7, otherHabits: 'Walks regularly; sample information only.' },
      femaleHistory: { menstrualCycle: 'IRREGULAR', lastMenstrualPeriod: shiftDate(-95), cycleDurationDays: null, menstrualComplaints: 'Irregular cycles reported in sample.', whiteDischarge: false, dischargeDuration: '', associatedSymptoms: '', doctorRemarks: 'Sample only.' },
    },
    {
      id: 'patient-history-demo-5',
      patientId: 'patient-demo-5',
      medicalConditions: [{ id: 'condition-demo-5-1', condition: 'Bronchial Asthma', diagnosedAt: shiftDate(-2500), status: 'CONTROLLED', currentMedication: 'Rescue inhaler as directed (sample)', previousTreatment: 'Trigger avoidance and inhaler technique review', doctorRemarks: 'Synthetic demo history; confirm all details.' }],
      familyHistoryMembers: [{ id: 'family-demo-5-1', relationship: 'Brother', ageAtDiagnosis: 20, conditions: [{ condition: 'Allergic rhinitis' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 2, teaPerDay: 1, sleepAdequate: true, sleepingHours: 7, otherHabits: 'Exercise may trigger wheezing in this sample.' },
      femaleHistory: null,
    },
    {
      id: 'patient-history-demo-6',
      patientId: 'patient-demo-6',
      medicalConditions: [{ id: 'condition-demo-6-1', condition: 'Hypertension', diagnosedAt: shiftDate(-3000), status: 'ACTIVE', currentMedication: 'Losartan 50 mg once daily (sample)', previousTreatment: 'Home BP monitoring', doctorRemarks: 'Synthetic demo history; confirm all details.' }, { id: 'condition-demo-6-2', condition: 'Osteoarthritis', diagnosedAt: shiftDate(-1800), status: 'ACTIVE', currentMedication: 'Topical pain relief as needed', previousTreatment: 'Physiotherapy and gentle movement', doctorRemarks: 'Sample only.' }],
      familyHistoryMembers: [{ id: 'family-demo-6-1', relationship: 'Mother', ageAtDiagnosis: 68, conditions: [{ condition: 'Osteoarthritis' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 1, teaPerDay: 3, sleepAdequate: false, sleepingHours: 6, otherHabits: 'Uses a walking stick for longer distances; sample only.' },
      femaleHistory: { menstrualCycle: '', lastMenstrualPeriod: '', cycleDurationDays: null, menstrualComplaints: '', whiteDischarge: false, dischargeDuration: '', associatedSymptoms: '', doctorRemarks: 'Post-menopausal sample record.' },
    },
    {
      id: 'patient-history-demo-7',
      patientId: 'patient-demo-7',
      medicalConditions: [{ id: 'condition-demo-7-1', condition: 'Seasonal allergic rhinitis', diagnosedAt: shiftDate(-400), status: 'ACTIVE', currentMedication: 'Non-sedating antihistamine as needed (sample)', previousTreatment: 'Trigger avoidance', doctorRemarks: 'Synthetic demo history; confirm all details.' }],
      familyHistoryMembers: [{ id: 'family-demo-7-1', relationship: 'Mother', ageAtDiagnosis: 35, conditions: [{ condition: 'Asthma' }], remarks: 'Synthetic demo entry.' }],
      personalHistory: { alcohol: false, alcoholFrequency: '', alcoholQuantity: '', smoking: false, smokingDuration: '', tobaccoChewing: false, tobaccoDuration: '', coffeePerDay: 0, teaPerDay: 1, sleepAdequate: true, sleepingHours: 8, otherHabits: 'Student; participates in school sports.' },
      femaleHistory: null,
    },
  ];
  const demoVisitRecords = [
    { id: 'visit-demo-v2-1', patientId: 'patient-demo-1', daysAgo: -3, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Meera Nair', symptoms: 'Routine blood pressure review; no chest pain or dizziness.', consultationNotes: 'Medication adherence reviewed. Home readings and salt intake discussed.', diagnosis: 'Hypertension follow-up', bloodPressure: '136/84', pulseBpm: 74, temperatureC: 36.6, spo2Percent: 99, weightKg: 67.8, heightCm: 158, knownCase: 'Hypertension', prescriptions: 'Continue the existing plan pending clinician review.', tests: 'Renal function panel; lipid profile', followUpDate: shiftDate(30), followUpInstructions: 'Bring the home BP log. Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-2', patientId: 'patient-demo-2', daysAgo: -30, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Anjali Menon', symptoms: 'Intermittent knee discomfort after long walks.', consultationNotes: 'Mobility and activity tolerance reviewed; no recent injury reported.', diagnosis: 'Osteoarthritis assessment', bloodPressure: '128/80', pulseBpm: 72, temperatureC: 36.5, spo2Percent: 98, weightKg: 78.4, heightCm: 174, knownCase: 'Osteoarthritis', prescriptions: 'Home exercise plan reviewed (sample).', tests: 'No investigations ordered.', followUpDate: shiftDate(60), followUpInstructions: 'Return if pain or swelling worsens. Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-3', patientId: 'patient-demo-2', daysAgo: -5, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Rohan Sethi', symptoms: 'Knee stiffness improved; no swelling today.', consultationNotes: 'Follow-up mobility check and medication reconciliation completed.', diagnosis: 'Osteoarthritis follow-up', bloodPressure: '126/78', pulseBpm: 70, temperatureC: 36.6, spo2Percent: 98, weightKg: 78, heightCm: 174, knownCase: 'Osteoarthritis', prescriptions: 'Continue clinician-approved home plan.', tests: 'None', followUpDate: shiftDate(90), followUpInstructions: 'Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-4', patientId: 'patient-demo-3', daysAgo: -60, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Meera Nair', symptoms: 'Fatigue for several weeks; no fainting or shortness of breath.', consultationNotes: 'Diet and prior laboratory results reviewed; sample plan documented.', diagnosis: 'Iron deficiency anemia review', bloodPressure: '110/70', pulseBpm: 82, temperatureC: 36.7, spo2Percent: 99, weightKg: 56.2, heightCm: 160, cbgMgDl: null, knownCase: 'Iron deficiency anemia', prescriptions: 'Continue previously prescribed supplement pending review.', tests: 'CBC and ferritin', followUpDate: shiftDate(14), followUpInstructions: 'Review laboratory results. Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-5', patientId: 'patient-demo-3', daysAgo: -4, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Anjali Menon', symptoms: 'Energy improving; no new concerns.', consultationNotes: 'Follow-up and test review scheduled; sample record.', diagnosis: 'Anemia follow-up', bloodPressure: '112/72', pulseBpm: 78, temperatureC: 36.6, spo2Percent: 99, weightKg: 56.5, heightCm: 160, knownCase: 'Iron deficiency anemia', prescriptions: 'Dietary iron counselling (sample).', tests: 'CBC follow-up', followUpDate: shiftDate(45), followUpInstructions: 'Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-6', patientId: 'patient-demo-4', daysAgo: -3, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Meera Nair', symptoms: 'Diabetes follow-up; no acute symptoms reported.', consultationNotes: 'Home glucose log reviewed. Foot-care and meal planning discussed.', diagnosis: 'Type 2 diabetes follow-up', bloodPressure: '128/80', pulseBpm: 78, temperatureC: 36.7, spo2Percent: 98, cbgMgDl: 154, weightKg: 71.8, heightCm: 162, knownCase: 'Type 2 diabetes and dyslipidemia', prescriptions: 'Existing plan documented for demonstration only.', tests: 'HbA1c, fasting glucose, renal panel', followUpDate: shiftDate(30), followUpInstructions: 'Bring glucose log and test results. Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-7', patientId: 'patient-demo-5', daysAgo: -1, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Anjali Menon', symptoms: 'No current wheeze; occasional symptoms during exercise.', consultationNotes: 'Inhaler technique and seasonal triggers reviewed.', diagnosis: 'Asthma follow-up', bloodPressure: '116/74', pulseBpm: 72, temperatureC: 36.5, spo2Percent: 99, weightKg: 70.2, heightCm: 171, knownCase: 'Bronchial asthma; seasonal pollen allergy', prescriptions: 'Continue existing clinician-directed inhaler plan.', tests: 'Peak flow diary', followUpDate: shiftDate(45), followUpInstructions: 'Return for increasing symptoms. Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-8', patientId: 'patient-demo-6', daysAgo: -30, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Rohan Sethi', symptoms: 'Morning knee stiffness and routine BP review.', consultationNotes: 'Medication reconciliation and mobility assessment completed.', diagnosis: 'Hypertension and osteoarthritis review', bloodPressure: '134/82', pulseBpm: 74, temperatureC: 36.5, spo2Percent: 97, weightKg: 64.8, heightCm: 154, knownCase: 'Hypertension and osteoarthritis', prescriptions: 'Existing plan documented for demonstration only.', tests: 'Renal function monitoring', followUpDate: shiftDate(30), followUpInstructions: 'Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-9', patientId: 'patient-demo-7', daysAgo: -90, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Meera Nair', symptoms: 'Seasonal sneezing and itchy eyes; no breathing difficulty.', consultationNotes: 'Allergy triggers and school activity reviewed with guardian.', diagnosis: 'Seasonal allergic rhinitis', bloodPressure: '108/68', pulseBpm: 76, temperatureC: 36.6, spo2Percent: 99, weightKg: 58.2, heightCm: 168, knownCase: 'Seasonal allergic rhinitis', prescriptions: 'Supportive care and trigger avoidance discussed.', tests: 'None', followUpDate: shiftDate(90), followUpInstructions: 'Synthetic demo record.', prescriptionItems: [], reports: [] },
    { id: 'visit-demo-v2-10', patientId: 'patient-demo-7', daysAgo: -2, encounterType: 'OPD', status: 'CLOSED', doctorName: 'Dr. Anjali Menon', symptoms: 'Well visit; no current complaints.', consultationNotes: 'General health and activity reviewed with guardian present.', diagnosis: 'Routine health review', bloodPressure: '110/70', pulseBpm: 72, temperatureC: 36.5, spo2Percent: 99, weightKg: 59, heightCm: 169, knownCase: 'Seasonal allergic rhinitis', prescriptions: 'No new prescription recorded.', tests: 'None', followUpDate: shiftDate(180), followUpInstructions: 'Synthetic demo record.', prescriptionItems: [], reports: [] },
  ].map(({ daysAgo, ...record }) => ({ ...record, visitDate: shiftDate(daysAgo), createdAt: `${shiftDate(daysAgo)}T10:00:00`, notes: 'Synthetic demo data; not a real patient record.' }));
  const demoVitalReadings = [
    ['vital-demo-1-1', 'patient-demo-1', 'visit-demo-1', -12, 'Dr. Meera Nair', 146, 92, 78, 36.7, 98, null, 158, 68.2],
    ['vital-demo-1-2', 'patient-demo-1', 'visit-demo-v2-1', -3, 'Dr. Meera Nair', 136, 84, 74, 36.6, 99, null, 158, 67.8],
    ['vital-demo-2-1', 'patient-demo-2', 'visit-demo-v2-2', -30, 'Dr. Anjali Menon', 128, 80, 72, 36.5, 98, null, 174, 78.4],
    ['vital-demo-2-2', 'patient-demo-2', 'visit-demo-v2-3', -5, 'Dr. Rohan Sethi', 126, 78, 70, 36.6, 98, null, 174, 78],
    ['vital-demo-3-1', 'patient-demo-3', 'visit-demo-v2-4', -60, 'Dr. Meera Nair', 110, 70, 82, 36.7, 99, null, 160, 56.2],
    ['vital-demo-3-2', 'patient-demo-3', 'visit-demo-v2-5', -4, 'Dr. Anjali Menon', 112, 72, 78, 36.6, 99, null, 160, 56.5],
    ['vital-demo-4-1', 'patient-demo-4', 'visit-demo-2', -35, 'Dr. Rohan Sethi', 132, 84, 82, 36.8, 98, 238, 162, 72.4],
    ['vital-demo-4-2', 'patient-demo-4', 'visit-demo-v2-6', -3, 'Dr. Meera Nair', 128, 80, 78, 36.7, 98, 154, 162, 71.8],
    ['vital-demo-5-1', 'patient-demo-5', 'visit-demo-3', -7, 'Dr. Anjali Menon', 118, 76, 74, 36.6, 98, null, 171, 70.4],
    ['vital-demo-5-2', 'patient-demo-5', 'visit-demo-v2-7', -1, 'Dr. Anjali Menon', 116, 74, 72, 36.5, 99, null, 171, 70.2],
    ['vital-demo-6-1', 'patient-demo-6', 'visit-demo-v2-8', -30, 'Dr. Rohan Sethi', 134, 82, 74, 36.5, 97, null, 154, 64.8],
    ['vital-demo-6-2', 'patient-demo-6', 'visit-demo-4', -2, 'Dr. Rohan Sethi', 138, 86, 76, 36.6, 97, null, 154, 64.5],
    ['vital-demo-7-1', 'patient-demo-7', 'visit-demo-v2-9', -90, 'Dr. Meera Nair', 108, 68, 76, 36.6, 99, null, 168, 58.2],
    ['vital-demo-7-2', 'patient-demo-7', 'visit-demo-v2-10', -2, 'Dr. Anjali Menon', 110, 70, 72, 36.5, 99, null, 169, 59],
  ].map(([id, patientId, encounterId, daysAgo, doctorName, systolicMmHg, diastolicMmHg, pulseBpm, temperatureC, spo2Percent, cbgMgDl, heightCm, weightKg]) => ({
    id, patientId, encounterId, visitDate: shiftDate(daysAgo), recordedAt: `${shiftDate(daysAgo)}T10:15:00`, doctorName,
    systolicMmHg, diastolicMmHg, pulseBpm, temperatureC, spo2Percent, cbgMgDl, heightCm, weightKg,
    bmi: Number((weightKg / ((heightCm / 100) ** 2)).toFixed(2)), source: 'demo',
  }));
  const cloneDemoRecords = (records) => JSON.parse(JSON.stringify(records));
  const demoPatientProfileDefaults = [
    { address: '14 Sample Road, Chennai', city: 'Chennai', postalCode: '600001', email: 'aisha.demo@example.test', occupation: 'School teacher', maritalStatus: 'Married', emergencyContactName: 'Ravi Nair', emergencyContactRelationship: 'Spouse', emergencyPhone: '9000000091', allergies: 'Allergy status not recorded in this synthetic sample; verify before care.', medicalHistory: 'Hypertension follow-up', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Amlodipine 5 mg once daily (sample).', familyHistory: 'Mother: hypertension and type 2 diabetes (sample).' },
    { address: '22 Sample Street, Salem', city: 'Salem', postalCode: '636001', email: 'rohan.demo@example.test', occupation: 'Accountant', maritalStatus: 'Married', emergencyContactName: 'Neha Mehta', emergencyContactRelationship: 'Spouse', emergencyPhone: '9000000092', allergies: 'Allergy status not recorded in this synthetic sample; verify before care.', medicalHistory: 'Osteoarthritis follow-up', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Topical pain relief as needed (sample).', familyHistory: 'Father: hypertension (sample).' },
    { address: '8 Sample Lane, Attur', city: 'Attur', postalCode: '636102', email: 'pooja.demo@example.test', occupation: 'Graduate student', maritalStatus: 'Single', emergencyContactName: 'Lakshmi Iyer', emergencyContactRelationship: 'Mother', emergencyPhone: '9000000093', allergies: 'Allergy status not recorded in this synthetic sample; verify before care.', medicalHistory: 'Iron deficiency anemia review', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Oral iron supplement per prior clinician (sample).', familyHistory: 'Mother: hypothyroidism (sample).' },
    { address: '31 Sample Nagar, Salem', city: 'Salem', postalCode: '636004', email: 'maya.demo@example.test', occupation: 'Office administrator', maritalStatus: 'Married', emergencyContactName: 'Demo contact', emergencyContactRelationship: 'Family', emergencyPhone: '9000000045', allergies: 'No known drug allergies', medicalHistory: 'Type 2 diabetes and dyslipidemia follow-up', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Metformin 500 mg twice daily (sample).', familyHistory: 'Father: type 2 diabetes and hypertension (sample).' },
    { address: '5 Sample Cross Street, Attur', city: 'Attur', postalCode: '636102', email: 'arjun.demo@example.test', occupation: 'Delivery coordinator', maritalStatus: 'Single', emergencyContactName: 'Sanjay Das', emergencyContactRelationship: 'Father', emergencyPhone: '9000000095', allergies: 'Seasonal pollen allergy', medicalHistory: 'Mild asthma follow-up', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Rescue inhaler as directed (sample).', familyHistory: 'Sibling: allergic rhinitis (sample).' },
    { address: '2 Sample Garden, Thammampatti', city: 'Thammampatti', postalCode: '636113', email: 'leela.demo@example.test', occupation: 'Retired tailor', maritalStatus: 'Widowed', emergencyContactName: 'Demo contact', emergencyContactRelationship: 'Family', emergencyPhone: '9000000048', allergies: 'Allergy status not recorded in this synthetic sample; verify before care.', medicalHistory: 'Hypertension and osteoarthritis', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'Losartan 50 mg once daily (sample); topical pain relief as needed.', familyHistory: 'Mother: osteoarthritis (sample).' },
    { address: '3 Sample Street, Veethi', city: 'Veethi', postalCode: '636113', email: 'naveen.demo@example.test', occupation: 'Student', maritalStatus: 'Single', emergencyContactName: 'Demo guardian', emergencyContactRelationship: 'Parent', emergencyPhone: '9000000050', allergies: 'Allergy status not recorded in this synthetic sample; verify before care.', medicalHistory: 'No known chronic conditions reported in this synthetic sample.', surgicalHistory: 'No surgery recorded in this synthetic sample.', currentMedications: 'No regular medication reported in this synthetic sample.', familyHistory: 'Mother: asthma (sample).' },
  ];
  function demoPatientDetails(patient) {
    const profile = demoPatientProfileDefaults[Number(String(patient.id).split('-').pop()) - 1] || {};
    return {
      ...patient,
      notes: patient.notes || 'Synthetic demo patient record; not a real patient.',
      email: patient.email || profile.email || 'demo.patient@example.test',
      allergies: patient.allergies || profile.allergies || 'Allergy status not recorded in this synthetic sample; verify before care.',
      medicalHistory: patient.medicalHistory || profile.medicalHistory || 'Not recorded in this synthetic sample.',
      surgicalHistory: patient.surgicalHistory || profile.surgicalHistory || 'Not recorded in this synthetic sample.',
      currentMedications: patient.currentMedications || profile.currentMedications || 'Not recorded in this synthetic sample.',
      familyHistory: patient.familyHistory || profile.familyHistory || 'Not recorded in this synthetic sample.',
      address: patient.address || profile.address || 'Sample address',
      city: patient.city || profile.city || 'Thammampatti',
      state: patient.state || 'Tamil Nadu',
      postalCode: patient.postalCode || profile.postalCode || '636113',
      relationToAccount: patient.relationToAccount || 'Self',
      emergencyContactName: patient.emergencyContactName || profile.emergencyContactName || 'Demo emergency contact',
      emergencyContactRelationship: patient.emergencyContactRelationship || profile.emergencyContactRelationship || 'Family',
      emergencyPhone: patient.emergencyPhone || profile.emergencyPhone || '9000000091',
      emergencyContact: patient.emergencyContact || `${profile.emergencyContactName || 'Demo emergency contact'} · ${profile.emergencyPhone || '9000000091'}`,
      occupation: patient.occupation || profile.occupation || 'Not specified (sample)',
      maritalStatus: patient.maritalStatus || profile.maritalStatus || 'Prefer not to say',
      preferredLanguage: patient.preferredLanguage || 'Tamil, English',
      insuranceProvider: patient.insuranceProvider || 'Demo self-pay',
      insuranceNumber: patient.insuranceNumber || 'DEMO-N/A',
      insuranceSumInsured: patient.insuranceSumInsured ?? 0,
    };
  }
  function nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `CSK-${year}-`;
    const highestNumber = data.invoices.reduce((highest, invoice) => {
      if (!String(invoice.number || '').startsWith(prefix)) return highest;
      const sequence = Number(String(invoice.number).slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);
    return `${prefix}${String(highestNumber + 1).padStart(5, '0')}`;
  }

  const initialData = () => ({
    demoDataVersion: DEMO_DATA_VERSION,
    patientIdSequenceOrdinal: '0',
    patients: [
      { id: 'patient-demo-1', code: 'CSK-2048', name: 'Aisha Nair', phone: '98765 43210', dob: '1992-06-18', gender: 'Female', email: 'aisha@example.com', bloodGroup: 'O+', address: 'Chennai', notes: '', allergies: '', medicalHistory: 'Hypertension follow-up', emergencyContact: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-2', code: 'CSK-3191', name: 'Rohan Mehta', phone: '98450 11223', dob: '1984-03-07', gender: 'Male', email: '', bloodGroup: 'B+', address: '', notes: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-3', code: 'CSK-1880', name: 'Pooja Iyer', phone: '99001 22334', dob: '1997-11-24', gender: 'Female', email: '', bloodGroup: 'A+', address: '', notes: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-4', code: 'CSK-4204', name: 'Maya Krishnan', phone: '9000000044', dob: '1981-08-03', gender: 'Female', email: 'maya.demo@example.test', bloodGroup: 'A-', address: 'Salem', notes: 'Demo patient record', allergies: 'No known drug allergies', medicalHistory: 'Type 2 diabetes follow-up', emergencyContact: 'Demo contact · 9000000045', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-5', code: 'CSK-4205', name: 'Arjun Das', phone: '9000000046', dob: '1994-02-16', gender: 'Male', email: 'arjun.demo@example.test', bloodGroup: 'B+', address: 'Attur', notes: 'Demo patient record', allergies: 'Seasonal pollen allergy', medicalHistory: 'Mild asthma', emergencyContact: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-6', code: 'CSK-4206', name: 'Leela Subramaniam', phone: '9000000047', dob: '1957-12-09', gender: 'Female', email: '', bloodGroup: 'O-', address: 'Thammampatti', notes: 'Demo patient record', allergies: '', medicalHistory: 'Hypertension and osteoarthritis', emergencyContact: 'Demo contact · 9000000048', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-7', code: 'CSK-4207', name: 'Naveen Kumar', phone: '9000000049', dob: '2008-05-22', gender: 'Male', email: '', bloodGroup: 'AB+', address: 'Veethi', notes: 'Demo patient record', allergies: '', medicalHistory: 'No known chronic conditions', emergencyContact: 'Demo guardian · 9000000050', status: 'Active', createdAt: new Date().toISOString() }
    ].map(demoPatientDetails),
    medicines: [
      { id: 'medicine-demo-1', name: 'Paracetamol 500 mg', category: 'Pain relief', batch: 'PCM-2410', expiry: shiftDate(210), quantity: 120, reorder: 25, cost: 1.8, price: 3 },
      { id: 'medicine-demo-2', name: 'Amoxicillin 250 mg', category: 'Antibiotic', batch: 'AMX-2406', expiry: shiftDate(160), quantity: 18, reorder: 20, cost: 6, price: 9 },
      { id: 'medicine-demo-3', name: 'Cetirizine 10 mg', category: 'Antihistamine', batch: 'CTZ-2412', expiry: shiftDate(300), quantity: 65, reorder: 15, cost: 2, price: 4 },
      { id: 'medicine-demo-4', name: 'Metformin 500 mg', category: 'Diabetes care', batch: 'MET-DEMO-04', expiry: shiftDate(260), quantity: 84, reorder: 20, cost: 2.5, price: 5 },
      { id: 'medicine-demo-5', name: 'ORS sachet', category: 'Hydration', batch: 'ORS-DEMO-05', expiry: shiftDate(320), quantity: 42, reorder: 12, cost: 8, price: 12 },
      { id: 'medicine-demo-6', name: 'Vitamin D3 60,000 IU', category: 'Supplement', batch: 'D3-DEMO-06', expiry: shiftDate(30), quantity: 8, reorder: 10, cost: 12, price: 18 }
    ],
    consumables: [
      { id: 'supply-demo-1', name: 'Examination gloves', category: 'PPE', brand: 'Demo supply', batch: 'GLV-DEMO-01', expiry: shiftDate(420), quantity: 160, reorder: 40, cost: 1.5, unit: 'pair', supplier: 'Demo supplier' },
      { id: 'supply-demo-2', name: '5 ml syringe', category: 'Injection supplies', brand: 'Demo supply', batch: 'SYR-DEMO-02', expiry: shiftDate(500), quantity: 35, reorder: 50, cost: 3, unit: 'piece', supplier: 'Demo supplier' },
      { id: 'supply-demo-3', name: 'Sterile gauze pads', category: 'Dressings', brand: 'Demo supply', batch: 'GAU-DEMO-03', expiry: shiftDate(380), quantity: 90, reorder: 25, cost: 2, unit: 'pack', supplier: 'Demo supplier' }
    ],
    clinicServices: [
      { id: 'service-demo-iv-injection', code: 'IV_INJECTION', name: 'IV Injection Charge', price: 50, active: true },
      { id: 'service-demo-iv-fluid', code: 'IV_FLUID_NURSING', name: 'IV Fluid Nursing Charge', price: 100, active: true },
      { id: 'service-demo-dressing', code: 'DRESSING', name: 'Dressing Charge', price: 100, active: true },
      { id: 'service-demo-catheter', code: 'CATHETER', name: 'Catheter Charge', price: 500, active: true },
      { id: 'service-demo-cbc', code: 'CBC', name: 'CBC', price: 20, active: true },
      { id: 'service-demo-bp', code: 'BP', name: 'BP', price: 20, active: true },
    ],
    consumableCategories: ['PPE', 'Injection supplies', 'Dressings'],
    inventoryMovements: [
      { id: 'movement-demo-med-1', kind: 'medicine', itemId: 'medicine-demo-4', type: 'RECEIVED', quantityDelta: 84, quantityBefore: 0, quantityAfter: 84, reason: 'Opening demo stock', createdAt: `${shiftDate(-20)}T09:00:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-med-2', kind: 'medicine', itemId: 'medicine-demo-4', type: 'DISPENSED', quantityDelta: -6, quantityBefore: 90, quantityAfter: 84, reason: 'Demo dispensing record', createdAt: `${shiftDate(-5)}T16:30:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-supply-1', kind: 'consumable', itemId: 'supply-demo-1', type: 'RECEIVED', quantityDelta: 160, quantityBefore: 0, quantityAfter: 160, reason: 'Opening demo stock', createdAt: `${shiftDate(-18)}T09:15:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-supply-2', kind: 'consumable', itemId: 'supply-demo-1', type: 'DISPENSED', quantityDelta: -12, quantityBefore: 172, quantityAfter: 160, reason: 'Demo clinic usage', createdAt: `${shiftDate(-3)}T17:20:00`, recordedBy: 'Demo inventory user' },
    ],
    suppliers: [],
    purchaseOrders: [],
    pharmacyOrders: [],
    appointments: [
      { id: 'appointment-demo-1', patientId: 'patient-demo-1', doctor: 'Dr. Meera Nair', department: 'Cardiology', date: dateKey(today), time: '09:30', reason: 'Blood pressure follow-up', status: 'Scheduled' },
      { id: 'appointment-demo-2', patientId: 'patient-demo-2', doctor: 'Dr. Anjali Menon', department: 'Orthopedics', date: dateKey(today), time: '10:15', reason: 'Knee pain review', status: 'Checked in' },
      { id: 'appointment-demo-3', patientId: 'patient-demo-3', doctor: 'Dr. Rohan Sethi', department: 'General medicine', date: shiftDate(1), time: '11:00', reason: 'General consultation', status: 'Scheduled' },
      { id: 'appointment-demo-4', patientId: 'patient-demo-4', doctor: 'Dr. Meera Nair', department: 'General medicine', date: dateKey(today), time: '11:30', reason: 'Diabetes follow-up', status: 'Scheduled' },
      { id: 'appointment-demo-5', patientId: 'patient-demo-5', doctor: 'Dr. Anjali Menon', department: 'Respiratory care', date: shiftDate(1), time: '16:15', reason: 'Asthma review', status: 'Scheduled' },
      { id: 'appointment-demo-6', patientId: 'patient-demo-6', doctor: 'Dr. Rohan Sethi', department: 'General medicine', date: shiftDate(-1), time: '17:00', reason: 'Blood pressure review', status: 'Completed' },
      { id: 'appointment-demo-7', patientId: 'patient-demo-7', doctor: 'Dr. Meera Nair', department: 'General medicine', date: shiftDate(2), time: '17:30', reason: 'General check-up', status: 'Scheduled' }
    ],
    queueTokens: [],
    invoices: [
      {
        id: 'invoice-demo-1',
        number: 'CSK-DEMO-0001',
        patientId: 'patient-demo-1',
        date: shiftDate(-2),
        subtotal: 850,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 850,
        paid: 850,
        paymentMethod: 'UPI',
        payments: [{ amount: 850, date: `${shiftDate(-2)}T18:35:00`, method: 'UPI', reference: 'DEMO-PAY-001', receiptNumber: 'CSK-DEMO-0001-R1' }],
        items: [{ name: 'Consultation', quantity: 1, price: 500, amount: 500 }, { name: 'Paracetamol 500 mg', quantity: 10, price: 3, amount: 30 }, { name: 'Basic blood panel', quantity: 1, price: 320, amount: 320 }],
        createdAt: `${shiftDate(-2)}T18:30:00`,
        template: 'professional',
        notes: 'Synthetic demo invoice',
      },
      {
        id: 'invoice-demo-2',
        number: 'CSK-DEMO-0002',
        patientId: 'patient-demo-4',
        date: shiftDate(-1),
        subtotal: 1200,
        discount: 100,
        taxRate: 0,
        taxAmount: 0,
        total: 1100,
        paid: 500,
        paymentMethod: 'Cash',
        payments: [{ amount: 500, date: `${shiftDate(-1)}T19:00:00`, method: 'Cash', reference: 'DEMO-PAY-002', receiptNumber: 'CSK-DEMO-0002-R1' }],
        items: [{ name: 'Consultation', quantity: 1, price: 500, amount: 500 }, { name: 'Diabetes review panel', quantity: 1, price: 700, amount: 700 }],
        createdAt: `${shiftDate(-1)}T18:50:00`,
        template: 'detailed',
        notes: 'Synthetic demo invoice · partial payment',
      },
      {
        id: 'invoice-demo-3',
        number: 'CSK-DEMO-0003',
        patientId: 'patient-demo-5',
        date: shiftDate(-3),
        subtotal: 650,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 650,
        paid: 0,
        paymentMethod: 'Cash',
        payments: [],
        items: [{ name: 'Consultation', quantity: 1, price: 500, amount: 500 }, { name: 'ORS sachet', quantity: 5, price: 12, amount: 60 }, { name: 'Respiratory assessment', quantity: 1, price: 90, amount: 90 }],
        createdAt: `${shiftDate(-3)}T17:15:00`,
        template: 'professional',
        notes: 'Synthetic demo invoice · unpaid',
      }
    ],
    patientDrafts: [],
    patientVitals: cloneDemoRecords(demoVitalReadings),
    patientRecords: [
      {
        id: 'visit-demo-1',
        patientId: 'patient-demo-1',
        encounterType: 'OPD',
        status: 'OPEN',
        visitDate: shiftDate(-12),
        doctorName: 'Dr. Meera Nair',
        symptoms: 'Occasional headache; home BP readings above target.',
        consultationNotes: 'Reviewed medication adherence and home readings.',
        diagnosis: 'Hypertension follow-up',
        bloodPressure: '146/92',
        pulseBpm: 78,
        temperatureC: 36.7,
        knownCase: 'Hypertension',
        prescriptions: 'Continue current treatment and monitor blood pressure.',
        tests: 'Renal function panel',
        followUpDate: shiftDate(18),
        followUpInstructions: 'Bring the home BP log to the next visit.',
        prescriptionItems: [{ id: 'prescription-demo-1', medicineId: 'medicine-demo-1', medicineName: 'Paracetamol 500 mg', dosage: '1 tablet', frequency: 'As needed', durationDays: 3, quantity: 6, billedQuantity: 2, instructions: 'After food' }],
        reports: [],
        createdAt: `${shiftDate(-12)}T18:00:00`,
      },
      {
        id: 'visit-demo-2',
        patientId: 'patient-demo-4',
        encounterType: 'IPD',
        status: 'CLOSED',
        visitDate: shiftDate(-35),
        doctorName: 'Dr. Rohan Sethi',
        symptoms: 'Fatigue and increased thirst.',
        consultationNotes: 'Observation, medication review, and diet counselling.',
        diagnosis: 'Type 2 diabetes with elevated glucose',
        bloodPressure: '132/84',
        pulseBpm: 82,
        temperatureC: 36.8,
        cbgMgDl: 238,
        weightKg: 72.4,
        heightCm: 162,
        bmi: 27.59,
        knownCase: 'Type 2 diabetes',
        prescriptions: 'Medication and lifestyle plan reviewed.',
        tests: 'Fasting glucose and HbA1c',
        admittedAt: `${shiftDate(-35)}T10:00:00`,
        dischargedAt: `${shiftDate(-34)}T15:00:00`,
        ward: 'Demo observation ward',
        bed: 'D-04',
        prescriptionItems: [],
        reports: [],
        createdAt: `${shiftDate(-35)}T10:00:00`,
      },
      {
        id: 'visit-demo-3',
        patientId: 'patient-demo-5',
        encounterType: 'OPD',
        status: 'OPEN',
        visitDate: shiftDate(-7),
        doctorName: 'Dr. Anjali Menon',
        symptoms: 'Intermittent wheeze during exercise.',
        consultationNotes: 'Reviewed symptom triggers and inhaler technique.',
        diagnosis: 'Mild asthma review',
        bloodPressure: '118/76',
        pulseBpm: 74,
        temperatureC: 36.6,
        spo2Percent: 98,
        knownCase: 'Mild asthma',
        prescriptions: 'Continue current inhaler plan.',
        tests: 'Peak flow monitoring',
        followUpDate: shiftDate(23),
        followUpInstructions: 'Return earlier if breathing symptoms worsen.',
        prescriptionItems: [],
        reports: [],
        createdAt: `${shiftDate(-7)}T17:10:00`,
      },
      {
        id: 'visit-demo-4',
        patientId: 'patient-demo-6',
        encounterType: 'OPD',
        status: 'OPEN',
        visitDate: shiftDate(-2),
        doctorName: 'Dr. Rohan Sethi',
        symptoms: 'Knee stiffness in the morning.',
        consultationNotes: 'Discussed gentle activity and symptom monitoring.',
        diagnosis: 'Osteoarthritis follow-up',
        bloodPressure: '138/86',
        pulseBpm: 76,
        knownCase: 'Hypertension and osteoarthritis',
        tests: 'No new investigations ordered.',
        prescriptionItems: [],
        reports: [],
        createdAt: `${shiftDate(-2)}T17:25:00`,
      }
    ].concat(cloneDemoRecords(demoVisitRecords)),
    patientHistoryRecords: cloneDemoRecords(demoPatientHistory),
    patientIntakes: [
      {
        id: 'intake-demo-1',
        patientId: 'patient-demo-1',
        visitDate: shiftDate(-12),
        tokenNumber: 4,
        doctorName: 'Dr. Meera Nair',
        enteredBy: 'Demo nurse',
        status: 'SUBMITTED',
        chiefComplaint: 'Headache and high home BP readings',
        onset: 'Intermittent for one week',
        symptoms: 'No chest pain or dizziness reported.',
        allergyStatus: 'CONFIRMED_NONE',
        medicationNotes: 'Medication list reviewed with patient.',
        bloodPressure: '146/92',
        pulseBpm: 78,
        temperatureC: 36.7,
        weightKg: 68.2,
        heightCm: 158,
        bmi: 27.32,
        nurseNotes: 'Synthetic demo intake record',
      },
      {
        id: 'intake-demo-2',
        patientId: 'patient-demo-5',
        visitDate: shiftDate(-7),
        tokenNumber: 2,
        doctorName: 'Dr. Anjali Menon',
        enteredBy: 'Demo nurse',
        status: 'SUBMITTED',
        chiefComplaint: 'Wheezing during exercise',
        onset: 'Several days',
        symptoms: 'Occasional dry cough after running.',
        allergyStatus: 'HAS_ALLERGIES',
        allergyDetails: 'Seasonal pollen allergy',
        medicationsReviewed: true,
        medicationNotes: 'Current inhaler noted.',
        bloodPressure: '118/76',
        pulseBpm: 74,
        spo2Percent: 98,
        nurseNotes: 'Synthetic demo intake record',
      },
      {
        id: 'intake-demo-3',
        patientId: 'patient-demo-6',
        visitDate: shiftDate(-2),
        tokenNumber: 6,
        doctorName: 'Dr. Rohan Sethi',
        enteredBy: 'Demo nurse',
        status: 'SUBMITTED',
        chiefComplaint: 'Morning knee stiffness',
        onset: 'Ongoing for two weeks',
        symptoms: 'No recent injury.',
        allergyStatus: 'NOT_CONFIRMED',
        bloodPressure: '138/86',
        pulseBpm: 76,
        weightKg: 64.5,
        nurseNotes: 'Synthetic demo intake record',
      }
    ],
    externalMedicalRecords: [
      {
        id: 'outside-demo-1',
        patientId: 'patient-demo-1',
        recordDate: shiftDate(-120),
        recordType: 'Lab report',
        doctorName: 'Dr. Demo Provider',
        facilityName: 'Example Diagnostic Centre',
        diagnosis: 'Routine renal function review',
        treatment: '',
        medications: '',
        investigations: 'Serum creatinine within reference range.',
        notes: 'Synthetic outside-provider record',
        fileName: '',
        fileDataUrl: '',
        mimeType: '',
        createdAt: `${shiftDate(-120)}T12:00:00`,
      },
      {
        id: 'outside-demo-2',
        patientId: 'patient-demo-5',
        recordDate: shiftDate(-90),
        recordType: 'Consultation',
        doctorName: 'Dr. Sample Clinician',
        facilityName: 'Example Family Clinic',
        diagnosis: 'Seasonal allergic rhinitis',
        treatment: 'Avoid known seasonal triggers.',
        medications: 'Antihistamine as needed.',
        investigations: '',
        notes: 'Synthetic outside-provider record',
        fileName: '',
        fileDataUrl: '',
        mimeType: '',
        createdAt: `${shiftDate(-90)}T12:00:00`,
      }
    ],
    settings: {
      clinicName: 'CSK CLINIC',
      phone: '093638 79235',
      email: '',
      address: 'Muthu Gounder Street, Veethi, Thammampatti, Tamil Nadu 636113',
      practitioner: 'Dr. C. Selvakumar, MBBS, MD',
      registration: '',
      taxId: '',
      invoiceFooter: 'General and Diabetes treatment offered here. Open daily: 6:00 PM–8:00 PM.',
      currency: 'INR',
      vitalReferenceRanges: []
    }
  });

  function mergeSeedRecords(existing, seeded) {
    const records = [...existing];
    const recordIds = new Set(records.map((record) => record?.id).filter(Boolean));
    seeded.forEach((record) => {
      if (record.id && !recordIds.has(record.id)) {
        records.push(record);
        recordIds.add(record.id);
      }
    });
    return records;
  }

  function mergeMissingDemoPatientDetails(existing, seeded) {
    const seededPatients = new Map(seeded.map((patient) => [patient.id, patient]));
    return existing.map((patient) => {
      const seed = seededPatients.get(patient?.id);
      if (!seed) return patient;
      const merged = { ...patient };
      Object.entries(seed).forEach(([key, value]) => {
        if ((merged[key] === undefined || merged[key] === '') && value !== undefined && value !== null && value !== '') {
          merged[key] = value;
        }
      });
      return merged;
    });
  }

  function mergeSeedPatientHistories(existing, seeded) {
    const records = [...existing];
    seeded.forEach((seed) => {
      const existingIndex = records.findIndex((record) => record?.patientId === seed.patientId);
      if (existingIndex < 0) {
        records.push(seed);
        return;
      }
      const current = records[existingIndex];
      const hasHistory = (current.medicalConditions || []).length
        || (current.familyHistoryMembers || []).length
        || Object.keys(current.personalHistory || {}).length
        || Object.keys(current.femaleHistory || {}).length;
      if (!hasHistory) {
        records[existingIndex] = {
          ...seed,
          ...current,
          id: current.id || seed.id,
          medicalConditions: seed.medicalConditions,
          familyHistoryMembers: seed.familyHistoryMembers,
          personalHistory: seed.personalHistory,
          femaleHistory: seed.femaleHistory,
        };
      }
    });
    return records;
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialData();
      const parsed = JSON.parse(saved);
      const defaults = initialData();
      const needsDemoSeed = Number(parsed.demoDataVersion || 0) < DEMO_DATA_VERSION;
      const records = (key) => {
        const existing = Array.isArray(parsed[key]) ? parsed[key] : [];
        return needsDemoSeed ? mergeSeedRecords(existing, defaults[key] || []) : existing;
      };
      const patients = records('patients');
      return {
        ...defaults,
        ...parsed,
        demoDataVersion: DEMO_DATA_VERSION,
        patients: needsDemoSeed ? mergeMissingDemoPatientDetails(patients, defaults.patients) : patients,
        patientIdSequenceOrdinal: highestPatientIdOrdinal(
          patients,
          parsed.patientIdSequenceOrdinal,
        ).toString(),
        medicines: records('medicines'),
        consumables: records('consumables'),
        clinicServices: records('clinicServices'),
        consumableCategories: [...new Set([
          ...(Array.isArray(parsed.consumableCategories) ? parsed.consumableCategories : []),
          ...(needsDemoSeed ? defaults.consumableCategories : []),
        ])],
        inventoryMovements: records('inventoryMovements'),
        appointments: records('appointments'),
        queueTokens: Array.isArray(parsed.queueTokens) ? parsed.queueTokens : [],
        invoices: records('invoices'),
        patientDrafts: Array.isArray(parsed.patientDrafts) ? parsed.patientDrafts : [],
        patientVitals: records('patientVitals'),
        patientRecords: records('patientRecords'),
        patientHistoryRecords: needsDemoSeed
          ? mergeSeedPatientHistories(Array.isArray(parsed.patientHistoryRecords) ? parsed.patientHistoryRecords : [], defaults.patientHistoryRecords)
          : records('patientHistoryRecords'),
        patientIntakes: records('patientIntakes'),
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
        pharmacyOrders: Array.isArray(parsed.pharmacyOrders) ? parsed.pharmacyOrders : [],
        externalMedicalRecords: records('externalMedicalRecords'),
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        invoices: records('invoices').map((invoice) => ({
          ...invoice,
          template: invoice.template || 'professional',
          payments: Array.isArray(invoice.payments) ? invoice.payments.map((payment) => typeof payment === 'number' ? { amount: payment, date: invoice.createdAt, method: 'Cash', reference: '' } : payment) : []
        }))
      };
    } catch (error) {
      console.error('Unable to load clinic records from browser storage.', error);
      return initialData();
    }
  }

  let data = loadData();
  let patientIdPreview = '';
  const patientVisitHistoryLoaded = new Set();
  let activePatientProfileTab = 'overview';
  let activePatientProfileId = '';
  let activePatientRecordsId = '';
  let activePatientHistory = null;
  let prescriptionWorkspaceRows = [];
  let pharmacyPosPrescription = null;
  let pharmacyPosPatientId = '';
  let pharmacyPosCart = [];
  let pharmacyPosPayment = 'Cash';
  let pharmacyPosDiscount = 0;
  let activePatientVitals = [];
  let activePatientVitalsRange = 'all';
  let activePatientVitalsChartType = 'line';
  let activeDoctorQueueTokenId = '';
  let activeDoctorWorkspaceTab = 'overview';
  let activeDoctorPatientHistory = null;
  let activeDoctorVitals = [];
  let activeDoctorVitalsChartType = 'line';
  let activeNurseQueueTokenId = '';
  let nursePrescriptionLoading = false;
  let nursePrescriptionError = '';
  let nurseEncounterOrders = [];
  const STANDARD_MEDICAL_CONDITIONS = [
    'Type 2 Diabetes Mellitus',
    'Hypertension',
    'Bronchial Asthma',
    'Coronary Artery Disease',
    'Chronic Kidney Disease',
    'Thyroid Disorder',
    'Sinusitis',
    'Migraine',
    'Allergic Rhinitis',
    'Malignancy',
    'Tuberculosis',
    'Fits / Seizures',
    'Stroke',
    'High Cholesterol',
  ];
  const STANDARD_FAMILY_CONDITIONS = [
    'Diabetes',
    'BP',
    'Heart Disease',
    'Asthma',
    'Thyroid',
    'Kidney Disease',
    'Cancer',
    'TB',
    'Stroke',
  ];
  const FAMILY_RELATIONSHIPS = [
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Husband',
    'Wife',
    'Son',
    'Daughter',
    'Grandfather',
    'Grandmother',
    'Other',
  ];
  let patientDirectoryPage = 1;
  let patientDashboardStats = null;
  let activeTimelineFilter = 'all';
  let activeTimelineFrom = '';
  let activeTimelineTo = '';
  const patientDirectoryPageSize = 10;
  const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: data.settings.currency || 'INR', maximumFractionDigits: 2 }).format(Number(amount) || 0);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const initials = (name) => String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  const patientAvatarMarkup = (patient, className = '') => patient.profilePhotoDataUrl
    ? `<img class="patient-avatar-photo ${className}" src="${escapeHtml(patient.profilePhotoDataUrl)}" alt="${escapeHtml(patient.name || 'Patient')} profile photo" />`
    : `<span class="patient-avatar ${className}">${escapeHtml(initials(patient.name))}</span>`;

  function getStoredApiToken() {
    try {
      return localStorage.getItem(API_TOKEN_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function getStoredApiUser() {
    try {
      const raw = localStorage.getItem(API_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function storeApiSession(token, user) {
    if (!token) {
      localStorage.removeItem(API_TOKEN_KEY);
      localStorage.removeItem(API_USER_KEY);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'CSK_DOCTOR_REALTIME_STOP' }, window.location.origin);
      }
      return;
    }
    localStorage.setItem(API_TOKEN_KEY, token);
    localStorage.setItem(API_USER_KEY, JSON.stringify(user || null));
    window.setTimeout(() => refreshDoctorRealtimeConfiguration(), 0);
  }

  function clearApiSession() {
    storeApiSession('', null);
    doctorQueueInitialized = false;
    knownDoctorQueueIds.clear();
    patientDashboardStats = null;
  }

  async function apiRequest(path, options = {}, requireAuth = true) {
    const send = async () => {
      const headers = { ...(options.headers || {}) };
      const token = getStoredApiToken();
      if (requireAuth && token) headers.Authorization = `Bearer ${token}`;
      if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    };

    let response = await send();
    if (response.status === 401 && requireAuth) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!refreshResponse.ok) throw new Error('Refresh failed');
        const refreshed = await refreshResponse.json();
        if (!refreshed.accessToken) throw new Error('Refresh failed');
        storeApiSession(refreshed.accessToken, refreshed.user || getStoredApiUser());
        response = await send();
      } catch {
        clearApiSession();
        throw new Error('Your clinic API session has expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        const errorBody = JSON.parse(body);
        message = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : errorBody.message || errorBody.error || body;
      } catch {
        message = body;
      }
      throw new Error(message || `Request failed (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return response.json();
    return response.text();
  }

  function normalizeApiPatient(item) {
    const nameParts = String(item.fullName || '').trim().split(/\s+/);
    return {
      id: item.id,
      code: item.patientCode || '',
      name: item.fullName || 'Unknown patient',
      firstName: nameParts.shift() || '',
      lastName: nameParts.join(' '),
      phone: item.mobile || '',
      dob: item.dateOfBirth ? String(item.dateOfBirth).slice(0, 10) : '',
      gender: item.gender ? String(item.gender).replace(/_/g, ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase()) : 'Unspecified',
      email: item.email || '',
      bloodGroup: item.bloodGroup || '',
      address: item.address || '',
      city: item.city || '',
      state: item.state || '',
      postalCode: item.postalCode || '',
      relationToAccount: item.relationToAccount || '',
      emergencyContact: item.emergencyContact || '',
      emergencyContactName: item.emergencyContactName || '',
      emergencyContactRelationship: item.emergencyContactRelationship || '',
      emergencyPhone: item.emergencyPhone || '',
      occupation: item.occupation || '',
      maritalStatus: item.maritalStatus || '',
      preferredLanguage: item.preferredLanguage || '',
      insuranceProvider: item.insuranceProvider || '',
      insuranceNumber: item.insuranceNumber || '',
      insuranceSumInsured: item.insuranceSumInsured === null || item.insuranceSumInsured === undefined
        ? ''
        : Number(item.insuranceSumInsured),
      profilePhotoDataUrl: item.profilePhotoDataUrl || '',
      lastVisit: item.encounters?.[0]?.visitDate ? String(item.encounters[0].visitDate).slice(0, 10) : '',
      notes: item.allergies || '',
      allergies: item.allergies || '',
      medicalHistory: item.medicalHistory || '',
      surgicalHistory: item.surgicalHistory || '',
      familyHistory: item.familyHistory || '',
      currentMedications: item.currentMedications || '',
      status: item.status === 'INACTIVE' ? 'Inactive' : 'Active',
      createdAt: item.createdAt || new Date().toISOString(),
      registeredBy: item.registeredBy?.email || '',
    };
  }

  function normalizeApiPatientDraft(item) {
    const payload = item.payload || {};
    return {
      id: item.id,
      name: payload.fullName || '',
      phone: payload.mobile || '',
      dob: payload.dateOfBirth ? String(payload.dateOfBirth).slice(0, 10) : '',
      gender: payload.gender ? String(payload.gender).replace(/_/g, ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase()) : '',
      email: payload.email || '',
      bloodGroup: payload.bloodGroup || '',
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      postalCode: payload.postalCode || '',
      relationToAccount: payload.relationToAccount || '',
      emergencyContact: payload.emergencyContact || '',
      emergencyContactName: payload.emergencyContactName || '',
      emergencyContactRelationship: payload.emergencyContactRelationship || '',
      emergencyPhone: payload.emergencyPhone || '',
      occupation: payload.occupation || '',
      maritalStatus: payload.maritalStatus || '',
      preferredLanguage: payload.preferredLanguage || '',
      insuranceProvider: payload.insuranceProvider || '',
      insuranceNumber: payload.insuranceNumber || '',
      insuranceSumInsured: payload.insuranceSumInsured ?? '',
      profilePhotoDataUrl: payload.profilePhotoDataUrl || '',
      notes: payload.allergies || '',
      allergies: payload.allergies || '',
      medicalHistory: payload.medicalHistory || '',
      surgicalHistory: payload.surgicalHistory || '',
      familyHistory: payload.familyHistory || '',
      currentMedications: payload.currentMedications || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    };
  }

  function normalizeApiMedicine(item) {
    return {
      id: item.id,
      name: item.name || 'Unnamed medicine',
      category: item.category || '',
      brand: item.brand || '',
      manufacturer: item.manufacturer || '',
      productSize: item.productSize || '',
      supplier: item.supplier || '',
      batch: item.batchNumber || '',
      expiry: item.expiresAt ? String(item.expiresAt).slice(0, 10) : '',
      quantity: Number(item.quantity || 0),
      reorder: Number(item.reorderLevel || 0),
      cost: Number(item.purchasePrice || 0),
      price: Number(item.sellingPrice || 0),
      active: item.active !== false,
      status: item.lowStock || Number(item.quantity || 0) <= Number(item.reorderLevel || 0) ? 'Low stock' : 'Healthy',
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  function normalizeApiSupplier(item) {
    return {
      id: item.id,
      name: item.name || '',
      contactName: item.contactName || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      taxId: item.taxId || '',
      active: item.active !== false,
      orderCount: Number(item._count?.purchaseOrders || 0),
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  function normalizeApiPurchaseOrder(item) {
    return {
      id: item.id,
      orderNumber: item.orderNumber || 'PO-NA',
      supplierId: item.supplierId,
      supplier: item.supplier || null,
      status: item.status || 'ORDERED',
      expectedAt: item.expectedAt ? String(item.expectedAt).slice(0, 10) : '',
      notes: item.notes || '',
      subtotal: Number(item.subtotal || 0),
      createdAt: item.createdAt || new Date().toISOString(),
      items: (item.items || []).map((line) => ({
        id: line.id,
        medicineId: line.medicineId,
        medicine: line.medicine || null,
        orderedQuantity: Number(line.orderedQuantity || 0),
        receivedQuantity: Number(line.receivedQuantity || 0),
        unitCost: Number(line.unitCost || 0),
        lineTotal: Number(line.lineTotal || 0),
      })),
      receipts: (item.receipts || []).map((receipt) => ({
        id: receipt.id,
        receivedAt: receipt.receivedAt || '',
        supplierDocumentNumber: receipt.supplierDocumentNumber || '',
        notes: receipt.notes || '',
        items: (receipt.items || []).map((line) => ({
          quantity: Number(line.quantity || 0),
          unitCost: Number(line.unitCost || 0),
        })),
      })),
    };
  }

  function normalizeApiPharmacyOrder(item) {
    return {
      id: item.id,
      orderNumber: item.orderNumber || 'PH-NA',
      patientId: item.patientId || item.patient?.id || '',
      channel: item.channel || 'OTHER',
      status: item.status || 'RECEIVED',
      notes: item.notes || '',
      total: Number(item.total || 0),
      invoiceId: item.invoiceId || '',
      createdAt: item.createdAt || new Date().toISOString(),
      items: (item.items || []).map((line) => ({
        id: line.id,
        medicineId: line.medicineId,
        medicineName: line.medicine?.name || line.medicineName || 'Medicine',
        medicine: line.medicine || null,
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
        lineTotal: Number(line.lineTotal || 0),
      })),
    };
  }

  function normalizeApiConsumable(item) {
    return {
      id: item.id,
      name: item.name || 'Unnamed supply',
      categoryId: item.categoryId || '',
      category: item.category?.name || '',
      brand: item.brand || '',
      manufacturer: item.manufacturer || '',
      productSize: item.productSize || '',
      unit: item.unit || 'unit',
      batch: item.batchNumber || '',
      expiry: item.expiresAt ? String(item.expiresAt).slice(0, 10) : '',
      quantity: Number(item.quantity || 0),
      reorder: Number(item.reorderLevel || 0),
      cost: Number(item.purchasePrice || 0),
      price: Number(item.sellingPrice || 0),
      supplier: item.supplier || '',
      storage: item.storageInstructions || '',
      active: item.active !== false,
    };
  }

  function normalizeApiAppointment(item) {
    const slot = item.slot || {};
    const startsAt = slot.startsAt || item.startsAt || new Date().toISOString();
    const date = typeof startsAt === 'string' ? startsAt.slice(0, 10) : new Date(startsAt).toISOString().slice(0, 10);
    const time = typeof startsAt === 'string' ? startsAt.slice(11, 16) : new Date(startsAt).toTimeString().slice(0, 5);
    const statusMap = {
      BOOKED: 'Scheduled',
      CHECKED_IN: 'Checked in',
      IN_PROGRESS: 'In progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No show',
    };
    return {
      id: item.id,
      patientId: item.patient?.id || item.patientId || '',
      doctorId: item.doctor?.id || item.doctorId || '',
      doctor: item.doctor?.email || 'Doctor',
      department: 'General medicine',
      date,
      time,
      reason: item.reason || 'Consultation',
      status: statusMap[item.status] || 'Scheduled',
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  function normalizeApiQueueToken(item) {
    const patient = item.patient || {};
    return {
      id: item.id,
      patientId: patient.id || item.patientId || '',
      patientName: patient.fullName || '',
      patientCode: patient.patientCode || '',
      patientDateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '',
      patientGender: patient.gender || '',
      patientRegisteredAt: patient.createdAt || '',
      patientRegisteredBy: patient.registeredBy?.email || '',
      doctorId: item.doctor?.id || item.doctorId || '',
      doctor: item.doctor?.email || 'Doctor',
      assignedBy: item.createdBy?.email || '',
      assignmentAt: item.createdAt || '',
      department: item.department || '',
      patientType: item.patientType || 'EXISTING',
      appointmentStartsAt: item.appointment?.slot?.startsAt || '',
      tokenNumber: Number(item.tokenNumber || 0),
      queueDate: item.queueDate ? String(item.queueDate).slice(0, 10) : '',
      priority: item.priority || 'NORMAL',
      status: item.status || 'WAITING',
      reason: item.reason || '',
      encounterType: item.encounter?.encounterType || 'OPD',
      encounterId: item.encounter?.id || '',
      appointmentId: item.appointmentId || '',
    };
  }

  function normalizeApiInvoice(item) {
    const payments = Array.isArray(item.payments) ? item.payments : [];
    const paymentTotal = Number(item.paid ?? payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const date = item.invoiceDate ? String(item.invoiceDate).slice(0, 10) : (item.createdAt ? String(item.createdAt).slice(0, 10) : dateKey(today));
    const paymentMethodNames = {
      CASH: 'Cash',
      UPI: 'UPI',
      CARD: 'Card',
      BANK_TRANSFER: 'Bank transfer',
      INSURANCE: 'Insurance',
      OTHER: 'Other',
    };
    return {
      id: item.id,
      number: item.invoiceNumber || 'INV-NA',
      patientId: item.patientId,
      date,
      subtotal: Number(item.subtotal || 0),
      discount: Number(item.discount || 0),
      taxRate: Number(item.taxRate || 0),
      taxAmount: Number(item.taxAmount || 0),
      total: Number(item.total || 0),
      encounterId: item.encounterId || null,
      paid: paymentTotal,
      paymentMethod: paymentMethodNames[payments[0]?.method] || payments[0]?.method || 'Cash',
      items: (item.items || []).map((line) => ({
        medicineId: line.medicineId || null,
        serviceId: line.serviceId || null,
        prescriptionItemId: line.prescriptionItemId || null,
        prescriptionMedicationId: line.prescriptionMedicationId || null,
        nursingOrderId: line.nursingOrderId || null,
        prescriptionDosage: line.prescriptionDosage || '',
        prescriptionFrequency: line.prescriptionFrequency || '',
        prescriptionDurationDays: line.prescriptionDurationDays || null,
        prescriptionInstructions: line.prescriptionInstructions || '',
        name: line.name || '',
        batch: line.batchNumber || '',
        expiry: line.expiresAt ? String(line.expiresAt).slice(0, 10) : '',
        quantity: Number(line.quantity || 0),
        price: Number(line.unitPrice || 0),
        amount: Number(line.lineTotal || 0),
      })),
      payments: payments.map((payment) => ({
        amount: Number(payment.amount || 0),
        date: payment.paidAt || payment.date || date,
        method: paymentMethodNames[payment.method] || payment.method || 'Cash',
        reference: payment.reference || payment.receiptNumber || '',
        receiptNumber: payment.receiptNumber || `${item.invoiceNumber || 'INV'}-R${payments.indexOf(payment) + 1}`,
      })),
      status: item.status || '',
      voidedAt: item.voidedAt || '',
      voidReason: item.voidReason || '',
      createdAt: item.createdAt || new Date().toISOString(),
      template: String(item.template || 'professional').toLowerCase(),
      notes: item.notes || '',
    };
  }

  function normalizeApiClinicService(service) {
    return {
      id: service.id,
      code: service.code,
      name: service.name,
      price: Number(service.price || 0),
      active: Boolean(service.active),
    };
  }

  async function apiListAll(path) {
    const separator = path.includes('?') ? '&' : '?';
    const firstPage = await apiRequest(`${path}${separator}page=1&limit=100`);
    if (!Array.isArray(firstPage.items)) {
      throw new Error(`The clinic API returned an invalid list for ${path}.`);
    }
    const items = [...firstPage.items];
    for (let page = 2; page <= Number(firstPage.totalPages || 1); page += 1) {
      const result = await apiRequest(`${path}${separator}page=${page}&limit=100`);
      if (!Array.isArray(result.items)) {
        throw new Error(`The clinic API returned an invalid page for ${path}.`);
      }
      items.push(...result.items);
    }
    return items;
  }

  async function hydrateFromApi() {
    const token = getStoredApiToken();
    if (!token) return false;

    try {
      const draftRequest = canManagePatientData() ? apiRequest('/patients/drafts') : Promise.resolve([]);
      const currentRole = getStoredApiUser()?.role;
      const canReadAppointments = currentRole !== 'PHARMACIST';
      const appointmentsRequest = canReadAppointments ? apiListAll('/appointments') : Promise.resolve([]);
      const queueRequest = canReadAppointments ? apiRequest('/appointments/queue') : Promise.resolve([]);
      const settingsRequest = currentRole === 'PHARMACIST'
        ? Promise.resolve({})
        : apiRequest('/clinic/settings');
      const inventoryReaderRoles = ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PHARMACIST', 'ACCOUNTANT'];
      const canReadConsumables = inventoryReaderRoles.includes(getStoredApiUser()?.role);
      const consumablesRequest = canReadConsumables
        ? Promise.all([apiListAll('/consumables?active=true'), apiRequest('/consumables/categories')])
        : Promise.resolve([[], []]);
      const clinicServicesRequest = canCreateInvoices()
        ? apiRequest('/billing/services')
        : Promise.resolve([]);
      const procurementReaderRoles = ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'PHARMACIST', 'ACCOUNTANT'];
      const canReadProcurement = procurementReaderRoles.includes(getStoredApiUser()?.role);
      const procurementResultsRequest = canReadProcurement
        ? Promise.all([
            apiRequest('/procurement/suppliers'),
            apiRequest('/procurement/purchase-orders'),
            apiRequest('/pharmacy/orders'),
          ])
        : Promise.resolve([[], [], []]);
      const [patientsResult, medicinesResult, appointmentsResult, queueResult, invoicesResult, settingsResult, draftsResult, consumableResults, clinicServicesResult, dashboardStatsResult, procurementResults] = await Promise.all([
        apiListAll('/patients'),
        apiListAll('/medicines?active=true'),
        appointmentsRequest,
        queueRequest,
        apiListAll('/billing/invoices'),
        settingsRequest,
        draftRequest,
        consumablesRequest,
        clinicServicesRequest,
        apiRequest(`/patients/dashboard-stats?date=${encodeURIComponent(dateKey(today))}`),
        procurementResultsRequest,
      ]);

      const nextPatients = patientsResult.map(normalizeApiPatient);
      patientDashboardStats = dashboardStatsResult;
      const nextMedicines = medicinesResult.map(normalizeApiMedicine);
      const [consumablesResult, categoriesResult] = consumableResults;
      const nextAppointments = appointmentsResult.map(normalizeApiAppointment);
      const nextInvoices = invoicesResult.map(normalizeApiInvoice);
      const [supplierResults, purchaseOrderResults, pharmacyOrderResults] = procurementResults;
      data = {
        ...initialData(),
        patients: nextPatients,
        patientDrafts: Array.isArray(draftsResult) ? draftsResult.map(normalizeApiPatientDraft) : [],
        medicines: nextMedicines,
        consumables: consumablesResult.map(normalizeApiConsumable),
        clinicServices: clinicServicesResult.map(normalizeApiClinicService),
        consumableCategories: categoriesResult.map((category) => category.name),
        appointments: nextAppointments,
        queueTokens: queueResult.map(normalizeApiQueueToken),
        patientVitals: [],
        patientRecords: [],
        patientHistoryRecords: [],
        patientIntakes: [],
        externalMedicalRecords: [],
        invoices: nextInvoices,
        suppliers: supplierResults.map(normalizeApiSupplier),
        purchaseOrders: purchaseOrderResults.map(normalizeApiPurchaseOrder),
        pharmacyOrders: pharmacyOrderResults.map(normalizeApiPharmacyOrder),
        settings: {
          ...initialData().settings,
          clinicName: settingsResult.name || 'CSK Clinic',
          phone: settingsResult.phone || '',
          email: settingsResult.email || '',
          address: settingsResult.address || '',
          practitioner: settingsResult.practitionerName || '',
          registration: settingsResult.registrationNumber || '',
          taxId: settingsResult.taxId || '',
          currency: settingsResult.currency || 'INR',
          invoiceFooter: settingsResult.invoiceFooter || '',
          vitalReferenceRanges: Array.isArray(settingsResult.vitalReferenceRanges)
            ? settingsResult.vitalReferenceRanges
            : [],
        },
      };
      patientVisitHistoryLoaded.clear();
      save();
      return true;
    } catch (error) {
      patientDashboardStats = null;
      console.warn('Failed to load live clinic data.', error);
      showToast(error.message || 'Unable to load records from the clinic API.');
      return false;
    }
  }

  function isApiConnected() {
    return !!getStoredApiToken();
  }

  function canManagePatientData() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'NURSE'].includes(getStoredApiUser()?.role);
  }

  function canManageClinicSettings() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN'].includes(getStoredApiUser()?.role);
  }

  function patientFullNameFromFields(fields) {
    const firstName = String(fields.get('firstName') || '').trim();
    const lastName = String(fields.get('lastName') || '').trim();
    return [firstName, lastName].filter(Boolean).join(' ') || String(fields.get('name') || '').trim();
  }

  function emergencyContactSummary(fields) {
    const details = [
      fields.get('emergencyContactName'),
      fields.get('emergencyContactRelationship'),
      fields.get('emergencyPhone'),
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return details.length ? details.join(' · ') : String(fields.get('emergencyContact') || '').trim();
  }

  function apiPatientPayload(fields) {
    const genderValue = String(fields.get('gender') || 'Unspecified').toUpperCase();
    const email = String(fields.get('email') || '').trim();
    return {
      fullName: patientFullNameFromFields(fields),
      mobile: String(fields.get('phone') || '').trim(),
      dateOfBirth: fields.get('dob') ? String(fields.get('dob')) : null,
      gender: ['FEMALE', 'MALE', 'OTHER'].includes(genderValue) ? genderValue : 'UNSPECIFIED',
      email: email || null,
      bloodGroup: String(fields.get('bloodGroup') || '').trim(),
      address: String(fields.get('address') || '').trim(),
      city: String(fields.get('city') || '').trim(),
      state: String(fields.get('state') || '').trim(),
      postalCode: String(fields.get('postalCode') || '').trim(),
      relationToAccount: String(fields.get('relationToAccount') || '').trim(),
      allergies: String(fields.get('notes') || '').trim(),
      emergencyContact: emergencyContactSummary(fields),
      emergencyContactName: String(fields.get('emergencyContactName') || '').trim(),
      emergencyContactRelationship: String(fields.get('emergencyContactRelationship') || '').trim(),
      emergencyPhone: String(fields.get('emergencyPhone') || '').trim() || null,
      occupation: String(fields.get('occupation') || '').trim(),
      maritalStatus: String(fields.get('maritalStatus') || '').trim(),
      preferredLanguage: String(fields.get('preferredLanguage') || '').trim(),
      insuranceProvider: String(fields.get('insuranceProvider') || '').trim(),
      insuranceNumber: String(fields.get('insuranceNumber') || '').trim(),
      insuranceSumInsured: fields.get('insuranceSumInsured') ? Number(fields.get('insuranceSumInsured')) : null,
      profilePhotoDataUrl: String(fields.get('profilePhotoDataUrl') || '') || null,
      medicalHistory: String(fields.get('medicalHistory') || '').trim(),
      surgicalHistory: String(fields.get('surgicalHistory') || '').trim(),
      familyHistory: String(fields.get('familyHistory') || '').trim(),
      currentMedications: String(fields.get('currentMedications') || '').trim(),
    };
  }

  function apiPatientDraftPayload(fields) {
    const genderValue = String(fields.get('gender') || '').toUpperCase();
    const values = {
      fullName: patientFullNameFromFields(fields),
      mobile: String(fields.get('phone') || '').trim(),
      dateOfBirth: String(fields.get('dob') || ''),
      gender: ['FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'].includes(genderValue) ? genderValue : '',
      email: String(fields.get('email') || '').trim(),
      bloodGroup: String(fields.get('bloodGroup') || '').trim(),
      address: String(fields.get('address') || '').trim(),
      city: String(fields.get('city') || '').trim(),
      state: String(fields.get('state') || '').trim(),
      postalCode: String(fields.get('postalCode') || '').trim(),
      relationToAccount: String(fields.get('relationToAccount') || '').trim(),
      emergencyContact: emergencyContactSummary(fields),
      emergencyContactName: String(fields.get('emergencyContactName') || '').trim(),
      emergencyContactRelationship: String(fields.get('emergencyContactRelationship') || '').trim(),
      emergencyPhone: String(fields.get('emergencyPhone') || '').trim(),
      occupation: String(fields.get('occupation') || '').trim(),
      maritalStatus: String(fields.get('maritalStatus') || '').trim(),
      preferredLanguage: String(fields.get('preferredLanguage') || '').trim(),
      insuranceProvider: String(fields.get('insuranceProvider') || '').trim(),
      insuranceNumber: String(fields.get('insuranceNumber') || '').trim(),
      insuranceSumInsured: String(fields.get('insuranceSumInsured') || ''),
      profilePhotoDataUrl: String(fields.get('profilePhotoDataUrl') || ''),
      allergies: String(fields.get('notes') || '').trim(),
      medicalHistory: String(fields.get('medicalHistory') || '').trim(),
      surgicalHistory: String(fields.get('surgicalHistory') || '').trim(),
      familyHistory: String(fields.get('familyHistory') || '').trim(),
      currentMedications: String(fields.get('currentMedications') || '').trim(),
    };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
  }

  function apiMedicinePayload(fields) {
    return {
      name: String(fields.get('name') || '').trim(),
      category: String(fields.get('category') || '').trim(),
      brand: String(fields.get('brand') || '').trim(),
      manufacturer: String(fields.get('manufacturer') || '').trim(),
      productSize: String(fields.get('productSize') || '').trim(),
      supplier: String(fields.get('supplier') || '').trim(),
      batchNumber: String(fields.get('batch') || '').trim(),
      ...(fields.get('expiry') ? { expiresAt: String(fields.get('expiry')) } : {}),
      quantity: Math.max(0, Number(fields.get('quantity')) || 0),
      reorderLevel: Math.max(0, Number(fields.get('reorder')) || 0),
      purchasePrice: Math.max(0, Number(fields.get('cost')) || 0),
      sellingPrice: Math.max(0, Number(fields.get('price')) || 0),
    };
  }

  function apiPaymentMethod(value) {
    const methods = {
      'Bank transfer': 'BANK_TRANSFER',
    };
    const normalized = String(value || 'Cash').toUpperCase();
    return methods[value] || (['CASH', 'UPI', 'CARD', 'INSURANCE', 'OTHER'].includes(normalized) ? normalized : 'OTHER');
  }

  async function refreshLiveData() {
    if (!isApiConnected()) return;
    await hydrateFromApi();
    renderAll();
  }

  function setDoctorRealtimeStatus(status) {
    doctorRealtimeConnected = status === 'connected';
    const label = document.getElementById('doctorRealtimeStatus');
    if (label) {
      label.textContent = doctorRealtimeConnected
        ? 'Live updates'
        : status === 'unavailable'
          ? 'Auto-refresh · Realtime not configured'
          : status === 'disconnected'
            ? 'Reconnecting · Auto-refresh enabled'
            : 'Connecting to live updates…';
    }
    if (doctorRealtimeConnected) {
      if (doctorQueuePollingTimer !== null) window.clearInterval(doctorQueuePollingTimer);
      doctorQueuePollingTimer = null;
    } else {
      startDoctorQueuePolling();
    }
  }

  async function refreshDoctorRealtimeConfiguration() {
    const user = getStoredApiUser();
    if (
      window.parent === window ||
      user?.role !== 'DOCTOR' ||
      !isApiConnected()
    ) return;
    try {
      const config = await apiRequest('/appointments/realtime');
      window.parent.postMessage({
        type: 'CSK_DOCTOR_REALTIME_CONFIG',
        config,
        userId: user.id,
      }, window.location.origin);
    } catch (error) {
      const unavailable = String(error?.message || '').includes('not configured');
      window.parent.postMessage({
        type: 'CSK_REALTIME_STATUS',
        status: unavailable ? 'unavailable' : 'disconnected',
      }, window.location.origin);
      console.warn('Doctor queue Realtime configuration could not be loaded.', error);
    }
  }

  async function refreshDoctorWorkspaceFromApi() {
    if (doctorQueueRefreshInFlight) {
      doctorQueueRefreshPending = true;
      return;
    }
    if (
      !isApiConnected() ||
      !canAccessDoctorWorkspace() ||
      !document.getElementById('doctor')?.classList.contains('active')
    ) return;
    doctorQueueRefreshInFlight = true;
    try {
      const queue = await apiRequest('/appointments/queue');
      if (!Array.isArray(queue)) throw new Error('The clinic API returned an invalid doctor queue.');
      const normalized = queue.map(normalizeApiQueueToken);
      if (doctorQueueInitialized) {
        normalized.forEach((entry) => {
          if (!knownDoctorQueueIds.has(entry.id) && entry.status === 'WAITING') {
            showDoctorAssignmentNotification(entry);
          }
        });
      } else {
        doctorQueueInitialized = true;
      }
      knownDoctorQueueIds.clear();
      normalized.forEach((entry) => knownDoctorQueueIds.add(entry.id));
      data.queueTokens = normalized;
      renderDoctorWorkspace();
      await refreshDoctorDashboard();
    } catch (error) {
      console.warn('Automatic doctor queue synchronization failed.', error);
    } finally {
      doctorQueueRefreshInFlight = false;
      if (doctorQueueRefreshPending) {
        doctorQueueRefreshPending = false;
        void refreshDoctorWorkspaceFromApi();
      }
    }
  }

  async function refreshDoctorDashboard() {
    if (!document.getElementById('doctor')?.classList.contains('active')) return;
    if (!isApiConnected()) {
      renderLocalDoctorDashboard();
      return;
    }
    if (doctorDashboardRefreshInFlight) return;
    doctorDashboardRefreshInFlight = true;
    try {
      const dashboard = await apiRequest('/appointments/dashboard');
      renderDoctorDashboard(dashboard);
    } catch (error) {
      console.warn('Doctor dashboard statistics could not be refreshed.', error);
    } finally {
      doctorDashboardRefreshInFlight = false;
    }
  }

  function renderLocalDoctorDashboard() {
    const entries = getDoctorQueueEntries();
    const todayEntries = entries.filter((entry) => (entry.queueDate || dateKey(today)) === dateKey(today));
    const waiting = todayEntries.filter((entry) => ['WAITING', 'CALLED'].includes(entry.status)).length;
    const inConsultation = todayEntries.filter((entry) => entry.status === 'IN_CONSULTATION').length;
    const completed = todayEntries.filter((entry) => entry.status === 'COMPLETED').length;
    const cancelled = todayEntries.filter((entry) => entry.status === 'CANCELLED').length;
    const noShow = todayEntries.filter((entry) => entry.status === 'NO_SHOW').length;
    const hourlyArrivals = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: todayEntries.filter((entry) =>
        Number(String(entry.assignmentAt || '').slice(11, 13) || 0) === hour
      ).length,
    }));
    const statusDistribution = ['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
      .map((status) => ({
        status,
        count: todayEntries.filter((entry) => entry.status === status).length,
      }));
    const dailyStats = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - index));
      const key = dateKey(date);
      const statsEntries = entries.filter((entry) => (entry.queueDate || key) === key);
      return {
        date: key,
        assigned: statsEntries.length,
        completed: statsEntries.filter((entry) => entry.status === 'COMPLETED').length,
      };
    });
    renderDoctorDashboard({
      counts: {
        assigned: todayEntries.length,
        waiting,
        inConsultation,
        completed,
        cancelled,
        noShow,
        pending: waiting + inConsultation,
      },
      waiting: {
        averageMinutes: 0,
        longest: null,
        over15Minutes: 0,
        over30Minutes: 0,
        over60Minutes: 0,
      },
      averageConsultationMinutes: 0,
      hourlyArrivals,
      statusDistribution,
      dailyStats,
      weeklyStats: Array.from({ length: 4 }, (_, index) => ({
        week: shiftDate(-((3 - index) * 7)),
        assigned: 0,
        completed: 0,
      })),
      monthlyStats: Array.from({ length: 6 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
        return {
          month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          assigned: 0,
          completed: 0,
        };
      }),
    });
  }

  function showDoctorAssignmentNotification(entry) {
    const host = document.getElementById('doctorRealtimeNotifications');
    if (!host) return;
    const patient = patientById(entry.patientId);
    const patientName = patient?.name || entry.patientName || 'New patient';
    const patientCode = patient?.code || entry.patientCode || 'ID unavailable';
    const assignedAt = entry.assignmentAt
      ? new Date(entry.assignmentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Just now';
    const toast = document.createElement('article');
    toast.className = 'doctor-realtime-toast';
    const title = document.createElement('b');
    title.className = 'doctor-realtime-toast-title';
    title.textContent = 'New Patient Assigned';
    const message = document.createElement('span');
    message.className = 'doctor-realtime-toast-message';
    const assignedBy = entry.assignedBy ? ` · Assigned by ${entry.assignedBy}` : '';
    message.textContent = `${patientName} · ${patientCode} · ${assignedAt}${assignedBy} · Waiting for consultation`;
    const close = document.createElement('button');
    close.className = 'doctor-realtime-toast-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => toast.remove());
    toast.append(title, close, message);
    host.append(toast);
    window.setTimeout(() => toast.remove(), 6500);
  }

  function doctorDashboardBarMarkup(items, labelFor, valueFor, maxValue) {
    return items.map((item) => {
      const value = Number(valueFor(item) || 0);
      const height = Math.max(value > 0 ? 8 : 2, Math.min(100, Math.round((value / maxValue) * 100)));
      return `<div class="doctor-chart-column" title="${escapeHtml(`${labelFor(item)}: ${value}`)}">
        <span class="doctor-chart-value">${value || ''}</span>
        <span class="doctor-chart-track"><i class="doctor-chart-bar" style="height:${height}%"></i></span>
        <small class="doctor-chart-label">${escapeHtml(labelFor(item))}</small>
      </div>`;
    }).join('');
  }

  function doctorDashboardTrendMarkup(items, labelFor) {
    const maximum = Math.max(1, ...items.flatMap((item) => [
      Number(item.assigned || 0),
      Number(item.completed || 0),
    ]));
    return items.map((item) => {
      const assigned = Number(item.assigned || 0);
      const completed = Number(item.completed || 0);
      const assignedHeight = Math.max(assigned > 0 ? 8 : 2, Math.min(100, Math.round((assigned / maximum) * 100)));
      const completedHeight = Math.max(completed > 0 ? 8 : 2, Math.min(100, Math.round((completed / maximum) * 100)));
      const label = labelFor(item);
      return `<div class="doctor-trend-column" title="${escapeHtml(`${label}: ${assigned} assigned, ${completed} completed`)}">
        <span class="doctor-chart-value">${assigned}/${completed}</span>
        <span class="doctor-trend-bars"><i class="doctor-trend-bar" style="height:${assignedHeight}%"></i><i class="doctor-trend-bar doctor-trend-completed" style="height:${completedHeight}%"></i></span>
        <small class="doctor-chart-label">${escapeHtml(label)}</small>
      </div>`;
    }).join('');
  }

  function renderDoctorDashboard(dashboard) {
    if (!dashboard || typeof dashboard !== 'object') return;
    const counts = dashboard.counts || {};
    const values = {
      doctorKpiAssigned: counts.assigned,
      doctorKpiWaiting: counts.waiting,
      doctorKpiConsulting: counts.inConsultation,
      doctorKpiCompleted: counts.completed,
      doctorKpiCancelled: counts.cancelled,
      doctorKpiNoShow: counts.noShow,
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(Number(value || 0));
    });
    const waiting = dashboard.waiting || {};
    const longest = waiting.longest;
    document.getElementById('doctorAverageWait').textContent = `${Number(waiting.averageMinutes || 0)} min avg`;
    document.getElementById('doctorLongestWait').textContent = longest
      ? `${longest.patientName} · ${longest.minutes} min`
      : '—';
    document.getElementById('doctorWait15').textContent = String(Number(waiting.over15Minutes || 0));
    document.getElementById('doctorWait30').textContent = String(Number(waiting.over30Minutes || 0));
    document.getElementById('doctorWait60').textContent = String(Number(waiting.over60Minutes || 0));
    document.getElementById('doctorConsultationDuration').textContent =
      `${Number(dashboard.averageConsultationMinutes || 0)} min avg consultation`;
    document.getElementById('doctorPendingConsultations').textContent =
      `${Number(counts.pending || 0)} pending`;
    document.getElementById('doctorDashboardScope').textContent =
      Array.isArray(dashboard.teamWorkload) ? 'Clinic-wide' : 'Your queue';
    document.getElementById('doctorDashboardUpdated').textContent =
      `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const hourly = Array.isArray(dashboard.hourlyArrivals) ? dashboard.hourlyArrivals : [];
    const maxHourly = Math.max(1, ...hourly.map((item) => Number(item.count || 0)));
    document.getElementById('doctorHourlyArrivals').innerHTML = doctorDashboardBarMarkup(
      hourly,
      (item) => `${String(item.hour).padStart(2, '0')}:00`,
      (item) => item.count,
      maxHourly,
    );

    const distribution = Array.isArray(dashboard.statusDistribution) ? dashboard.statusDistribution : [];
    const maxStatus = Math.max(1, ...distribution.map((item) => Number(item.count || 0)));
    const statusLabels = {
      WAITING: 'Waiting',
      CALLED: 'Called',
      IN_CONSULTATION: 'In consultation',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No-show',
    };
    document.getElementById('doctorStatusDistribution').innerHTML = distribution.map((item) => {
      const label = statusLabels[item.status] || item.status;
      const width = Math.min(100, Math.round((Number(item.count || 0) / maxStatus) * 100));
      return `<div class="doctor-status-row"><span>${escapeHtml(label)}</span><span class="doctor-status-track"><i class="doctor-status-bar" style="width:${width}%"></i></span><b>${Number(item.count || 0)}</b></div>`;
    }).join('');

    const trends = [
      ['doctorDailyTrend', dashboard.dailyStats, (item) => String(item.date || '').slice(5)],
      ['doctorWeeklyTrend', dashboard.weeklyStats, (item) => String(item.week || '').slice(5)],
      ['doctorMonthlyTrend', dashboard.monthlyStats, (item) => String(item.month || '')],
    ];
    trends.forEach(([elementId, stats, labelFor]) => {
      const target = document.getElementById(elementId);
      const items = Array.isArray(stats) ? stats : [];
      if (target) target.innerHTML = doctorDashboardTrendMarkup(items, labelFor);
    });

    const teamPanel = document.getElementById('doctorTeamWorkloadPanel');
    const teamWorkload = Array.isArray(dashboard.teamWorkload) ? dashboard.teamWorkload : null;
    teamPanel.classList.toggle('hidden', !teamWorkload);
    if (teamWorkload) {
      document.getElementById('doctorTeamWorkload').innerHTML = `<div class="doctor-workload-list">${teamWorkload.map((doctor) => `
        <div class="doctor-workload-row"><b>${escapeHtml(doctor.doctorName)}</b><span>Assigned ${Number(doctor.assigned)}</span><span>Waiting ${Number(doctor.waiting)}</span><span>Consulting ${Number(doctor.inConsultation)}</span><span>Done ${Number(doctor.completed)} · ${Number(doctor.averageConsultationMinutes)} min avg</span></div>
      `).join('')}</div>`;
    }
  }

  function startDoctorQueuePolling() {
    if (doctorQueuePollingTimer !== null || doctorRealtimeConnected) return;
    doctorQueuePollingTimer = window.setInterval(() => {
      void refreshDoctorWorkspaceFromApi();
    }, 15000);
    void refreshDoctorWorkspaceFromApi();
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const message = event.data || {};
    if (message.type === 'CSK_REQUEST_REALTIME_CREDENTIALS') {
      void refreshDoctorRealtimeConfiguration();
    } else if (message.type === 'CSK_REALTIME_STATUS') {
      setDoctorRealtimeStatus(message.status);
    } else if (message.type === 'CSK_DOCTOR_QUEUE_CHANGED') {
      void refreshDoctorWorkspaceFromApi();
    }
  });

  function toggleAppointmentApiFields() {
    const connected = isApiConnected();
    document.getElementById('localDoctorField').classList.toggle('hidden', connected);
    document.getElementById('apiDoctorField').classList.toggle('hidden', !connected);
    document.getElementById('localDepartmentField').classList.toggle('hidden', connected);
    document.getElementById('localTimeField').classList.toggle('hidden', connected);
    document.getElementById('apiSlotField').classList.toggle('hidden', !connected);
    document.querySelector('#appointmentForm [name="doctor"]').required = !connected;
    document.querySelector('#appointmentForm [name="time"]').required = !connected;
    document.getElementById('appointmentDoctorApi').required = connected;
    document.getElementById('appointmentSlotApi').required = connected;
  }

  async function loadAppointmentDoctors() {
    const doctorSelect = document.getElementById('appointmentDoctorApi');
    doctorSelect.innerHTML = '<option value="">Loading doctors...</option>';
    try {
      const doctors = await apiRequest('/appointments/doctors');
      doctorSelect.innerHTML = '<option value="">Select doctor</option>' + doctors
        .map((doctor) => `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.email)}</option>`)
        .join('');
      if (!doctors.length) doctorSelect.innerHTML = '<option value="">No active doctors configured</option>';
      await loadAppointmentSlots();
    } catch (error) {
      doctorSelect.innerHTML = '<option value="">Unable to load doctors</option>';
      showToast(error.message || 'Unable to load clinic doctors.');
    }
  }

  async function loadAppointmentSlots() {
    const doctorId = document.getElementById('appointmentDoctorApi').value;
    const date = document.querySelector('#appointmentForm [name="date"]').value;
    const slotSelect = document.getElementById('appointmentSlotApi');
    if (!doctorId || !date) {
      slotSelect.innerHTML = '<option value="">Select a doctor and date first</option>';
      return;
    }

    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    slotSelect.innerHTML = '<option value="">Loading available times...</option>';
    try {
      const query = new URLSearchParams({
        doctorId,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const slots = await apiRequest(`/appointments/slots?${query.toString()}`);
      slotSelect.innerHTML = '<option value="">Select an available time</option>' + slots
        .map((slot) => {
          const label = `${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(slot.startsAt))} – ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(slot.endsAt))}`;
          return `<option value="${escapeHtml(slot.id)}">${escapeHtml(label)}</option>`;
        })
        .join('');
      if (!slots.length) slotSelect.innerHTML = '<option value="">No available slots for this date</option>';
    } catch (error) {
      slotSelect.innerHTML = '<option value="">Unable to load available times</option>';
      showToast(error.message || 'Unable to load available appointment times.');
    }
  }

  function updateApiStatusText() {
    const label = document.getElementById('apiConnectionLabel');
    const connect = document.getElementById('apiConnectButton');
    const disconnect = document.getElementById('apiDisconnectButton');
    const hasToken = !!getStoredApiToken();
    const doctorLabel = document.getElementById('doctorApiConnectionLabel');
    const doctorConnect = document.getElementById('doctorApiConnectButton');
    const doctorDisconnect = document.getElementById('doctorApiDisconnectButton');
    if (label && connect && disconnect) {
      label.textContent = hasToken ? 'Connected to live clinic API' : 'Local demo mode';
      connect.classList.toggle('hidden', hasToken);
      disconnect.classList.toggle('hidden', !hasToken);
    }
    if (doctorLabel) doctorLabel.textContent = hasToken ? 'Connected to clinic API' : 'Demo mode · data stays in this browser';
    doctorConnect?.classList.toggle('hidden', hasToken);
    doctorDisconnect?.classList.toggle('hidden', !hasToken);
    if (!label || !connect || !disconnect) return;
    document.getElementById('dashboardStorageCaption').textContent = hasToken
      ? 'Clinic records are loaded from the connected clinic API.'
      : 'Clinic records are stored in this browser on this device. This demo is not connected to the clinic API.';
    document.getElementById('reportsSourceCaption').textContent = hasToken
      ? 'Detailed analysis based on records from the connected clinic API.'
      : 'Detailed analysis based on clinic records stored in this browser.';
  }

  async function connectToApi() {
    const email = window.prompt('Clinic staff email', window.CSK_CLINIC_DEMO_EMAIL || 'admin@cskclinic.local') || '';
    const password = window.prompt('Clinic staff password', '') || '';
    if (!email || !password) {
      showToast('Email and password are required to connect.');
      return;
    }

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, false);
      storeApiSession(result.accessToken, result.user || null);
      showToast('Connected to the live clinic API.');
      await hydrateFromApi();
      renderAll();
      updateApiStatusText();
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Unable to connect to the clinic API.');
    }
  }
  function amountInWords(value) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const underThousand = (number) => {
      const words = [];
      if (number >= 100) {
        words.push(`${ones[Math.floor(number / 100)]} Hundred`);
        number %= 100;
      }
      if (number >= 20) {
        words.push(tens[Math.floor(number / 10)]);
        if (number % 10) words.push(ones[number % 10]);
      } else if (number > 0) {
        words.push(ones[number]);
      }
      return words.join(' ');
    };
    let remaining = Math.max(0, Math.round((Number(value) || 0) * 100));
    const rupees = Math.floor(remaining / 100);
    const paise = remaining % 100;
    const groups = [
      [10000000, 'Crore'],
      [100000, 'Lakh'],
      [1000, 'Thousand'],
      [1, '']
    ];
    const words = [];
    let wholeRupees = rupees;
    groups.forEach(([divisor, label]) => {
      if (wholeRupees >= divisor) {
        const groupValue = Math.floor(wholeRupees / divisor);
        words.push(`${underThousand(groupValue)}${label ? ` ${label}` : ''}`);
        wholeRupees %= divisor;
      }
    });
    const rupeeWords = words.length ? words.join(' ') : 'Zero';
    const paiseWords = paise ? ` and ${underThousand(paise)} Paise` : '';
    return `${rupeeWords} Rupees${paiseWords} Only`;
  }
  const patientById = (id) => data.patients.find((patient) => patient.id === id);
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const formatTime = (value) => {
    if (!value) return '—';
    const [hour, minute] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
  };
  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `${formatDate(datePart)} · ${formatTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)}`;
  };
  function save() {
    try {
      const savedData = { ...data };
      if (isApiConnected()) {
        savedData.patientRecords = [];
        savedData.patientVitals = [];
        savedData.patientHistoryRecords = [];
        savedData.externalMedicalRecords = [];
        savedData.patientDrafts = [];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
    } catch (error) {
      console.error('Unable to save clinic records in this browser.', error);
      showToast('Could not save. Browser storage may be full or disabled.');
      throw error;
    }
  }
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
  }
  function closeHeaderPopovers() {
    document.querySelectorAll('[data-header-popover-toggle]').forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.header-popover').forEach((panel) => panel.classList.add('hidden'));
  }
  function getClinicInventoryAlerts() {
    const medicines = data.medicines.filter((medicine) => medicineStatus(medicine) !== 'In stock');
    const consumables = data.consumables.filter((item) => (item.expiry && item.expiry < dateKey(today)) || Number(item.quantity) <= Number(item.reorder));
    return [
      { section: 'pharmacy', label: 'Medicine inventory', count: medicines.length },
      { section: 'consumables', label: 'Clinical supplies', count: consumables.length }
    ].filter((alert) => alert.count > 0);
  }

  function getClinicWorkflowReminders() {
    const now = Date.now();
    const nextDay = now + 24 * 60 * 60 * 1000;
    const upcomingAppointments = data.appointments.filter((appointment) => {
      if (!['Scheduled', 'Booked'].includes(appointment.status)) return false;
      const start = Date.parse(`${appointment.date}T${appointment.time || '00:00'}:00`);
      return Number.isFinite(start) && start >= now && start <= nextDay;
    }).length;
    const todayKey = dateKey(today);
    const followUpEnd = new Date(today);
    followUpEnd.setDate(followUpEnd.getDate() + 7);
    const followUpEndKey = dateKey(followUpEnd);
    const dueFollowUps = new Set(getPrescriptionListRows()
      .filter((row) => row.version?.nextVisitDate
        && row.version.nextVisitDate >= todayKey
        && row.version.nextVisitDate <= followUpEndKey)
      .map((row) => row.record.id)).size;
    return [
      ...(upcomingAppointments ? [{
        section: 'appointments',
        label: 'Upcoming appointments',
        count: upcomingAppointments,
        detail: `${upcomingAppointments} appointment${upcomingAppointments === 1 ? '' : 's'} in the next 24 hours`,
      }] : []),
      ...(dueFollowUps ? [{
        section: 'prescriptions',
        label: 'Prescription follow-ups',
        count: dueFollowUps,
        detail: `${dueFollowUps} follow-up${dueFollowUps === 1 ? '' : 's'} due within 7 days`,
      }] : []),
    ];
  }

  function updateNotificationIndicator() {
    const alertCount = [...getClinicInventoryAlerts(), ...getClinicWorkflowReminders()]
      .reduce((total, alert) => total + alert.count, 0);
    document.querySelector('.notification-button i').classList.toggle('hidden', alertCount === 0);
  }
  function renderNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const alerts = [...getClinicInventoryAlerts(), ...getClinicWorkflowReminders()];
    updateNotificationIndicator();
    panel.innerHTML = `<h2 class="header-popover-title">Clinic alerts</h2>${alerts.length
      ? alerts.map((alert) => `<button type="button" class="header-popover-item" data-header-popover-action="${alert.section}"><b>${escapeHtml(alert.label)}</b><small>${escapeHtml(alert.detail || `${alert.count} item${alert.count === 1 ? '' : 's'} need attention`)}</small></button>`).join('')
      : '<p class="header-popover-empty">No inventory alerts. You’re all caught up.</p>'}`;
  }
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const focusable = id === 'patientModal'
      ? modal.querySelector('#patientForm [name="name"]')
      : modal.querySelector('input:not([type=hidden]),select,button');
    if (focusable) focusable.focus();
  }

  let consultationPrescriptionHasChanges = false;

  let consultationCameraStream = null;

  function stopConsultationCamera() {
    consultationCameraStream?.getTracks().forEach((track) => track.stop());
    consultationCameraStream = null;
    const preview = document.getElementById('consultationCameraPreview');
    if (preview) preview.srcObject = null;
    const captureButton = document.getElementById('consultationCameraCapture');
    if (captureButton) captureButton.disabled = true;
  }

  function closeModal(modal) {
    if (modal?.id === 'consultationCameraModal') stopConsultationCamera();
    modal.classList.add('hidden');
    if (!document.querySelector('.modal-backdrop:not(.hidden)')) document.body.style.overflow = '';
  }
  function requestCloseConsultationPrescription() {
    if (consultationPrescriptionHasChanges
      && !window.confirm('Discard unsaved consultation changes and close?')) return;
    consultationPrescriptionHasChanges = false;
    closeModal(document.getElementById('consultationPrescriptionModal'));
  }
  function canAccessDoctorWorkspace() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'DOCTOR'].includes(getStoredApiUser()?.role);
  }
  function canAccessNurseWorkspace() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'NURSE'].includes(getStoredApiUser()?.role);
  }
  function setSidebarCollapsed(collapsed, persist = false) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const toggle = document.getElementById('sidebarToggle');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    toggle.textContent = collapsed ? '›' : '‹';
    if (persist) localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }
  setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  function setWorkspaceSwitcherOpen(open) {
    const toggle = document.getElementById('workspaceSwitcherToggle');
    const menu = document.getElementById('workspaceSwitcherMenu');
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('hidden', !open);
  }
  function closeWorkspaceSwitcher() {
    setWorkspaceSwitcherOpen(false);
  }
  function setDoctorSearchNavigationVisible(visible) {
    document.getElementById('doctorSearchNav').classList.toggle('hidden', !visible);
  }
  function openDoctorSearch(provider) {
    const url = provider === 'chatgpt'
      ? 'https://chatgpt.com/'
      : 'https://www.google.com/';
    const width = Math.min(960, Math.max(620, Math.round(window.screen.availWidth * 0.52)));
    const height = Math.min(900, Math.max(560, window.screen.availHeight - 80));
    const left = window.screenX + Math.max(0, window.outerWidth - width);
    const top = window.screenY + 40;
    const searchWindow = window.open(url, '_blank', `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
    if (!searchWindow) {
      showToast('Your browser blocked the search window. Allow pop-ups for CSK Clinic and try again.');
      return;
    }
    searchWindow.opener = null;
    searchWindow.focus();
  }
  function setWorkspaceAccessDenied(denied) {
    document.body.classList.toggle('workspace-access-denied', denied);
    document.getElementById('workspaceAccessDenied').classList.toggle('hidden', !denied);
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.workspace-switcher')) closeWorkspaceSwitcher();
    if (!event.target.closest('.header-popover-wrap')) closeHeaderPopovers();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openHeaderToggle = document.querySelector('[data-header-popover-toggle][aria-expanded="true"]');
      closeHeaderPopovers();
      openHeaderToggle?.focus();
      closeWorkspaceSwitcher();
    }
  });
  function showView(id) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('view')) return;
    setDoctorSearchNavigationVisible(false);
    if (WORKSPACE_MODE === 'front-office' && id === 'doctor') {
      showToast('Doctor Workspace is available from the separate doctor-workspace.html page.');
      showView('patients');
      return;
    }
    if (WORKSPACE_MODE === 'doctor' && !['doctor', 'pharmacy', 'prescriptions'].includes(id)) {
      showToast('This page is limited to the Doctor Workspace.');
      showView('doctor');
      return;
    }
    if (id === 'doctor' && !canAccessDoctorWorkspace()) {
      showToast('Your account does not have permission to access the doctor workspace.');
      if (WORKSPACE_MODE === 'doctor') setWorkspaceAccessDenied(true);
      return;
    }
    if (id === 'nurse' && !canAccessNurseWorkspace()) {
      showToast('Your account does not have permission to access the nurse workspace.');
      return;
    }
    setDoctorSearchNavigationVisible(id === 'doctor');
    closeWorkspaceSwitcher();
    setWorkspaceAccessDenied(false);
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view === target));
    document.querySelectorAll('.nav-link[data-section]').forEach((link) => link.classList.toggle('active', link.dataset.section === id));
    document.getElementById('pageBreadcrumb').textContent = id === 'doctor' ? 'Doctor Workspace'
      : WORKSPACE_MODE === 'doctor' && id === 'pharmacy' ? 'Medicines' : id[0].toUpperCase() + id.slice(1);
    document.getElementById('activeWorkspaceName').textContent = WORKSPACE_MODE === 'doctor' || id === 'doctor' ? 'Doctor Workspace' : 'Front Office';
    document.getElementById('sidebar').classList.remove('open');
    history.replaceState(null, '', `#${id}`);
    if (id === 'doctor') {
      renderDoctorWorkspace();
      void refreshDoctorWorkspaceFromApi();
      void refreshDoctorDashboard();
    }
    if (id === 'prescriptions') loadPrescriptionWorkspace();
    if (id === 'pharmacy') {
      setPharmacyTab(WORKSPACE_MODE === 'doctor' ? 'inventory' : 'dashboard');
      renderMedicines();
      renderPharmacyDashboard();
    }
    if (id === 'nurse') renderNurseWorkspace();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function paymentDateKey(value) {
    const raw = String(value || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? '' : dateKey(date);
  }

  function collectedOnDate(targetDate) {
    return data.invoices.reduce((sum, invoice) => sum + (invoice.payments || []).reduce((paymentSum, payment) => (
      paymentDateKey(payment.date || payment.paidAt) === targetDate
        ? paymentSum + Number(payment.amount || 0)
        : paymentSum
    ), 0), 0);
  }

  function renderOverview() {
    const todayAppointments = data.appointments.filter((item) => item.date === dateKey(today) && item.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time));
    const collected = collectedOnDate(dateKey(today));
    const lowStock = data.medicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.reorder));
    updateNotificationIndicator();
    document.getElementById('totalPatients').textContent = data.patients.length.toLocaleString('en-IN');
    document.getElementById('todayAppointments').textContent = todayAppointments.length.toLocaleString('en-IN');
    document.getElementById('todayRevenue').textContent = money(collected);
    document.getElementById('lowStockCount').textContent = lowStock.length.toLocaleString('en-IN');
    document.getElementById('navPatientCount').textContent = data.patients.length;
    const appointmentTarget = document.getElementById('dashboardAppointments');
    appointmentTarget.innerHTML = todayAppointments.length ? todayAppointments.slice(0, 5).map((appointment) => {
      const patient = patientById(appointment.patientId);
      return `<div class="appointment-row"><span class="appointment-time">${escapeHtml(formatTime(appointment.time))}</span><span class="appointment-person"><b>${escapeHtml(patient?.name || 'Unknown patient')}</b><small>${escapeHtml(patient?.code || '')}</small></span><span class="appointment-person department"><b>${escapeHtml(appointment.doctor)}</b><small>${escapeHtml(appointment.department || 'General')}</small></span><span class="status-pill ${appointment.status === 'Scheduled' ? 'pending' : ''}">${escapeHtml(appointment.status)}</span></div>`;
    }).join('') : '<div class="empty-state"><span>▣</span><b>No appointments today</b><p>Use the schedule to add a clinic visit.</p></div>';
    const stockTarget = document.getElementById('dashboardStock');
    stockTarget.innerHTML = lowStock.length ? lowStock.slice(0, 4).map((medicine) => `<div class="stock-item"><span class="medicine-icon">✚</span><span class="stock-copy"><b>${escapeHtml(medicine.name)}</b><small>${escapeHtml(medicine.category || 'Medicine')} · reorder at ${Number(medicine.reorder)}</small></span><span class="stock-qty">${Number(medicine.quantity)} left</span></div>`).join('') : '<div class="empty-state"><span>✓</span><b>Stock levels look good</b><p>No medicines are below reorder level.</p></div>';
    const recent = [...data.patients].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 4);
    document.getElementById('dashboardPatients').innerHTML = recent.length ? recent.map((patient) => `<div class="recent-row"><span class="patient-avatar">${escapeHtml(initials(patient.name))}</span><span class="recent-info"><b>${escapeHtml(patient.name)}</b><small>${escapeHtml(patient.code)} · ${escapeHtml(patient.phone)}</small></span><span class="recent-date">${escapeHtml(formatDate((patient.createdAt || '').slice(0, 10)))}</span></div>`).join('') : '<div class="empty-state"><b>No registered patients</b></div>';
    const activeInvoices = data.invoices.filter((invoice) => !isInvoiceVoided(invoice));
    const paidCount = activeInvoices.filter((invoice) => Number(invoice.paid) >= Number(invoice.total)).length;
    const due = activeInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paid)), 0);
    document.getElementById('paidInvoices').textContent = paidCount;
    document.getElementById('outstandingBalance').textContent = money(due);
  }

  function patientAge(patient) {
    if (!patient.dob) return '—';
    const born = new Date(`${patient.dob}T00:00:00`);
    if (Number.isNaN(born.getTime())) return '—';
    let age = today.getFullYear() - born.getFullYear();
    const beforeBirthday = today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
    if (beforeBirthday) age -= 1;
    return age >= 0 ? `${age} yrs` : '—';
  }

  async function setPatientArchived(id, archived) {
    const patient = data.patients.find((item) => item.id === id);
    if (!patient || !canManagePatientData()) {
      showToast('Patient not found or you do not have permission to change this record.');
      return;
    }
    const action = archived ? 'archive' : 'restore';
    const confirmation = archived
      ? `Archive ${patient.name}? Their visit, prescription and billing history will be retained.`
      : `Restore ${patient.name} to the active patient directory?`;
    if (!window.confirm(confirmation)) return;

    try {
      if (isApiConnected()) {
        await apiRequest(`/patients/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: archived ? 'INACTIVE' : 'ACTIVE' }),
        });
        if (!await hydrateFromApi()) {
          throw new Error('Patient status changed, but the directory could not be refreshed. Reload the page to see the update.');
        }
      } else {
        patient.status = archived ? 'Inactive' : 'Active';
        save();
      }
      renderAll();
      showToast(archived ? 'Patient archived; history has been retained.' : 'Patient restored.');
    } catch (error) {
      console.error(`Unable to ${action} patient record.`, error);
      showToast(error.message || `Unable to ${action} patient record.`);
    }
  }

  function printBlankPatientForm(kind) {
    const isConsent = kind === 'consent';
    const title = isConsent ? 'Patient Consent Form' : 'Patient Registration Form';
    const body = isConsent
      ? `<p>I confirm that the information I have provided to the clinic is accurate to the best of my knowledge. I understand that I may ask the clinic staff to explain the purpose of information collection and the proposed care before signing.</p><p>I consent to the clinic recording relevant health information and using it to coordinate my care, subject to applicable privacy requirements.</p><div class="fields"><div>Patient name: <span></span></div><div>Patient ID: <span></span></div><div>Purpose / procedure (if applicable): <span></span></div><div class="wide">Questions or limitations communicated: <span></span></div></div><div class="signatures"><div>Patient / authorized representative signature</div><div>Relationship (if representative)</div><div>Date &amp; time</div><div>Witness / staff name</div></div>`
      : `<div class="fields"><div>First name: <span></span></div><div>Last name: <span></span></div><div>Date of birth: <span></span></div><div>Gender: <span></span></div><div>Blood group: <span></span></div><div>Marital status: <span></span></div><div>Mobile number: <span></span></div><div>Email: <span></span></div><div class="wide">Address: <span></span></div><div>City: <span></span></div><div>State / pincode: <span></span></div><div>Occupation: <span></span></div><div>Known allergies: <span></span></div><div class="wide">Chronic conditions / current medicines: <span></span></div><div>Emergency contact: <span></span></div><div>Emergency phone: <span></span></div><div>Insurance provider / policy: <span></span></div></div>`;
    const popup = window.open('', '_blank');
    if (!popup) {
      showToast('Allow pop-ups to open the printable form.');
      return;
    }
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>
      *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#142b45;margin:0;padding:32px;background:#eef2f5}.sheet{max-width:820px;margin:auto;padding:38px;background:#fff;border:1px solid #dfe6ed}.head{text-align:center;border-bottom:2px solid #087c78;padding-bottom:16px;margin-bottom:24px}.head h1{margin:0 0 6px;font-size:23px}.head p{margin:4px;color:#62748a}.sheet h2{text-align:center;margin:0 0 22px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:18px 24px}.fields div{min-height:42px;border-bottom:1px solid #aeb9c4;padding-bottom:8px}.fields span{display:inline-block;min-width:45%;border-bottom:1px solid #aeb9c4}.fields .wide{grid-column:1/-1}.fields .wide span{min-width:75%}.consent-copy p{line-height:1.7;margin:16px 0}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px 28px;margin-top:64px}.signatures div{border-top:1px solid #718096;padding-top:8px}.print-actions{text-align:center;margin:20px auto}.print-actions button{padding:10px 18px;background:#087c78;color:white;border:0;border-radius:6px;cursor:pointer}@media print{body{padding:0;background:#fff}.sheet{border:0;padding:12mm;max-width:none}.print-actions{display:none}}@media(max-width:600px){.sheet{padding:20px}.fields,.signatures{grid-template-columns:1fr}.fields .wide{grid-column:auto}}
    </style></head><body><main class="sheet"><header class="head"><h1>${escapeHtml(data.settings.clinicName || 'CSK Clinic')}</h1><p>${escapeHtml([data.settings.address, data.settings.phone, data.settings.email].filter(Boolean).join(' · '))}</p></header><h2>${title}</h2><section class="${isConsent ? 'consent-copy' : ''}">${body}</section><div class="print-actions"><button onclick="window.print()">Print form</button></div></main></body></html>`);
    popup.document.close();
    popup.focus();
  }

  function renderPatients() {
    const query = (document.getElementById('patientSearch')?.value || '').trim().toLowerCase();
    const phoneQuery = patientPhoneKey(query);
    const gender = document.getElementById('patientGenderFilter')?.value || '';
    const bloodGroup = document.getElementById('patientBloodFilter')?.value || '';
    const patientType = document.getElementById('patientTypeFilter')?.value || '';
    const patientStatus = document.getElementById('patientStatusFilter')?.value || '';
    const sort = document.getElementById('patientSort')?.value || 'recent';
    const currentMonth = dateKey(today).slice(0, 7);
    const showRecordsAction = canViewClinicalRecords();
    const canManage = canManagePatientData();
    let rows = data.patients.filter((patient) => {
      const records = getPatientRecords(patient.id);
      const appointments = data.appointments.filter((item) => item.patientId === patient.id);
      const textMatch = [patient.name, patient.code, patient.phone, patient.email].some((value) => String(value || '').toLowerCase().includes(query));
      const phoneMatch = phoneQuery.length >= 3 && patientPhoneKey(patient.phone).includes(phoneQuery);
      if (query && !textMatch && !phoneMatch) return false;
      if (patientStatus && (patient.status || 'Active') !== patientStatus) return false;
      if (gender && String(patient.gender || 'Unspecified') !== gender) return false;
      if (bloodGroup && patient.bloodGroup !== bloodGroup) return false;
      if (patientType === 'new' && getPatientType(patient.id) !== 'new') return false;
      if (patientType === 'returning' && getPatientType(patient.id) !== 'returning') return false;
      if (patientType === 'followup' && !records.some((record) => record.followUpDate && record.followUpDate >= dateKey(today))) return false;
      if (patientType === 'appointment' && !appointments.some((item) => item.status !== 'Cancelled')) return false;
      return true;
    });
    rows.sort((left, right) => {
      if (sort === 'name') return String(left.name).localeCompare(String(right.name));
      if (sort === 'code') return String(left.code).localeCompare(String(right.code), undefined, { numeric: true });
      if (sort === 'lastVisit') {
        const leftVisit = left.lastVisit || getPatientRecords(left.id)[0]?.visitDate || '';
        const rightVisit = right.lastVisit || getPatientRecords(right.id)[0]?.visitDate || '';
        return rightVisit.localeCompare(leftVisit);
      }
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    });
    const totalPages = Math.max(1, Math.ceil(rows.length / patientDirectoryPageSize));
    patientDirectoryPage = Math.min(patientDirectoryPage, totalPages);
    const pageStart = (patientDirectoryPage - 1) * patientDirectoryPageSize;
    const pagedRows = rows.slice(pageStart, pageStart + patientDirectoryPageSize);
    document.getElementById('patientResultCount').textContent = `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`;
    const seenToday = patientDashboardStats?.patientsSeenToday ?? new Set(
      (data.patientRecords || [])
        .filter((record) => String(record.visitDate || '').slice(0, 10) === dateKey(today))
        .map((record) => record.patientId),
    ).size;
    document.getElementById('patientPageTotal').textContent = patientDashboardStats?.totalPatients ?? data.patients.length;
    document.getElementById('patientMonthTotal').textContent = patientDashboardStats?.newPatientsThisMonth
      ?? data.patients.filter((patient) => (patient.createdAt || '').slice(0, 7) === currentMonth).length;
    document.getElementById('patientSeenTodayTotal').textContent = seenToday;
    document.getElementById('patientsEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('patientsTable').innerHTML = pagedRows.map((patient) => {
      const records = getPatientRecords(patient.id);
      const lastVisit = patient.lastVisit || records[0]?.visitDate;
      const medicalAlert = patient.allergies || patient.medicalHistory || '';
      const inactive = (patient.status || 'Active') === 'Inactive';
      return `<tr class="${inactive ? 'patient-row-archived' : ''}"><td data-label="Patient"><button type="button" class="patient-cell patient-preview-trigger" aria-label="Quick details for ${escapeHtml(patient.name)}" data-preview-patient="${escapeHtml(patient.id)}">${patientAvatarMarkup(patient)}<span><b>${escapeHtml(patient.name)}${inactive ? ' <i class="patient-status-badge">Archived</i>' : ''}</b><small>${escapeHtml(patient.code)} · ${records.length} ${records.length === 1 ? 'visit' : 'visits'}</small></span></button></td><td data-label="Age / sex">${escapeHtml(patientAge(patient))} <span class="patient-gender-divider">·</span> ${escapeHtml(patient.gender || '—')}</td><td data-label="Blood group">${escapeHtml(patient.bloodGroup || '—')}</td><td data-label="Mobile">${escapeHtml(patient.phone || '—')}</td><td data-label="City">${escapeHtml(patient.city || '—')}</td><td data-label="Medical alerts">${medicalAlert ? `<span class="patient-alert-chip" title="${escapeHtml(medicalAlert)}">⚠ ${escapeHtml(medicalAlert)}</span>` : '<span class="muted">—</span>'}</td><td data-label="Last visit">${lastVisit ? `<span>${escapeHtml(formatDate(lastVisit))}</span>${records[0]?.doctorName ? `<small class="patient-last-visit-doctor">${escapeHtml(records[0].doctorName)}</small>` : ''}` : '<span class="muted">—</span>'}</td><td data-label="Actions"><span class="row-actions"><button class="action-button patient-icon-action" type="button" aria-label="View" title="View patient" data-open-patient-profile="${escapeHtml(patient.id)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button>${canManage ? `<button class="action-button patient-icon-action" type="button" aria-label="Edit" title="Edit patient" data-edit-patient="${escapeHtml(patient.id)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4 4 16.5Z"/><path d="m14.8 5.7 3.5 3.5"/></svg></button>${inactive ? `<button class="action-button" data-restore-patient="${escapeHtml(patient.id)}">Restore</button>` : `<button class="action-button danger patient-icon-action" type="button" aria-label="Delete" title="Archive patient" data-archive-patient="${escapeHtml(patient.id)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>`}` : ''}${showRecordsAction ? `<button class="action-button patient-extra-action" data-open-patient-records="${escapeHtml(patient.id)}">Visits</button><button class="action-button patient-extra-action" data-open-patient-external-records="${escapeHtml(patient.id)}">Outside</button>` : ''}${canManage && !inactive ? `<button class="action-button patient-extra-action" data-check-in-patient="${escapeHtml(patient.id)}">Check in</button>` : ''}</span></td></tr>`;
    }).join('');
    document.getElementById('patientPageRange').textContent = rows.length ? `Showing ${pageStart + 1}–${Math.min(pageStart + patientDirectoryPageSize, rows.length)} of ${rows.length}` : 'Showing 0 records';
    document.getElementById('patientPageNumber').textContent = `Page ${patientDirectoryPage} of ${totalPages}`;
    document.getElementById('patientPrevPage').disabled = patientDirectoryPage <= 1;
    document.getElementById('patientNextPage').disabled = patientDirectoryPage >= totalPages;
    document.getElementById('patientDraftCount').textContent = String(data.patientDrafts.length);
    document.getElementById('openPatientDrafts').classList.toggle('hidden', !canManage);
    document.querySelectorAll('[data-open-modal="patientModal"]').forEach((button) => {
      button.classList.toggle('hidden', !canManage);
    });
    renderPatientNameSuggestions();
  }

  function renderPatientNameSuggestions() {
    const list = document.getElementById('patientNameSuggestions');
    const phoneList = document.getElementById('patientPhoneSuggestions');
    if (!list || !phoneList) return;
    list.innerHTML = [...new Set(data.patients.map((patient) => patient.name).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
    phoneList.innerHTML = data.patients.filter((patient) => patient.phone)
      .map((patient) => `<option value="${escapeHtml(patient.phone)}" label="${escapeHtml(patient.name)} · ${escapeHtml(patient.code)}"></option>`).join('');
  }

  function openPatientPreview(patientId) {
    const patient = patientById(patientId);
    if (!patient) return;
    const records = getPatientRecords(patientId);
    const latest = records[0];
    const upcoming = data.appointments
      .filter((item) => item.patientId === patientId && item.status !== 'Cancelled' && item.date >= dateKey(today))
      .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0];
    const phoneDigits = patientPhoneKey(patient.phone);
    const callAction = phoneDigits
      ? `<a class="button button-light" href="tel:${escapeHtml(phoneDigits)}" aria-label="Call ${escapeHtml(patient.name)}">Call</a>`
      : '';
    const whatsappPhone = phoneDigits.replace(/^91(?=\d{10}$)/, '');
    const whatsappAction = phoneDigits
      ? `<a class="button button-light" href="https://wa.me/91${escapeHtml(whatsappPhone)}" target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp for ${escapeHtml(patient.name)}">WhatsApp</a>`
      : '';
    document.getElementById('patientPreviewName').textContent = patient.name;
    document.getElementById('patientPreviewContent').innerHTML = `
      <div class="patient-preview-identity">${patientAvatarMarkup(patient)}<div><b>${escapeHtml(patient.code)}</b><span>${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Unspecified')} · ${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</span></div></div>
      <dl class="patient-preview-details">
        <div><dt>Mobile</dt><dd>${escapeHtml(patient.phone || '—')}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(patient.email || '—')}</dd></div>
        <div><dt>Registration</dt><dd>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</dd></div>
        <div><dt>Latest visit</dt><dd>${latest ? escapeHtml(formatDate(latest.visitDate)) : 'No visits'}</dd></div>
        <div><dt>Next appointment</dt><dd>${upcoming ? `${escapeHtml(formatDate(upcoming.date))} · ${escapeHtml(upcoming.doctor)}` : 'No upcoming appointment'}</dd></div>
        <div><dt>Clinical alert</dt><dd>${escapeHtml(patient.allergies || patient.notes || 'Allergy status not recorded')}</dd></div>
      </dl>
      <div class="patient-preview-actions">${callAction}${whatsappAction}<button type="button" class="button button-primary" data-open-patient-profile="${escapeHtml(patient.id)}">Open full profile</button>${canManagePatientData() ? `<button type="button" class="button button-light" data-edit-patient="${escapeHtml(patient.id)}">Edit</button>` : ''}</div>`;
    document.getElementById('patientPreviewDrawer').classList.remove('hidden');
  }

  function patientPhoneKey(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function patientCodeOrdinal(code) {
    const match = /^([A-Z]+)(\d{2})$/i.exec(String(code || ''));
    if (!match) return 0n;
    const suffix = Number(match[2]);
    if (suffix < 1 || suffix > 99) return 0n;
    const prefix = match[1].toUpperCase();
    let prefixValue = 0n;
    for (const letter of prefix) prefixValue = prefixValue * 26n + BigInt(letter.charCodeAt(0) - 65);
    let prefixOffset = 0n;
    let prefixesOfLength = 26n;
    for (let length = 1; length < prefix.length; length += 1) {
      prefixOffset += prefixesOfLength;
      prefixesOfLength *= 26n;
    }
    return (prefixOffset + prefixValue) * 99n + BigInt(suffix);
  }

  function highestPatientIdOrdinal(patients, storedOrdinal) {
    const stored = /^\d+$/.test(String(storedOrdinal || '')) ? BigInt(storedOrdinal) : 0n;
    return (patients || []).reduce((highest, patient) => {
      const ordinal = patientCodeOrdinal(patient.code);
      return ordinal > highest ? ordinal : highest;
    }, stored);
  }

  function patientCodeFromOrdinal(ordinal) {
    const zeroBasedOrdinal = ordinal - 1n;
    let prefixIndex = zeroBasedOrdinal / 99n;
    const suffix = zeroBasedOrdinal % 99n + 1n;
    let prefixLength = 1;
    let prefixOffset = 0n;
    let prefixesOfLength = 26n;
    while (prefixIndex >= prefixOffset + prefixesOfLength) {
      prefixOffset += prefixesOfLength;
      prefixesOfLength *= 26n;
      prefixLength += 1;
    }
    prefixIndex -= prefixOffset;
    const letters = [];
    while (letters.length < prefixLength) {
      letters.push(String.fromCharCode(65 + Number(prefixIndex % 26n)));
      prefixIndex /= 26n;
    }
    return `${letters.reverse().join('')}${suffix.toString().padStart(2, '0')}`;
  }

  function nextPatientCode() {
    const ordinal = highestPatientIdOrdinal(data.patients, data.patientIdSequenceOrdinal) + 1n;
    data.patientIdSequenceOrdinal = ordinal.toString();
    return patientCodeFromOrdinal(ordinal);
  }

  function getPotentialPatientDuplicates(fields, currentPatientId = '') {
    const phone = patientPhoneKey(fields.get('phone'));
    const name = String(fields.get('name') || '').trim().toLocaleLowerCase();
    const dob = String(fields.get('dob') || '');
    if (phone.length < 7 && !(name && dob)) return [];
    return data.patients.filter((patient) => {
      if (patient.id === currentPatientId) return false;
      const samePhone = phone.length >= 7 && patientPhoneKey(patient.phone) === phone;
      const sameNameAndDob = name && dob
        && String(patient.name || '').trim().toLocaleLowerCase() === name
        && String(patient.dob || '').slice(0, 10) === dob;
      return samePhone || sameNameAndDob;
    });
  }

  function updatePatientDuplicateWarning() {
    const form = document.getElementById('patientForm');
    updatePatientFullName(form);
    const fields = new FormData(form);
    const warning = document.getElementById('patientDuplicateWarning');
    const id = String(fields.get('id') || '');
    const matches = getPotentialPatientDuplicates(fields, id);
    if (!matches.length) {
      warning.classList.add('hidden');
      warning.replaceChildren();
      return;
    }

    warning.classList.remove('hidden');
    warning.innerHTML = `<b>Possible existing patient</b><p>We found ${matches.length} record${matches.length === 1 ? '' : 's'} with the same mobile number or name and date of birth. Open the profile to verify before creating another record.</p><ul>${matches.slice(0, 3).map((patient) => `<li><span>${escapeHtml(patient.name)} · ${escapeHtml(patient.code)}</span><small>${escapeHtml(patient.phone)}</small><button type="button" class="action-button" data-open-patient-profile="${escapeHtml(patient.id)}">View profile</button></li>`).join('')}</ul><label class="duplicate-confirm"><input id="patientDuplicateConfirmed" type="checkbox" /> I verified these records and need to register a separate patient.</label>`;
  }

  function updatePatientRegistrationPreview() {
    const form = document.getElementById('patientForm');
    const patientName = updatePatientFullName(form);
    const birthDate = String(form.elements.namedItem('dob').value || '');
    const id = String(form.elements.namedItem('id').value || '');
    const draftId = String(form.elements.namedItem('draftId').value || '');
    const patient = data.patients.find((item) => item.id === id);
    const draft = data.patientDrafts.find((item) => item.id === draftId);
    const code = patient?.code || draft?.code || '';
    const previewCode = patientIdPreview || (!isApiConnected()
      ? patientCodeFromOrdinal(highestPatientIdOrdinal(data.patients, data.patientIdSequenceOrdinal) + 1n)
      : '');
    document.getElementById('patientCodePreview').textContent = code || (previewCode ? `${previewCode} · preview` : 'Assigned automatically on save');
    document.getElementById('patientRegistrationPreview').textContent = patient?.createdAt
      ? formatDate(String(patient.createdAt).slice(0, 10))
      : 'Today';
    const type = id ? getPatientType(id) : 'new';
    const typePreview = document.getElementById('patientTypePreview');
    typePreview.textContent = patientTypeLabel(type);
    typePreview.className = `patient-type-preview ${type}`;
    document.getElementById('patientPhotoName').textContent = patientName || 'New patient';
    const photo = String(form.elements.namedItem('profilePhotoDataUrl').value || '');
    document.getElementById('patientPhotoCaption').textContent = photo
      ? 'Profile photo ready'
      : 'Add a clear profile photo';
    document.getElementById('patientPhotoPreview').innerHTML = photo
      ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(patientName || 'Patient')} profile photo" />`
      : `<span>${escapeHtml(initials(patientName || 'Patient'))}</span>`;
    document.getElementById('removePatientPhoto').classList.toggle('hidden', !photo);
    const agePreview = document.getElementById('patientAgePreview');
    if (!birthDate) {
      agePreview.textContent = 'Age calculated from date of birth';
      return;
    }
    if (birthDate > dateKey(today)) {
      agePreview.textContent = 'Date of birth cannot be in the future';
      return;
    }
    const age = patientAge({ dob: birthDate });
    agePreview.textContent = age === '—' ? 'Age unavailable' : `Age ${age}`;
  }

  function updatePatientFullName(form) {
    const firstName = String(form.elements.namedItem('firstName')?.value || '').trim();
    const lastName = String(form.elements.namedItem('lastName')?.value || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    form.elements.namedItem('name').value = fullName;
    return fullName;
  }

  function updatePatientIdentityValidity(form, showErrors = false) {
    const name = form.elements.namedItem('firstName');
    const phone = form.elements.namedItem('phone');
    updatePatientFullName(form);
    const nameValue = String(name.value || '').trim();
    const phoneValue = String(phone.value || '').trim();
    const enteredDigits = patientPhoneKey(phoneValue);
    const nationalDigits = enteredDigits.length === 12 && enteredDigits.startsWith('91')
      ? enteredDigits.slice(2)
      : enteredDigits;
    const nameMessage = !nameValue
      ? 'Enter the patient first name.'
      : nameValue.length < 2
        ? 'Enter at least 2 characters for the first name.'
        : '';
    const phoneMessage = !phoneValue
      ? 'Enter the patient mobile number.'
      : !/^[6-9]\d{9}$/.test(nationalDigits)
        ? 'Enter a valid 10-digit Indian mobile number.'
          : '';
    name.setCustomValidity(nameMessage);
    phone.setCustomValidity(phoneMessage);

    [
      [name, document.getElementById('patientNameError'), nameMessage],
      [phone, document.getElementById('patientPhoneError'), phoneMessage],
    ].forEach(([field, error, message]) => {
      error.textContent = message;
      error.classList.toggle('hidden', !message || (!showErrors && !field.value));
    });

    return [name, phone].find((field) => !field.checkValidity()) || null;
  }

  function setPatientFormStep(step, validateCurrent = false) {
    const form = document.getElementById('patientForm');
    if (validateCurrent) {
      updatePatientIdentityValidity(form, true);
      const fields = [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')];
      const invalid = fields.find((field) => !field.checkValidity());
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    form.querySelectorAll('[data-patient-step-panel]').forEach((panel) => panel.classList.remove('hidden'));
    form.querySelectorAll('[data-patient-step]').forEach((indicator) => {
      const active = Number(indicator.dataset.patientStep) === step;
      indicator.classList.toggle('active', active);
      if (active) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });
    void step;
  }

  async function optimizePatientPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Choose a JPG, PNG, or WebP image.');
    }
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot process the selected photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.78, 0.64, 0.5, 0.38]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= 55_000) return dataUrl;
    }
    throw new Error('This image could not be optimized to the clinic upload limit.');
  }

  function renderPatientDrafts() {
    const target = document.getElementById('patientDraftList');
    if (!target) return;
    target.innerHTML = data.patientDrafts.length ? data.patientDrafts.map((draft) => `
      <article class="patient-draft-card">
        <div><b>${escapeHtml(draft.name || 'Unnamed registration')}</b><p>${escapeHtml(draft.phone || 'Mobile not entered')} · Updated ${escapeHtml(formatDate(String(draft.updatedAt || draft.createdAt).slice(0, 10)))}</p></div>
        <div><button type="button" class="action-button" data-load-patient-draft="${escapeHtml(draft.id)}">Resume</button><button type="button" class="action-button danger" data-delete-patient-draft="${escapeHtml(draft.id)}">Delete</button></div>
      </article>
    `).join('') : '<div class="empty-state"><span>✓</span><b>No saved drafts</b><p>Incomplete registrations will appear here.</p></div>';
  }

  function localPatientHistory(patientId) {
    let history = data.patientHistoryRecords.find((item) => item.patientId === patientId);
    if (!history) {
      history = {
        patientId,
        medicalConditions: [],
        familyHistoryMembers: [],
        personalHistory: null,
        femaleHistory: null,
      };
      data.patientHistoryRecords.push(history);
    }
    return history;
  }

  function patientHistoryBoolean(value) {
    return value === true ? 'Yes' : value === false ? 'No' : 'Not recorded';
  }

  function historyChoiceMarkup(name, choices, columns = 3) {
    return `<div class="history-choice-grid" style="--history-choice-columns:${columns}">${choices.map((choice) => `<label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(choice)}"><span>${escapeHtml(choice)}</span></label>`).join('')}</div>`;
  }

  function renderPatientHistoryPanel(patient) {
    const history = activePatientHistory || {
      medicalConditions: [],
      familyHistoryMembers: [],
      personalHistory: null,
      femaleHistory: null,
    };
    const conditions = Array.isArray(history.medicalConditions) ? history.medicalConditions : [];
    const familyMembers = Array.isArray(history.familyHistoryMembers) ? history.familyHistoryMembers : [];
    const personal = history.personalHistory || {};
    const female = history.femaleHistory || {};
    const canEdit = canManagePatientHistory();
    const conditionEntries = conditions.length
      ? `<div class="patient-profile-list">${conditions.map((condition) => `
        <article class="patient-profile-entry history-entry">
          <div class="patient-profile-entry-head"><b>${escapeHtml(condition.condition)}</b><span>${escapeHtml(condition.status || 'ACTIVE')}${condition.diagnosedAt ? ` · Diagnosed ${escapeHtml(formatDate(String(condition.diagnosedAt).slice(0, 10)))}` : ''}</span></div>
          ${condition.currentMedication ? `<p><b>Current medication:</b> ${recordText(condition.currentMedication)}</p>` : ''}
          ${condition.previousTreatment ? `<p><b>Previous treatment:</b> ${recordText(condition.previousTreatment)}</p>` : ''}
          ${condition.doctorRemarks ? `<p><b>Doctor remarks:</b> ${recordText(condition.doctorRemarks)}</p>` : ''}
          ${canEdit && condition.status !== 'RESOLVED' ? `<button type="button" class="action-button" data-resolve-medical-condition="${escapeHtml(condition.id)}">Mark resolved</button>` : ''}
        </article>`).join('')}</div>`
      : '<div class="empty-state"><span>◇</span><b>No structured conditions recorded</b><p>Add a known or custom condition below. Older free-text history remains visible with the patient details.</p></div>';
    const familyEntries = familyMembers.length
      ? `<div class="patient-profile-list">${familyMembers.map((member) => `
        <article class="patient-profile-entry history-entry">
          <div class="patient-profile-entry-head"><b>${escapeHtml(member.relationship === 'Other' ? member.customRelationship || 'Other' : member.relationship)}</b><span>${member.ageAtDiagnosis !== null && member.ageAtDiagnosis !== undefined ? `Age at diagnosis ${escapeHtml(member.ageAtDiagnosis)}` : 'Age not recorded'}</span></div>
          <p><b>Conditions:</b> ${escapeHtml((member.conditions || []).map((item) => item.condition).join(', ') || 'Not recorded')}</p>
          ${member.remarks ? `<p><b>Remarks:</b> ${recordText(member.remarks)}</p>` : ''}
        </article>`).join('')}</div>`
      : '<div class="empty-state"><span>◇</span><b>No family history recorded</b><p>Add each relative separately and select all known conditions.</p></div>';
    const patientIsFemale = String(patient.gender || '').toLowerCase() === 'female';

    return `
      <section class="patient-history-section">
        <div class="patient-section-heading"><div><h3>Medical conditions</h3><p>Long-term conditions and prior treatment; each entry remains linked to this patient.</p></div></div>
        <section class="patient-alert-card ${patient.allergies ? '' : 'patient-alert-empty'}"><b>Allergy history</b><p>${recordText(patient.allergies || 'No allergy information recorded. Confirm allergy status with the patient.')}</p></section>
        ${conditionEntries}
        ${canEdit ? `<form class="form-grid history-edit-form" data-patient-history-form="condition">
          <h4 class="form-full">Add medical condition</h4>
          <label class="form-full">Select one or more conditions</label>
          ${historyChoiceMarkup('conditions', STANDARD_MEDICAL_CONDITIONS, 2)}
          <label>Custom condition<input name="customCondition" maxlength="160" placeholder="Add another condition" /></label>
          <label>Diagnosis date<input name="diagnosedAt" type="date" max="${dateKey(today)}" /></label>
          <label class="form-full">Current medication<textarea name="currentMedication" rows="2" maxlength="2000"></textarea></label>
          <label class="form-full">Previous treatment<textarea name="previousTreatment" rows="2" maxlength="2000"></textarea></label>
          <label>Status<select name="status"><option value="ACTIVE">Active</option><option value="CONTROLLED">Controlled</option><option value="RESOLVED">Resolved</option></select></label>
          <label class="form-full">Doctor remarks<textarea name="doctorRemarks" rows="2" maxlength="4000"></textarea></label>
          <div class="form-actions"><button class="button button-primary" type="submit">Save selected conditions</button></div>
        </form>` : ''}
      </section>
      <section class="patient-history-section">
        <div class="patient-section-heading"><div><h3>Family medical history</h3><p>Multiple relatives and multiple conditions can be recorded separately.</p></div></div>
        ${familyEntries}
        ${canEdit ? `<form class="form-grid history-edit-form" data-patient-history-form="family">
          <h4 class="form-full">Add family member</h4>
          <label>Relationship<select name="relationship" required>${FAMILY_RELATIONSHIPS.map((relationship) => `<option value="${escapeHtml(relationship)}">${escapeHtml(relationship)}</option>`).join('')}</select></label>
          <label>Other relationship<input name="customRelationship" maxlength="100" placeholder="Required for Other" /></label>
          <label>Age at diagnosis<input name="ageAtDiagnosis" type="number" min="0" max="130" step="1" /></label>
          <label class="form-full">Conditions</label>
          ${historyChoiceMarkup('familyConditions', STANDARD_FAMILY_CONDITIONS, 3)}
          <label>Other condition<input name="customFamilyCondition" maxlength="160" /></label>
          <label class="form-full">Additional remarks<textarea name="remarks" rows="2" maxlength="4000"></textarea></label>
          <div class="form-actions"><button class="button button-primary" type="submit">Save family history</button></div>
        </form>` : ''}
      </section>
      <section class="patient-history-section">
        <div class="patient-section-heading"><div><h3>Personal history</h3><p>Habits and sleep pattern reported by the patient.</p></div></div>
        ${canEdit ? `<form class="form-grid history-edit-form" data-patient-history-form="personal">
          ${[['alcohol', 'Alcohol'], ['smoking', 'Smoking'], ['tobaccoChewing', 'Tobacco chewing'], ['sleepAdequate', 'Sleep adequate']].map(([name, label]) => `<label>${label}<select name="${name}"><option value="">Not recorded</option><option value="true" ${personal[name] === true ? 'selected' : ''}>Yes</option><option value="false" ${personal[name] === false ? 'selected' : ''}>No</option></select></label>`).join('')}
          <label>Alcohol frequency<input name="alcoholFrequency" maxlength="160" value="${escapeHtml(personal.alcoholFrequency || '')}" /></label>
          <label>Alcohol quantity<input name="alcoholQuantity" maxlength="160" value="${escapeHtml(personal.alcoholQuantity || '')}" /></label>
          <label>Smoking duration<input name="smokingDuration" maxlength="160" value="${escapeHtml(personal.smokingDuration || '')}" /></label>
          <label>Tobacco duration<input name="tobaccoDuration" maxlength="160" value="${escapeHtml(personal.tobaccoDuration || '')}" /></label>
          <label>Coffee per day<input name="coffeePerDay" type="number" min="0" max="100" step="1" value="${escapeHtml(personal.coffeePerDay ?? '')}" /></label>
          <label>Tea per day<input name="teaPerDay" type="number" min="0" max="100" step="1" value="${escapeHtml(personal.teaPerDay ?? '')}" /></label>
          <label>Sleeping hours<input name="sleepingHours" type="number" min="0" max="24" step="0.5" value="${escapeHtml(personal.sleepingHours ?? '')}" /></label>
          <label class="form-full">Other habits<textarea name="otherHabits" rows="2" maxlength="4000">${escapeHtml(personal.otherHabits || '')}</textarea></label>
          <div class="form-actions"><button class="button button-primary" type="submit">Save personal history</button></div>
        </form>` : `<div class="patient-profile-info-grid"><section><dl>${[['Alcohol', patientHistoryBoolean(personal.alcohol)], ['Smoking', patientHistoryBoolean(personal.smoking)], ['Tobacco chewing', patientHistoryBoolean(personal.tobaccoChewing)], ['Coffee per day', personal.coffeePerDay], ['Tea per day', personal.teaPerDay], ['Sleep adequate', patientHistoryBoolean(personal.sleepAdequate)], ['Sleeping hours', personal.sleepingHours], ['Other habits', personal.otherHabits]].map(([label, value]) => `<div><dt>${label}</dt><dd>${recordText(value)}</dd></div>`).join('')}</dl></section></div>`}
      </section>
      ${patientIsFemale ? `<section class="patient-history-section">
        <div class="patient-section-heading"><div><h3>Female patient history</h3><p>Restricted to female patient profiles.</p></div></div>
        ${canEdit ? `<form class="form-grid history-edit-form" data-patient-history-form="female">
          <label>Menstrual cycle<select name="menstrualCycle"><option value="">Not recorded</option><option value="REGULAR" ${female.menstrualCycle === 'REGULAR' ? 'selected' : ''}>Regular</option><option value="IRREGULAR" ${female.menstrualCycle === 'IRREGULAR' ? 'selected' : ''}>Irregular</option></select></label>
          <label>Last menstrual period<input name="lastMenstrualPeriod" type="date" max="${dateKey(today)}" value="${escapeHtml(female.lastMenstrualPeriod ? String(female.lastMenstrualPeriod).slice(0, 10) : '')}" /></label>
          <label>Cycle duration (days)<input name="cycleDurationDays" type="number" min="1" max="120" value="${escapeHtml(female.cycleDurationDays ?? '')}" /></label>
          <label>Menstrual complaints<input name="menstrualComplaints" maxlength="4000" value="${escapeHtml(female.menstrualComplaints || '')}" /></label>
          <label>White discharge<select name="whiteDischarge"><option value="">Not recorded</option><option value="true" ${female.whiteDischarge === true ? 'selected' : ''}>Yes</option><option value="false" ${female.whiteDischarge === false ? 'selected' : ''}>No</option></select></label>
          <label>Duration<input name="dischargeDuration" maxlength="160" value="${escapeHtml(female.dischargeDuration || '')}" /></label>
          <label class="form-full">Associated symptoms<textarea name="associatedSymptoms" rows="2" maxlength="2000">${escapeHtml(female.associatedSymptoms || '')}</textarea></label>
          <label class="form-full">Doctor remarks<textarea name="doctorRemarks" rows="2" maxlength="4000">${escapeHtml(female.doctorRemarks || '')}</textarea></label>
          <div class="form-actions"><button class="button button-primary" type="submit">Save female history</button></div>
        </form>` : `<div class="patient-profile-info-grid"><section><dl>${[['Menstrual cycle', female.menstrualCycle || 'Not recorded'], ['Last menstrual period', female.lastMenstrualPeriod ? formatDate(String(female.lastMenstrualPeriod).slice(0, 10)) : 'Not recorded'], ['Cycle duration', female.cycleDurationDays ? `${female.cycleDurationDays} days` : 'Not recorded'], ['Menstrual complaints', female.menstrualComplaints], ['White discharge', patientHistoryBoolean(female.whiteDischarge)], ['Duration', female.dischargeDuration], ['Associated symptoms', female.associatedSymptoms], ['Doctor remarks', female.doctorRemarks]].map(([label, value]) => `<div><dt>${label}</dt><dd>${recordText(value)}</dd></div>`).join('')}</dl></section></div>`}
      </section>` : ''}
      <section class="patient-history-section"><h3>Existing history notes</h3><div class="patient-profile-info-grid"><section><dl><div><dt>Existing conditions / history</dt><dd>${recordText(patient.medicalHistory)}</dd></div><div><dt>Surgical history</dt><dd>${recordText(patient.surgicalHistory)}</dd></div><div><dt>Current medications</dt><dd>${recordText(patient.currentMedications)}</dd></div></dl></section></div></section>`;
  }

  function renderPatientFamilyHistoryPanel() {
    const members = Array.isArray(activePatientHistory?.familyHistoryMembers)
      ? activePatientHistory.familyHistoryMembers
      : [];
    const entries = members.length
      ? `<div class="patient-profile-list">${members.map((member) => `
        <article class="patient-profile-entry history-entry">
          <div class="patient-profile-entry-head"><b>${escapeHtml(member.relationship === 'Other' ? member.customRelationship || 'Other' : member.relationship)}</b><span>${member.ageAtDiagnosis !== null && member.ageAtDiagnosis !== undefined ? `Age at diagnosis ${escapeHtml(member.ageAtDiagnosis)}` : 'Age not recorded'}</span></div>
          <p><b>Conditions:</b> ${escapeHtml((member.conditions || []).map((item) => item.condition).join(', ') || 'Not recorded')}</p>
          ${member.remarks ? `<p><b>Remarks:</b> ${recordText(member.remarks)}</p>` : ''}
        </article>`).join('')}</div>`
      : '<div class="empty-state"><span>◇</span><b>No family history recorded</b><p>Add each relative separately and select all known conditions.</p></div>';
    return `<section class="patient-history-section">
      <div class="patient-section-heading"><div><h3>Family medical history</h3><p>Family conditions are kept separately from the patient’s own medical history.</p></div></div>
      ${entries}
      ${canManagePatientHistory() ? `<form class="form-grid history-edit-form" data-patient-history-form="family">
        <h4 class="form-full">Add family member</h4>
        <label>Relationship<select name="relationship" required>${FAMILY_RELATIONSHIPS.map((relationship) => `<option value="${escapeHtml(relationship)}">${escapeHtml(relationship)}</option>`).join('')}</select></label>
        <label>Other relationship<input name="customRelationship" maxlength="100" placeholder="Required for Other" /></label>
        <label>Age at diagnosis<input name="ageAtDiagnosis" type="number" min="0" max="130" step="1" /></label>
        <label class="form-full">Conditions</label>
        ${historyChoiceMarkup('familyConditions', STANDARD_FAMILY_CONDITIONS, 3)}
        <label>Other condition<input name="customFamilyCondition" maxlength="160" /></label>
        <label class="form-full">Additional remarks<textarea name="remarks" rows="2" maxlength="4000"></textarea></label>
        <div class="form-actions"><button class="button button-primary" type="submit">Save family history</button></div>
      </form>` : ''}
    </section>`;
  }

  function canManagePatientHistory() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'DOCTOR'].includes(getStoredApiUser()?.role);
  }

  function parseHistoryBoolean(value) {
    return value === 'true' ? true : value === 'false' ? false : null;
  }

  function parseHistoryNumber(value) {
    return value === '' ? null : Number(value);
  }

  async function reloadPatientHistory(patientId) {
    activePatientHistory = isApiConnected()
      ? await apiRequest(`/patients/${encodeURIComponent(patientId)}/history`)
      : localPatientHistory(patientId);
    const patient = patientById(patientId);
    if (patient && activePatientProfileId === patientId) renderPatientProfile(patient);
  }

  async function submitPatientHistoryForm(form) {
    const patientId = activePatientProfileId;
    if (!patientId) throw new Error('Patient profile is no longer active. Reopen it and retry.');
    const fields = new FormData(form);
    const value = (name) => String(fields.get(name) || '').trim();
    const checkedValues = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)]
      .map((input) => input.value);
    let path;
    let method = 'POST';
    let payload;

    if (form.dataset.patientHistoryForm === 'condition') {
      const conditions = [...new Set([
        ...checkedValues('conditions'),
        value('customCondition'),
      ].filter(Boolean))];
      if (!conditions.length) throw new Error('Select at least one condition or enter a custom condition.');
      path = `/patients/${encodeURIComponent(patientId)}/history/conditions`;
      payload = {
        conditions,
        diagnosedAt: value('diagnosedAt') || undefined,
        currentMedication: value('currentMedication') || undefined,
        previousTreatment: value('previousTreatment') || undefined,
        status: value('status'),
        doctorRemarks: value('doctorRemarks') || undefined,
      };
    } else if (form.dataset.patientHistoryForm === 'family') {
      const conditions = [...new Set([
        ...checkedValues('familyConditions'),
        value('customFamilyCondition'),
      ].filter(Boolean))];
      if (!conditions.length) throw new Error('Select at least one family condition or enter a custom condition.');
      const relationship = value('relationship');
      if (relationship === 'Other' && !value('customRelationship')) {
        throw new Error('Enter the family relationship when Other is selected.');
      }
      path = `/patients/${encodeURIComponent(patientId)}/history/family-members`;
      payload = {
        relationship,
        customRelationship: value('customRelationship') || undefined,
        ageAtDiagnosis: value('ageAtDiagnosis') ? Number(value('ageAtDiagnosis')) : undefined,
        conditions,
        remarks: value('remarks') || undefined,
      };
    } else if (form.dataset.patientHistoryForm === 'personal') {
      path = `/patients/${encodeURIComponent(patientId)}/history/personal`;
      method = 'PUT';
      payload = {
        alcohol: parseHistoryBoolean(value('alcohol')),
        alcoholFrequency: value('alcoholFrequency') || null,
        alcoholQuantity: value('alcoholQuantity') || null,
        smoking: parseHistoryBoolean(value('smoking')),
        smokingDuration: value('smokingDuration') || null,
        tobaccoChewing: parseHistoryBoolean(value('tobaccoChewing')),
        tobaccoDuration: value('tobaccoDuration') || null,
        coffeePerDay: parseHistoryNumber(value('coffeePerDay')),
        teaPerDay: parseHistoryNumber(value('teaPerDay')),
        sleepAdequate: parseHistoryBoolean(value('sleepAdequate')),
        sleepingHours: parseHistoryNumber(value('sleepingHours')),
        otherHabits: value('otherHabits') || null,
      };
    } else if (form.dataset.patientHistoryForm === 'female') {
      path = `/patients/${encodeURIComponent(patientId)}/history/female`;
      method = 'PUT';
      payload = {
        menstrualCycle: value('menstrualCycle') || null,
        lastMenstrualPeriod: value('lastMenstrualPeriod') || null,
        cycleDurationDays: parseHistoryNumber(value('cycleDurationDays')),
        menstrualComplaints: value('menstrualComplaints') || null,
        whiteDischarge: parseHistoryBoolean(value('whiteDischarge')),
        dischargeDuration: value('dischargeDuration') || null,
        associatedSymptoms: value('associatedSymptoms') || null,
        doctorRemarks: value('doctorRemarks') || null,
      };
    } else {
      throw new Error('Unknown patient history form.');
    }

    if (isApiConnected()) {
      await apiRequest(path, { method, body: JSON.stringify(payload) });
      await reloadPatientHistory(patientId);
    } else {
      const history = localPatientHistory(patientId);
      if (form.dataset.patientHistoryForm === 'condition') {
        payload.conditions.forEach((condition) => {
          history.medicalConditions.unshift({
            id: makeId('condition'),
            condition,
            diagnosedAt: payload.diagnosedAt || null,
            currentMedication: payload.currentMedication || null,
            previousTreatment: payload.previousTreatment || null,
            status: payload.status,
            doctorRemarks: payload.doctorRemarks || null,
            createdAt: new Date().toISOString(),
          });
        });
      } else if (form.dataset.patientHistoryForm === 'family') {
        history.familyHistoryMembers.unshift({
          id: makeId('family'),
          relationship: payload.relationship,
          customRelationship: payload.customRelationship || null,
          ageAtDiagnosis: payload.ageAtDiagnosis ?? null,
          remarks: payload.remarks || null,
          conditions: payload.conditions.map((condition) => ({ condition })),
          createdAt: new Date().toISOString(),
        });
      } else if (form.dataset.patientHistoryForm === 'personal') {
        history.personalHistory = { ...(history.personalHistory || {}), ...payload };
      } else {
        history.femaleHistory = { ...(history.femaleHistory || {}), ...payload };
      }
      activePatientHistory = history;
      save();
      const patient = patientById(patientId);
      if (patient) renderPatientProfile(patient);
    }
    showToast('Patient history saved.');
  }

  function canAccessPatientVitals() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(getStoredApiUser()?.role);
  }

  function normalizePatientVitalsRecord(record) {
    const numberOrNull = (value) => value === null || value === undefined || value === '' ? null : Number(value);
    const encounter = record.encounter || {};
    return {
      ...record,
      systolicMmHg: numberOrNull(record.systolicMmHg),
      diastolicMmHg: numberOrNull(record.diastolicMmHg),
      pulseBpm: numberOrNull(record.pulseBpm),
      respiratoryRateBpm: numberOrNull(record.respiratoryRateBpm),
      temperatureC: numberOrNull(record.temperatureC),
      temperatureF: numberOrNull(record.temperatureF),
      spo2Percent: numberOrNull(record.spo2Percent),
      cbgMgDl: numberOrNull(record.cbgMgDl),
      heightCm: numberOrNull(record.heightCm),
      weightKg: numberOrNull(record.weightKg),
      heightEnteredValue: record.heightEnteredValue || '',
      heightEnteredUnit: record.heightEnteredUnit || '',
      weightEnteredValue: numberOrNull(record.weightEnteredValue),
      weightEnteredUnit: record.weightEnteredUnit || '',
      bmi: numberOrNull(record.bmi),
      encounterId: record.encounterId || encounter.id || '',
      visitDate: String(encounter.visitDate || record.visitDate || record.recordedAt || '').slice(0, 10),
      doctorName: encounter.doctorName || record.doctorName || '',
      recordedAt: record.recordedAt || record.visitDate || '',
    };
  }

  function patientAgeYearsAt(patient, recordedAt) {
    if (!patient?.dob) return null;
    const birthDate = new Date(`${patient.dob}T00:00:00`);
    const measuredDate = recordedAt ? new Date(recordedAt) : new Date();
    if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(measuredDate.getTime())) return null;
    return Math.max(0, (measuredDate.getTime() - birthDate.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
  }

  function vitalReferenceStatus(metric, value, patient, recordedAt) {
    if (value === null || value === undefined || value === '') return { label: 'Not recorded', className: '' };
    const age = patientAgeYearsAt(patient, recordedAt);
    if (age === null) return { label: 'Not configured', className: 'not-configured' };
    const ranges = Array.isArray(data.settings.vitalReferenceRanges) ? data.settings.vitalReferenceRanges : [];
    const range = ranges.find((item) => item.metric === metric
      && age >= Number(item.minAgeYears)
      && age <= Number(item.maxAgeYears));
    if (!range) return { label: 'Not configured', className: 'not-configured' };
    if (Number(value) < Number(range.low)) return { label: 'Low', className: 'low' };
    if (Number(value) > Number(range.high)) return { label: 'High', className: 'high' };
    return { label: 'Normal', className: 'normal' };
  }

  function vitalStatusElementMarkup(metric, value, patient, recordedAt) {
    const status = vitalReferenceStatus(metric, value, patient, recordedAt);
    return `<small class="vital-reading-status ${status.className}">${escapeHtml(status.label)}</small>`;
  }

  function updateCheckInVitalsPreview() {
    const form = document.getElementById('checkInForm');
    if (!form) return;
    const field = (name) => form.elements.namedItem(name);
    const hasInvalidValue = (name) => {
      const input = field(name);
      return Boolean(input && input.value !== '' && !input.validity.valid);
    };
    const numeric = (name) => {
      const input = field(name);
      if (!input || input.value === '' || !input.validity.valid) return null;
      const value = Number(input.value);
      return Number.isFinite(value) ? value : null;
    };
    const patient = patientById(field('patientId')?.value || '');
    const statusAt = new Date().toISOString();
    const typeLabel = document.getElementById('checkInPatientType');
    if (typeLabel) {
      const isExisting = Boolean(patient?.lastVisit) || Boolean(patient && getPatientRecords(patient.id).length);
      typeLabel.textContent = patient ? (isExisting ? 'Existing patient' : 'New patient') : 'Select patient';
    }

    const temperatureUnit = field('temperatureUnit')?.value || 'CELSIUS';
    const temperatureInput = field('temperatureValue');
    if (temperatureInput) {
      temperatureInput.min = temperatureUnit === 'FAHRENHEIT' ? '32' : '0';
      temperatureInput.max = temperatureUnit === 'FAHRENHEIT' ? '140' : '60';
    }
    const weightUnit = field('weightUnit')?.value || 'KILOGRAMS';
    const weightInput = field('weightValue');
    if (weightInput) weightInput.max = weightUnit === 'POUNDS' ? '2204.62' : '1000';

    const systolicInput = field('systolicMmHg');
    const diastolicInput = field('diastolicMmHg');
    diastolicInput?.setCustomValidity('');
    if (systolicInput?.value && diastolicInput?.value
      && systolicInput.validity.valid && diastolicInput.validity.valid
      && Number(diastolicInput.value) >= Number(systolicInput.value)) {
      diastolicInput.setCustomValidity('Diastolic BP must be lower than systolic BP.');
    }

    const heightUnit = field('heightUnit')?.value || 'CENTIMETERS';
    const cmFields = document.getElementById('checkInHeightCmFields');
    const feetFields = document.getElementById('checkInHeightFeetFields');
    cmFields?.classList.toggle('hidden', heightUnit !== 'CENTIMETERS');
    feetFields?.classList.toggle('hidden', heightUnit !== 'FEET_INCHES');
    const heightFeetInput = field('heightFeet');
    const heightInchesInput = field('heightInches');
    const heightCmInput = field('heightValue');
    if (heightCmInput) heightCmInput.disabled = heightUnit !== 'CENTIMETERS';
    if (heightFeetInput) heightFeetInput.disabled = heightUnit !== 'FEET_INCHES';
    if (heightInchesInput) heightInchesInput.disabled = heightUnit !== 'FEET_INCHES';
    heightFeetInput?.setCustomValidity('');
    let heightCm = null;
    const heightValue = numeric('heightValue');
    const heightFeet = numeric('heightFeet');
    const heightInches = numeric('heightInches');
    const heightHasInput = heightUnit === 'CENTIMETERS'
      ? Boolean(field('heightValue')?.value)
      : Boolean(heightFeetInput?.value || field('heightInches')?.value);
    let heightOutOfRange = false;
    if (heightUnit === 'CENTIMETERS' && heightValue !== null) {
      heightCm = heightValue;
    } else if (heightUnit === 'FEET_INCHES' && (heightFeet !== null || heightInches !== null)) {
      heightCm = ((heightFeet || 0) * 12 + (heightInches || 0)) * 2.54;
    }
    heightOutOfRange = heightCm !== null && (heightCm < 20 || heightCm > 300);
    if (heightUnit === 'FEET_INCHES' && heightHasInput && heightOutOfRange) {
      heightFeetInput?.setCustomValidity('Enter a height between 20 and 300 cm.');
    }
    const heightInvalid = heightOutOfRange || hasInvalidValue(heightUnit === 'CENTIMETERS' ? 'heightValue' : 'heightFeet')
      || (heightUnit === 'FEET_INCHES' && hasInvalidValue('heightInches'));
    const heightConversion = document.getElementById('checkInHeightConversion');
    if (heightInvalid) {
      heightCm = null;
      heightConversion.textContent = 'Check value.';
    } else if (heightCm !== null) {
      const totalInches = heightCm / 2.54;
      heightConversion.textContent =
        `${Math.floor(totalInches / 12)} ft ${formatVitalNumber(totalInches % 12)} in`;
    } else {
      heightConversion.textContent = 'Equivalent height appears here.';
    }

    const weightValue = numeric('weightValue');
    const weightInvalid = hasInvalidValue('weightValue');
    const weightKg = weightValue === null || weightInvalid
      ? null
      : weightUnit === 'POUNDS' ? weightValue / 2.2046226218 : weightValue;
    const weightConversion = document.getElementById('checkInWeightConversion');
    if (weightInvalid) {
      weightConversion.textContent = 'Check value.';
    } else if (weightKg === null) {
      weightConversion.textContent = 'Equivalent weight appears here.';
    } else {
      weightConversion.textContent =
        `${formatVitalNumber(weightUnit === 'POUNDS' ? weightKg : weightKg * 2.2046226218)} ${weightUnit === 'POUNDS' ? 'kg' : 'lb'}`;
    }

    const temperatureValue = numeric('temperatureValue');
    const temperatureInvalid = hasInvalidValue('temperatureValue');
    const temperatureC = temperatureValue === null || temperatureInvalid
      ? null
      : temperatureUnit === 'FAHRENHEIT' ? (temperatureValue - 32) * 5 / 9 : temperatureValue;
    const temperatureConversion = document.getElementById('checkInTemperatureConversion');
    if (temperatureC === null) {
      temperatureConversion.textContent = temperatureInvalid ? 'Check value.' : 'Converted temperature appears here.';
    } else {
      temperatureConversion.textContent =
        `${formatVitalNumber(temperatureUnit === 'FAHRENHEIT' ? temperatureC : (temperatureC * 9 / 5) + 32)} ${temperatureUnit === 'FAHRENHEIT' ? '°C' : '°F'}`;
    }

    const bmi = heightCm && weightKg && !heightInvalid && !weightInvalid ? weightKg / ((heightCm / 100) ** 2) : null;
    document.getElementById('checkInBmi').textContent = bmi === null ? '—' : formatVitalNumber(bmi);
    const systolic = numeric('systolicMmHg');
    const diastolic = numeric('diastolicMmHg');
    const readings = {
      systolicMmHg: systolic,
      diastolicMmHg: diastolic,
      pulseBpm: numeric('pulseBpm'),
      temperatureC,
      respiratoryRateBpm: numeric('respiratoryRateBpm'),
      spo2Percent: numeric('spo2Percent'),
      heightCm,
      weightKg,
      bmi,
      cbgMgDl: numeric('cbgMgDl'),
    };
    const invalidFieldsByMetric = {
      systolicMmHg: ['systolicMmHg'],
      diastolicMmHg: ['diastolicMmHg'],
      pulseBpm: ['pulseBpm'],
      temperatureC: ['temperatureValue'],
      respiratoryRateBpm: ['respiratoryRateBpm'],
      spo2Percent: ['spo2Percent'],
      heightCm: heightUnit === 'CENTIMETERS' ? ['heightValue'] : ['heightFeet', 'heightInches'],
      weightKg: ['weightValue'],
      bmi: ['heightValue', 'heightFeet', 'heightInches', 'weightValue'],
      cbgMgDl: ['cbgMgDl'],
    };
    Object.entries(readings).forEach(([metric, value]) => {
      const invalid = metric === 'heightCm'
        ? heightInvalid
        : metric === 'weightKg'
          ? weightInvalid
          : metric === 'bmi'
            ? heightInvalid || weightInvalid
            : invalidFieldsByMetric[metric].some(hasInvalidValue);
      const status = invalid
        ? { label: metric === 'bmi' ? 'Check inputs' : 'Check value', className: 'invalid-reading' }
        : vitalReferenceStatus(metric, value, patient, statusAt);
      const element = form.querySelector(`[data-vital-status="${metric}"]`);
      if (!element) return;
      element.textContent = status.label;
      element.className = `vital-reading-status ${status.className}`;
      element.hidden = status.className === 'not-configured';
    });

    const referenceNotice = document.getElementById('checkInVitalReferenceNotice');
    if (referenceNotice) {
      const ranges = Array.isArray(data.settings.vitalReferenceRanges) ? data.settings.vitalReferenceRanges : [];
      referenceNotice.textContent = !ranges.length
        ? 'No clinic-approved reference ranges are configured. Vitals cannot be classified Low/Normal/High.'
        : patientAgeYearsAt(patient, statusAt) === null
          ? 'Add the patient date of birth to apply age-specific reference ranges. Readings remain unclassified.'
          : 'Only readings with a matching age-specific clinic range are classified. Other readings remain unclassified.';
    }
  }

  function checkInVitalsPayload(form) {
    const fields = new FormData(form);
    const value = (name) => {
      const raw = String(fields.get(name) || '').trim();
      return raw === '' ? undefined : Number(raw);
    };
    const payload = {
      systolicMmHg: value('systolicMmHg'),
      diastolicMmHg: value('diastolicMmHg'),
      pulseBpm: value('pulseBpm'),
      respiratoryRateBpm: value('respiratoryRateBpm'),
      temperatureValue: value('temperatureValue'),
      spo2Percent: value('spo2Percent'),
      cbgMgDl: value('cbgMgDl'),
    };
    if (payload.temperatureValue !== undefined) payload.temperatureUnit = String(fields.get('temperatureUnit') || 'CELSIUS');
    const heightUnit = String(fields.get('heightUnit') || 'CENTIMETERS');
    if (heightUnit === 'CENTIMETERS' && value('heightValue') !== undefined) {
      payload.heightUnit = heightUnit;
      payload.heightValue = value('heightValue');
    } else if (heightUnit === 'FEET_INCHES' && (value('heightFeet') !== undefined || value('heightInches') !== undefined)) {
      payload.heightUnit = heightUnit;
      payload.heightFeet = value('heightFeet');
      payload.heightInches = value('heightInches');
    }
    if (value('weightValue') !== undefined) {
      payload.weightUnit = String(fields.get('weightUnit') || 'KILOGRAMS');
      payload.weightValue = value('weightValue');
    }
    const readings = [
      payload.systolicMmHg, payload.diastolicMmHg, payload.pulseBpm, payload.respiratoryRateBpm,
      payload.temperatureValue, payload.spo2Percent, payload.cbgMgDl, payload.heightValue,
      payload.heightFeet, payload.heightInches, payload.weightValue,
    ];
    return readings.some((reading) => reading !== undefined) ? payload : undefined;
  }

  function localCheckInVitalsRecord(payload, patient, encounterId, doctor, recordedAt) {
    const temperatureC = payload.temperatureValue === undefined
      ? null
      : payload.temperatureUnit === 'FAHRENHEIT'
        ? (payload.temperatureValue - 32) * 5 / 9
        : payload.temperatureValue;
    const temperatureF = temperatureC === null ? null : temperatureC * 9 / 5 + 32;
    let heightCm = null;
    if (payload.heightUnit === 'CENTIMETERS') heightCm = payload.heightValue;
    else if (payload.heightUnit === 'FEET_INCHES') {
      heightCm = ((payload.heightFeet || 0) * 12 + (payload.heightInches || 0)) * 2.54;
    }
    const weightKg = payload.weightValue === undefined
      ? null
      : payload.weightUnit === 'POUNDS' ? payload.weightValue / 2.2046226218 : payload.weightValue;
    const bmi = heightCm && weightKg ? weightKg / ((heightCm / 100) ** 2) : null;
    return normalizePatientVitalsRecord({
      patientId: patient.id,
      encounterId,
      visitDate: String(recordedAt).slice(0, 10),
      recordedAt,
      recordedBy: { email: 'Front office', role: 'RECEPTIONIST' },
      doctorName: doctor,
      systolicMmHg: payload.systolicMmHg ?? null,
      diastolicMmHg: payload.diastolicMmHg ?? null,
      pulseBpm: payload.pulseBpm ?? null,
      respiratoryRateBpm: payload.respiratoryRateBpm ?? null,
      temperatureC,
      temperatureF,
      temperatureEnteredUnit: payload.temperatureUnit || null,
      spo2Percent: payload.spo2Percent ?? null,
      cbgMgDl: payload.cbgMgDl ?? null,
      heightCm,
      heightEnteredValue: payload.heightUnit === 'FEET_INCHES'
        ? `${payload.heightFeet || 0} ft ${payload.heightInches || 0} in`
        : payload.heightValue === undefined ? '' : String(payload.heightValue),
      heightEnteredUnit: payload.heightUnit || '',
      weightKg,
      weightEnteredValue: payload.weightValue ?? null,
      weightEnteredUnit: payload.weightUnit || '',
      bmi,
    });
  }

  function getPatientVitalsHistory(patientId) {
    const savedVitals = activePatientProfileId === patientId
      ? activePatientVitals
      : (data.patientVitals || []).filter((record) => record.patientId === patientId).map(normalizePatientVitalsRecord);
    const legacyVitals = canViewClinicalRecords() ? getPatientRecords(patientId).flatMap((record) => {
      const bloodPressure = String(record.bloodPressure || '').match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
      const legacy = normalizePatientVitalsRecord({
        id: `legacy-${record.id}`,
        patientId,
        encounterId: record.id,
        visitDate: record.visitDate,
        recordedAt: record.createdAt || record.visitDate,
        doctorName: record.doctorName,
        systolicMmHg: bloodPressure ? Number(bloodPressure[1]) : null,
        diastolicMmHg: bloodPressure ? Number(bloodPressure[2]) : null,
        pulseBpm: record.pulseBpm,
        temperatureC: record.temperatureC,
        spo2Percent: record.spo2Percent,
        cbgMgDl: record.cbgMgDl,
        heightCm: record.heightCm,
        weightKg: record.weightKg,
        bmi: record.bmi,
        source: 'legacy',
      });
      const hasReadings = [
        legacy.systolicMmHg, legacy.diastolicMmHg, legacy.pulseBpm, legacy.temperatureC,
        legacy.respiratoryRateBpm, legacy.spo2Percent, legacy.cbgMgDl, legacy.heightCm, legacy.weightKg, legacy.bmi,
      ].some((value) => value !== null);
      const alreadyStored = savedVitals.some((saved) => saved.encounterId === record.id
        && [
          'systolicMmHg', 'diastolicMmHg', 'pulseBpm', 'temperatureC', 'respiratoryRateBpm',
          'spo2Percent', 'cbgMgDl', 'heightCm', 'weightKg', 'bmi',
        ].every((key) => {
          const savedValue = saved[key] == null ? null : Number(saved[key]);
          const legacyValue = legacy[key] == null ? null : Number(legacy[key]);
          return savedValue === legacyValue;
        }));
      return !alreadyStored && hasReadings ? [legacy] : [];
    }) : [];
    return [...savedVitals, ...legacyVitals]
      .sort((left, right) => String(right.recordedAt || right.visitDate).localeCompare(String(left.recordedAt || left.visitDate)));
  }

  function getAvailablePatientVitalsEncounters(patientId) {
    const encounters = isApiConnected() && !canViewClinicalRecords()
      ? (data.queueTokens || [])
        .filter((token) => token.patientId === patientId
          && token.encounterId
          && ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(String(token.status || '').toUpperCase()))
        .map((token) => ({
          id: token.encounterId,
          visitDate: token.queueDate || dateKey(today),
          encounterType: token.encounterType || 'OPD',
          doctorName: token.doctor || 'Doctor',
        }))
      : getPatientRecords(patientId);
    return encounters
      .filter((record) => record.id
        && !['CLOSED', 'COMPLETED', 'CANCELLED'].includes(String(record.status || '').toUpperCase()))
      .sort((left, right) => String(right.visitDate || '').localeCompare(String(left.visitDate || '')));
  }

  function filterPatientVitals(records) {
    if (activePatientVitalsRange === 'all') return records;
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(activePatientVitalsRange) + 1);
    const fromDate = dateKey(from);
    return records.filter((record) => String(record.visitDate || record.recordedAt || '').slice(0, 10) >= fromDate);
  }

  function formatVitalNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    return Number(value).toFixed(2).replace(/\.?0+$/, '');
  }

  function patientVitalsChartMarkup(records, title, series, chartType) {
    const values = records.flatMap((record) => series
      .map((item) => Number(record[item.key]))
      .filter((value) => Number.isFinite(value)));
    if (!values.length) {
      return `<article class="patient-vitals-chart"><h4>${escapeHtml(title)}</h4><p>No readings for this period.</p></article>`;
    }

    const width = 360;
    const height = 150;
    const left = 38;
    const right = 350;
    const top = 14;
    const bottom = 106;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = maximum === minimum ? Math.max(Math.abs(minimum) * 0.1, 1) : (maximum - minimum) * 0.12;
    const low = minimum - padding;
    const high = maximum + padding;
    const xFor = (index) => records.length < 2 ? (left + right) / 2 : left + index * (right - left) / (records.length - 1);
    const yFor = (value) => bottom - ((value - low) / (high - low)) * (bottom - top);
    const grid = [0, 1, 2].map((index) => {
      const y = top + index * ((bottom - top) / 2);
      const value = high - index * ((high - low) / 2);
      return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" class="patient-vitals-gridline"/><text x="${left - 5}" y="${y + 3}" text-anchor="end" class="patient-vitals-axis-label">${escapeHtml(formatVitalNumber(value))}</text>`;
    }).join('');
    const marks = series.map((item, seriesIndex) => {
      const points = records.map((record, index) => {
        const value = Number(record[item.key]);
        return Number.isFinite(value) ? { x: xFor(index), y: yFor(value), value } : null;
      }).filter(Boolean);
      if (!points.length) return '';
      if (chartType === 'bar') {
        const slotWidth = (right - left) / Math.max(records.length, 1);
        const barWidth = Math.min(14, (slotWidth * 0.7) / series.length);
        return points.map((point) => {
          const x = point.x - (series.length * barWidth) / 2 + seriesIndex * barWidth;
          const barHeight = Math.max(1, bottom - point.y);
          return `<rect x="${x}" y="${point.y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${item.color}"><title>${escapeHtml(`${item.label}: ${formatVitalNumber(point.value)} ${item.unit || ''}`)}</title></rect>`;
        }).join('');
      }
      return `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${item.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3" fill="${item.color}"><title>${escapeHtml(`${item.label}: ${formatVitalNumber(point.value)} ${item.unit || ''}`)}</title></circle>`).join('')}`;
    }).join('');
    const dates = records.length === 1
      ? [{ index: 0, date: records[0].visitDate }]
      : [{ index: 0, date: records[0].visitDate }, { index: records.length - 1, date: records[records.length - 1].visitDate }];
    const dateLabels = dates.map(({ index, date }) => {
      const labelDate = date ? new Date(`${date}T00:00:00`) : null;
      const label = labelDate && Number.isFinite(labelDate.getTime())
        ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(labelDate)
        : '—';
      return `<text x="${xFor(index)}" y="${height - 12}" text-anchor="${index === 0 ? 'start' : 'end'}" class="patient-vitals-axis-label">${escapeHtml(label)}</text>`;
    }).join('');
    const legend = series.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.label)}${item.unit ? ` (${escapeHtml(item.unit)})` : ''}</span>`).join('');
    return `<article class="patient-vitals-chart"><h4>${escapeHtml(title)}</h4><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(`${title} ${chartType} history graph`)}">${grid}${marks}${dateLabels}</svg><div class="patient-vitals-legend">${legend}</div></article>`;
  }

  function renderPatientVitalsPanel(patient) {
    const allRecords = getPatientVitalsHistory(patient.id);
    const records = filterPatientVitals(allRecords);
    const chartRecords = [...records].reverse();
    const encounters = canAccessPatientVitals() ? getAvailablePatientVitalsEncounters(patient.id) : [];
    const entryMarkup = encounters.length
      ? `<section class="patient-vitals-entry-card"><div class="patient-vitals-section-heading"><div><h3>Record vitals</h3><p>Each reading is saved separately; earlier measurements remain in the history.</p></div></div><form id="patientVitalsForm" class="patient-vitals-form" data-patient-vitals-form>
          <label class="patient-vitals-visit-field">Visit <span>*</span><select name="encounterId" required>${encounters.map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(`${formatDate(record.visitDate)} · ${record.encounterType || 'OPD'} · ${record.doctorName || 'Doctor'}`)}</option>`).join('')}</select></label>
          <label>Systolic BP (mmHg)<input name="systolicMmHg" type="number" min="40" max="300" step="1" inputmode="numeric" /></label>
          <label>Diastolic BP (mmHg)<input name="diastolicMmHg" type="number" min="20" max="200" step="1" inputmode="numeric" /></label>
          <label>Pulse (BPM)<input name="pulseBpm" type="number" min="20" max="300" step="1" inputmode="numeric" /></label>
          <label>Respiratory rate (breaths/min)<input name="respiratoryRateBpm" type="number" min="0" max="200" step="1" inputmode="numeric" /></label>
          <label>Temperature<input name="temperatureValue" type="number" step="0.1" inputmode="decimal" /></label>
          <label>Temperature unit<select name="temperatureUnit"><option value="CELSIUS">°C Celsius</option><option value="FAHRENHEIT">°F Fahrenheit</option></select></label>
          <label>SpO2 (%)<input name="spo2Percent" type="number" min="0" max="100" step="0.1" inputmode="decimal" /></label>
          <label>CBG (mg/dL)<input name="cbgMgDl" type="number" min="0" max="2000" step="0.1" inputmode="decimal" /></label>
          <label>Height (cm)<input name="heightCm" type="number" min="20" max="300" step="0.1" inputmode="decimal" /></label>
          <label>Weight (kg)<input name="weightKg" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" /></label>
          <div class="patient-vitals-calculations"><output id="patientVitalsTemperaturePreview">Temperature conversion appears here.</output><output id="patientVitalsBmiPreview">BMI is calculated when height and weight are entered.</output></div>
          <div class="patient-vitals-form-actions"><button type="submit" class="button button-primary">Save vitals to visit</button></div>
        </form></section>`
      : `<section class="patient-vitals-entry-card"><div class="patient-vitals-section-heading"><div><h3>Record vitals</h3><p>No unrecorded active visit is available. Check in the patient to create a visit before recording vitals.</p></div></div></section>`;
    const charts = [
      patientVitalsChartMarkup(chartRecords, 'Blood pressure', [
        { key: 'systolicMmHg', label: 'Systolic', unit: 'mmHg', color: '#0da99b' },
        { key: 'diastolicMmHg', label: 'Diastolic', unit: 'mmHg', color: '#477be0' },
      ], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'Pulse rate', [{ key: 'pulseBpm', label: 'Pulse', unit: 'BPM', color: '#8266cf' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'Temperature', [{ key: 'temperatureC', label: 'Temperature', unit: '°C', color: '#cf5260' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'Respiratory rate', [{ key: 'respiratoryRateBpm', label: 'Respiratory rate', unit: 'breaths/min', color: '#477be0' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'SpO2', [{ key: 'spo2Percent', label: 'SpO2', unit: '%', color: '#249669' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'CBG', [{ key: 'cbgMgDl', label: 'CBG', unit: 'mg/dL', color: '#c67c16' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'Weight', [{ key: 'weightKg', label: 'Weight', unit: 'kg', color: '#168f83' }], activePatientVitalsChartType),
      patientVitalsChartMarkup(chartRecords, 'BMI', [{ key: 'bmi', label: 'BMI', unit: '', color: '#53677e' }], activePatientVitalsChartType),
    ].join('');
    const rows = records.map((record) => {
      const temperature = record.temperatureC === null
        ? '—'
        : `${formatVitalNumber(record.temperatureC)} °C${record.temperatureF !== null ? ` / ${formatVitalNumber(record.temperatureF)} °F` : ''}`;
      const recordedTime = record.recordedAt && Number.isFinite(new Date(record.recordedAt).getTime())
        ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(record.recordedAt))
        : '—';
      const recordedBy = record.recordedBy?.email || record.recordedBy?.role || (record.source === 'legacy' ? 'Historical visit' : 'Local record');
      return `<tr><td>${escapeHtml(formatDate(record.visitDate))}</td><td>${escapeHtml(recordedTime)}</td><td>${escapeHtml(record.doctorName || '—')}</td><td>${record.systolicMmHg !== null && record.diastolicMmHg !== null ? `${escapeHtml(record.systolicMmHg)}/${escapeHtml(record.diastolicMmHg)}` : '—'}</td><td>${record.pulseBpm !== null ? escapeHtml(record.pulseBpm) : '—'}</td><td>${escapeHtml(temperature)}</td><td>${record.respiratoryRateBpm !== null ? `${escapeHtml(record.respiratoryRateBpm)} breaths/min` : '—'}</td><td>${record.spo2Percent !== null ? `${escapeHtml(formatVitalNumber(record.spo2Percent))}%` : '—'}</td><td>${record.cbgMgDl !== null ? escapeHtml(formatVitalNumber(record.cbgMgDl)) : '—'}</td><td>${record.heightCm !== null ? escapeHtml(`${formatVitalNumber(record.heightCm)} cm`) : '—'}</td><td>${record.weightKg !== null ? escapeHtml(`${formatVitalNumber(record.weightKg)} kg`) : '—'}</td><td>${record.bmi !== null ? escapeHtml(formatVitalNumber(record.bmi)) : '—'}</td><td>${escapeHtml(recordedBy)}</td></tr>`;
    }).join('');
    return `${entryMarkup}<section class="patient-vitals-history-section"><div class="patient-vitals-section-heading"><div><h3>Vitals history</h3><p>${allRecords.length} recorded visit${allRecords.length === 1 ? '' : 's'} · charts show stored readings only.</p></div><div class="patient-vitals-chart-actions"><div class="patient-vitals-chart-type" role="group" aria-label="Vitals chart type"><button type="button" class="${activePatientVitalsChartType === 'line' ? 'active' : ''}" aria-pressed="${activePatientVitalsChartType === 'line'}" data-patient-vitals-chart-type="line">Line graph</button><button type="button" class="${activePatientVitalsChartType === 'bar' ? 'active' : ''}" aria-pressed="${activePatientVitalsChartType === 'bar'}" data-patient-vitals-chart-type="bar">Bar graph</button></div><label>Period<select id="patientVitalsRange"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 3 months</option><option value="180">Last 6 months</option><option value="365">Last year</option><option value="all">All time</option></select></label></div></div><div class="patient-vitals-chart-grid">${charts}</div><div class="patient-vitals-table-wrap"><table class="patient-vitals-history-table"><thead><tr><th>Visit date</th><th>Time recorded</th><th>Doctor</th><th>BP</th><th>Pulse</th><th>Temperature</th><th>Respiratory rate</th><th>SpO2</th><th>CBG</th><th>Height</th><th>Weight</th><th>BMI</th><th>Recorded by</th></tr></thead><tbody>${rows || '<tr><td colspan="13"><div class="empty-state"><b>No vitals recorded</b><p>Recorded readings will appear here with their visit date.</p></div></td></tr>'}</tbody></table></div></section>`;
  }

  function updatePatientVitalsPreview(form) {
    const temperature = String(form.elements.namedItem('temperatureValue').value || '');
    const temperatureUnit = form.elements.namedItem('temperatureUnit').value;
    const temperatureInput = form.elements.namedItem('temperatureValue');
    if (temperatureUnit === 'FAHRENHEIT') {
      temperatureInput.min = '32';
      temperatureInput.max = '140';
    } else {
      temperatureInput.min = '0';
      temperatureInput.max = '60';
    }
    const temperatureOutput = form.querySelector('#patientVitalsTemperaturePreview');
    if (!temperature) {
      temperatureOutput.textContent = 'Temperature conversion appears here.';
    } else {
      const value = Number(temperature);
      const converted = temperatureUnit === 'FAHRENHEIT'
        ? (value - 32) * 5 / 9
        : (value * 9 / 5) + 32;
      temperatureOutput.textContent = temperatureUnit === 'FAHRENHEIT'
        ? `${formatVitalNumber(value)} °F = ${formatVitalNumber(converted)} °C`
        : `${formatVitalNumber(value)} °C = ${formatVitalNumber(converted)} °F`;
    }
    const height = Number(form.elements.namedItem('heightCm').value);
    const weight = Number(form.elements.namedItem('weightKg').value);
    const bmiOutput = form.querySelector('#patientVitalsBmiPreview');
    bmiOutput.textContent = height > 0 && weight > 0
      ? `Calculated BMI: ${formatVitalNumber(weight / ((height / 100) ** 2))}`
      : 'BMI is calculated when height and weight are entered.';
  }

  async function submitPatientVitalsForm(form) {
    const patientId = form.dataset.patientId || activePatientProfileId;
    const field = (name) => form.elements?.namedItem(name) || form.querySelector(`[name="${name}"]`);
    const encounterId = String(field('encounterId')?.value || '');
    const encounter = getAvailablePatientVitalsEncounters(patientId).find((item) => item.id === encounterId);
    if (!patientId || !encounter) throw new Error('Select an active visit before recording vitals.');
    const value = (name) => String(field(name)?.value || '').trim();
    const number = (name) => value(name) === '' ? undefined : Number(value(name));
    const systolicMmHg = number('systolicMmHg');
    const diastolicMmHg = number('diastolicMmHg');
    if ((systolicMmHg === undefined) !== (diastolicMmHg === undefined)) {
      throw new Error('Enter both systolic and diastolic blood pressure readings.');
    }
    if (systolicMmHg !== undefined && systolicMmHg <= diastolicMmHg) {
      throw new Error('Systolic pressure must be greater than diastolic pressure.');
    }
    const temperatureValue = number('temperatureValue');
    const temperatureUnit = value('temperatureUnit');
    const payload = {
      systolicMmHg,
      diastolicMmHg,
      pulseBpm: number('pulseBpm'),
      respiratoryRateBpm: number('respiratoryRateBpm'),
      temperatureValue,
      temperatureUnit: temperatureValue === undefined ? undefined : temperatureUnit,
      spo2Percent: number('spo2Percent'),
      cbgMgDl: number('cbgMgDl'),
      heightCm: number('heightCm'),
      weightKg: number('weightKg'),
    };
    if (!Object.values(payload).some((reading) => reading !== undefined && reading !== 'CELSIUS' && reading !== 'FAHRENHEIT')) {
      throw new Error('Enter at least one vital reading.');
    }
    const submitButton = form.querySelector('button[type="submit"], [data-save-consultation-vitals]');
    submitButton.disabled = true;
    try {
      let savedRecord;
      if (isApiConnected()) {
        savedRecord = await apiRequest(
          `/patients/${encodeURIComponent(patientId)}/records/${encodeURIComponent(encounterId)}/vitals`,
          { method: 'POST', body: JSON.stringify(payload) },
        );
        if (!savedRecord?.id) throw new Error('The clinic API did not return the saved vitals record.');
        savedRecord = normalizePatientVitalsRecord(savedRecord);
      } else {
        const temperatureC = temperatureValue === undefined
          ? null
          : temperatureUnit === 'FAHRENHEIT' ? (temperatureValue - 32) * 5 / 9 : temperatureValue;
        const temperatureF = temperatureValue === undefined
          ? null
          : temperatureUnit === 'FAHRENHEIT' ? temperatureValue : (temperatureValue * 9 / 5) + 32;
        const heightCm = payload.heightCm ?? null;
        const weightKg = payload.weightKg ?? null;
        savedRecord = normalizePatientVitalsRecord({
          id: makeId('vitals'),
          patientId,
          encounterId,
          recordedAt: new Date().toISOString(),
          visitDate: encounter.visitDate || dateKey(today),
          doctorName: encounter.doctorName || '',
          systolicMmHg: systolicMmHg ?? null,
          diastolicMmHg: diastolicMmHg ?? null,
          pulseBpm: payload.pulseBpm ?? null,
          respiratoryRateBpm: payload.respiratoryRateBpm ?? null,
          temperatureC: temperatureC === null ? null : Math.round((temperatureC + Number.EPSILON) * 100) / 100,
          temperatureF: temperatureF === null ? null : Math.round((temperatureF + Number.EPSILON) * 100) / 100,
          temperatureEnteredUnit: temperatureValue === undefined ? null : temperatureUnit,
          spo2Percent: payload.spo2Percent ?? null,
          cbgMgDl: payload.cbgMgDl ?? null,
          heightCm,
          weightKg,
          bmi: heightCm && weightKg ? Math.round((weightKg / ((heightCm / 100) ** 2) + Number.EPSILON) * 100) / 100 : null,
        });
        data.patientVitals.push(savedRecord);
        save();
      }
      if (activePatientProfileId === patientId) {
        activePatientVitals = [savedRecord, ...activePatientVitals.filter((record) => record.id !== savedRecord.id)];
      }
      data.patientVitals = [
        savedRecord,
        ...(data.patientVitals || []).filter((record) => record.id !== savedRecord.id),
      ];
      const patient = patientById(patientId);
      if (patient && activePatientProfileId === patientId) renderPatientProfile(patient);
      if (!document.getElementById('consultationPrescriptionModal').classList.contains('hidden')) {
        renderConsultationPatientHeader(patientId, encounterId);
      }
      showToast('Vitals saved to the selected visit.');
    } finally {
      if (submitButton.isConnected) submitButton.disabled = false;
    }
  }

  function renderPatientProfile(patient) {
    const records = getPatientRecords(patient.id);
    const externalRecords = getExternalMedicalRecords(patient.id);
    const consumableUsages = isApiConnected()
      ? (data.consumableUsages || []).filter((usage) => usage.patientId === patient.id)
      : (data.inventoryMovements || []).filter((usage) => usage.kind === 'consumable' && usage.patientId === patient.id);
    const appointments = data.appointments.filter((item) => item.patientId === patient.id)
      .sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`));
    const invoices = data.invoices.filter((item) => item.patientId === patient.id)
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
    const nextAppointment = appointments.find((item) => item.status !== 'Cancelled' && item.date >= dateKey(today));
    const latestRecord = records[0];
    const patientType = getPatientType(patient.id);
    const latestVitals = latestRecord ? [
      ['BP', latestRecord.bloodPressure],
      ['Pulse', latestRecord.pulseBpm ? `${latestRecord.pulseBpm} bpm` : ''],
      ['Temp', latestRecord.temperatureC !== null && latestRecord.temperatureC !== undefined ? `${latestRecord.temperatureC} °C` : ''],
      ['SpO2', latestRecord.spo2Percent !== null && latestRecord.spo2Percent !== undefined ? `${latestRecord.spo2Percent}%` : ''],
      ['Weight', latestRecord.weightKg !== null && latestRecord.weightKg !== undefined ? `${latestRecord.weightKg} kg` : ''],
      ['BMI', latestRecord.bmi],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '') : [];
    const allergies = patient.allergies || patient.notes || '';
    const activeInvoices = invoices.filter((invoice) => !isInvoiceVoided(invoice));
    const totalBilled = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const totalPaid = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);
    const prescriptionSummary = records.flatMap((record) => (record.prescriptionItems || []).map((item) => ({
      ...item,
      visitDate: record.visitDate,
    }))).slice(0, 4);
    const reportSummary = records.flatMap((record) => (record.reports || []).map((report) => ({
      ...report,
      visitDate: record.visitDate,
    }))).slice(0, 4);
    document.getElementById('patientProfileTitle').textContent = patient.name || 'Patient profile';
    document.getElementById('patientProfileSubtitle').textContent = `${patient.code || 'ID pending'} · ${patientTypeLabel(patientType)} · Registered ${formatDate(String(patient.createdAt || '').slice(0, 10))}`;
    const content = document.getElementById('patientProfileContent');
    const profileTabs = [
      ['overview', 'Overview'],
      ['personal', 'Personal information'],
      ...(canViewClinicalRecords() ? [['medical', 'Medical history']] : []),
      ...(canViewClinicalRecords() ? [['family', `Family history (${activePatientHistory?.familyHistoryMembers?.length || 0})`]] : []),
      ...(canViewClinicalRecords() ? [['visits', `Visit history (${records.length})`]] : []),
      ...(canViewClinicalRecords() ? [['diagnoses', `Diagnoses (${records.filter((record) => record.diagnosis).length})`]] : []),
      ...(canViewClinicalRecords() ? [['external', `Outside records (${externalRecords.length})`]] : []),
      ...(canAccessPatientVitals() ? [['vitals', 'Vitals']] : []),
      ...(canViewClinicalRecords() ? [['medications', 'Prescriptions']] : []),
      ...(canViewClinicalRecords() ? [['supplies', `Supply usage (${consumableUsages.length})`]] : []),
      ...(canViewClinicalRecords() ? [['investigations', `Laboratory reports (${records.filter((record) => record.tests || record.investigationAdvice).length})`]] : []),
      ...(canViewClinicalRecords() ? [['documents', `Documents (${records.reduce((count, record) => count + (record.reports?.length || 0), 0) + externalRecords.filter((record) => record.fileDataUrl).length})`]] : []),
      ['appointments', `Appointments (${appointments.length})`],
      ['billing', `Billing (${invoices.length})`],
      ['timeline', 'Timeline'],
    ];
    let panel = '';
    if (activePatientProfileTab === 'overview') {
      panel = `
        <div class="patient-profile-dashboard">
          <aside class="patient-profile-sidebar">
            <section class="patient-overview-card"><h3>Personal details</h3><dl>
              <div><dt>Date of birth</dt><dd>${escapeHtml(patient.dob ? formatDate(patient.dob) : '—')}</dd></div>
              <div><dt>Gender</dt><dd>${escapeHtml(patient.gender || '—')}</dd></div>
              <div><dt>Blood group</dt><dd>${escapeHtml(patient.bloodGroup || '—')}</dd></div>
              <div><dt>Marital status</dt><dd>${escapeHtml(patient.maritalStatus || '—')}</dd></div>
              <div><dt>Occupation</dt><dd>${escapeHtml(patient.occupation || '—')}</dd></div>
              <div><dt>Registered</dt><dd>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</dd></div>
            </dl></section>
            <section class="patient-overview-card"><h3>Emergency contact</h3><dl>
              <div><dt>Name</dt><dd>${escapeHtml(patient.emergencyContactName || patient.emergencyContact || '—')}</dd></div>
              <div><dt>Relationship</dt><dd>${escapeHtml(patient.emergencyContactRelationship || '—')}</dd></div>
              <div><dt>Phone</dt><dd>${escapeHtml(patient.emergencyPhone || '—')}</dd></div>
            </dl></section>
            <section class="patient-overview-card"><h3>Medical alerts</h3><p class="${allergies ? 'patient-overview-alert' : 'patient-overview-muted'}">${recordText(allergies || 'Allergy status not recorded')}</p>
              <dl><div><dt>Conditions</dt><dd>${recordText(patient.medicalHistory || '—')}</dd></div><div><dt>Current medication</dt><dd>${recordText(patient.currentMedications || '—')}</dd></div><div><dt>Previous treatment</dt><dd>${recordText(patient.surgicalHistory || '—')}</dd></div><div><dt>Family history</dt><dd>${recordText(patient.familyHistory || '—')}</dd></div></dl>
              ${canViewClinicalRecords() ? `<button type="button" class="action-button" data-profile-tab="medical">View full medical history</button>` : ''}
            </section>
            <section class="patient-overview-card"><h3>Insurance</h3><dl>
              <div><dt>Provider</dt><dd>${escapeHtml(patient.insuranceProvider || '—')}</dd></div>
              <div><dt>Policy number</dt><dd>${escapeHtml(patient.insuranceNumber || '—')}</dd></div>
              <div><dt>Sum insured</dt><dd>${patient.insuranceSumInsured !== null && patient.insuranceSumInsured !== undefined && patient.insuranceSumInsured !== '' ? escapeHtml(money(patient.insuranceSumInsured)) : '—'}</dd></div>
            </dl></section>
          </aside>
          <div class="patient-profile-main">
            <div class="patient-overview-stats">
              <article><span>Total visits</span><strong>${records.length}</strong><small>All time</small></article>
              <article><span>Last visit</span><strong>${latestRecord ? escapeHtml(formatDate(latestRecord.visitDate)) : '—'}</strong><small>${escapeHtml(latestRecord?.doctorName || 'No visit recorded')}</small></article>
              <article><span>Outstanding</span><strong class="${outstanding > 0 ? 'is-pending' : 'is-paid'}">${money(outstanding)}</strong><small>Paid ${money(totalPaid)}</small></article>
            </div>
            <section class="patient-overview-card patient-overview-vitals"><div class="patient-overview-card-heading"><h3>Latest vitals</h3><span>${latestRecord ? escapeHtml(formatDate(latestRecord.visitDate)) : 'No readings'}</span></div>
              ${latestVitals.length ? `<div class="patient-vitals-strip">${latestVitals.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join('')}</div>` : '<p class="patient-overview-muted">Vitals recorded during visits will appear here.</p>'}
              ${canViewClinicalRecords() ? `<button type="button" class="action-button" data-profile-tab="vitals">View vitals history</button>` : ''}
            </section>
            <section class="patient-overview-card"><div class="patient-overview-card-heading"><h3>Visit history</h3><button type="button" class="action-button" data-profile-tab="visits">All ${records.length} visits</button></div>
              ${records.length ? `<div class="patient-overview-list">${records.slice(0, 3).map((record) => `<article><span class="patient-overview-date">${escapeHtml(formatDate(record.visitDate))}</span><div><b>${escapeHtml(record.diagnosis || record.encounterType || 'Consultation')}</b><small>${escapeHtml(record.doctorName || 'Doctor not recorded')}${record.symptoms ? ` · ${escapeHtml(record.symptoms)}` : ''}</small></div><button type="button" class="action-button" data-profile-tab="visits">View</button></article>`).join('')}</div>` : '<p class="patient-overview-muted">No clinic visits recorded yet.</p>'}
            </section>
            <div class="patient-overview-lower-grid">
              <section class="patient-overview-card"><div class="patient-overview-card-heading"><h3>Previous prescriptions</h3><button type="button" class="action-button" data-profile-tab="medications">View all</button></div>
                ${prescriptionSummary.length ? `<div class="patient-overview-list">${prescriptionSummary.map((item) => `<article><span class="patient-overview-date">${escapeHtml(formatDate(item.visitDate))}</span><div><b>${escapeHtml(item.medicineName || item.medicine?.name || 'Medicine')}</b><small>${escapeHtml(item.dosage || item.frequency || 'Prescription details')}</small></div></article>`).join('')}</div>` : '<p class="patient-overview-muted">No prescriptions on file.</p>'}
              </section>
              <section class="patient-overview-card"><div class="patient-overview-card-heading"><h3>Documents &amp; reports</h3><button type="button" class="action-button" data-profile-tab="documents">View all</button></div>
                ${reportSummary.length ? `<div class="patient-overview-list">${reportSummary.map((report) => `<article><span class="patient-overview-date">${escapeHtml(formatDate(String(report.reportDate || report.visitDate).slice(0, 10)))}</span><div><b>${escapeHtml(report.name || 'Clinical report')}</b><small>${escapeHtml(report.notes || 'Visit document')}</small></div></article>`).join('')}</div>` : '<p class="patient-overview-muted">No documents uploaded.</p>'}
              </section>
            </div>
            <section class="patient-overview-card"><div class="patient-overview-card-heading"><h3>Full history &amp; receipts</h3><span>${records.length + invoices.length} records</span></div>
              ${records.length || invoices.length ? `<div class="patient-overview-list">${[
                ...records.map((record) => ({ date: record.visitDate, type: 'Visit', title: record.diagnosis || 'Consultation', detail: record.doctorName || 'Doctor not recorded' })),
                ...invoices.map((invoice) => ({ date: invoice.date, type: 'Bill', title: invoice.number || 'Invoice', detail: `${money(invoice.total)} · ${invoiceStatus(invoice)}` })),
              ].sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''))).slice(0, 5).map((item) => `<article><span class="patient-overview-date">${escapeHtml(formatDate(String(item.date || '').slice(0, 10)))}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.type)} · ${escapeHtml(item.detail)}</small></div></article>`).join('')}</div>` : '<p class="patient-overview-muted">Patient visits and receipts will appear here.</p>'}
            </section>
            <div class="patient-profile-actions">${canViewClinicalRecords() ? `<button type="button" class="button button-light" data-profile-history="${escapeHtml(patient.id)}">Open clinical timeline</button>` : ''}${canManagePatientData() ? `<button type="button" class="button button-light" data-profile-appointment="${escapeHtml(patient.id)}">Schedule appointment</button><button type="button" class="button button-light" data-profile-edit="${escapeHtml(patient.id)}">Edit patient details</button>` : ''}</div>
          </div>
        </div>
      `;
    } else if (activePatientProfileTab === 'visits') {
      panel = records.length ? `<div class="patient-profile-list">${records.map((record) => `
        <article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(record.diagnosis || 'Visit record')}</b><span>${escapeHtml(formatDate(record.visitDate))} · ${escapeHtml(record.encounterType || 'OPD')}</span></div><p>${escapeHtml(record.doctorName || 'Doctor not recorded')}${record.symptoms ? ` · ${escapeHtml(record.symptoms)}` : ''}</p>
        ${record.consultationNotes ? `<p>${recordText(record.consultationNotes)}</p>` : ''}
        <div class="patient-profile-vitals">${[['BP', record.bloodPressure], ['Pulse', record.pulseBpm ? `${record.pulseBpm} bpm` : ''], ['Temp', record.temperatureC !== null && record.temperatureC !== undefined ? `${record.temperatureC} °C` : ''], ['SpO2', record.spo2Percent !== null && record.spo2Percent !== undefined ? `${record.spo2Percent}%` : ''], ['Weight', record.weightKg !== null && record.weightKg !== undefined ? `${record.weightKg} kg` : ''], ['BMI', record.bmi]].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => `<span><b>${label}</b> ${escapeHtml(value)}</span>`).join('')}</div>
        ${record.prescriptionItems?.length ? `<p><b>Prescription:</b> ${record.prescriptionItems.map((item) => `${escapeHtml(item.medicineName || item.medicine?.name || 'Medicine')} · ${escapeHtml(item.dosage)} · ${Number(item.durationDays)} days`).join('; ')}</p>` : ''}
        ${record.tests ? `<p><b>Investigations:</b> ${recordText(record.tests)}</p>` : ''}
        ${record.reports?.length ? `<div class="patient-profile-report-list"><b>Reports and documents</b>${record.reports.map((report) => `<div>${escapeHtml(report.name)}${report.reportDate ? ` · ${escapeHtml(formatDate(String(report.reportDate).slice(0, 10)))}` : ''}${report.notes ? ` · ${escapeHtml(report.notes)}` : ''}${report.fileDataUrl ? ` · <a href="${escapeHtml(report.fileDataUrl)}" download="${escapeHtml(report.fileName || report.name)}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.fileName || 'Download report')}</a>` : ''}</div>`).join('')}</div>` : ''}
        ${record.followUpDate ? `<p><b>Follow-up:</b> ${escapeHtml(formatDate(record.followUpDate))}${record.followUpInstructions ? ` · ${escapeHtml(record.followUpInstructions)}` : ''}</p>` : ''}</article>
      `).join('')}</div>` : '<div class="empty-state"><span>◷</span><b>No visits recorded</b><p>Clinical encounters will appear here as a chronological history.</p></div>';
      if (canViewClinicalRecords()) panel += `<div class="patient-profile-actions"><button type="button" class="button button-light" data-profile-history="${escapeHtml(patient.id)}">Review clinical timeline</button></div>`;
    } else if (activePatientProfileTab === 'external') {
      panel = `
        <section class="external-records-intro">
          <div><h3>Previous / outside doctor records</h3><p>Information from other hospitals or clinicians. These records do not become CSK Clinic encounters.</p></div>
          <button type="button" class="button button-primary" data-add-external-record="${escapeHtml(patient.id)}">＋ Add outside record</button>
        </section>
        ${externalRecords.length ? `<div class="patient-profile-list external-record-list">${externalRecords.map((record) => `
          <article class="patient-profile-entry external-record-entry">
            <div class="patient-profile-entry-head"><b>${escapeHtml(record.recordType || 'Outside medical record')}</b><span>${escapeHtml(formatDate(String(record.recordDate || '').slice(0, 10)))}</span></div>
            <p><b>${escapeHtml(record.doctorName || 'Doctor not recorded')}</b>${record.facilityName ? ` · ${escapeHtml(record.facilityName)}` : ''}</p>
            ${record.diagnosis ? `<div class="external-record-field"><small>Diagnosis</small>${recordText(record.diagnosis)}</div>` : ''}
            ${record.treatment ? `<div class="external-record-field"><small>Treatment</small>${recordText(record.treatment)}</div>` : ''}
            ${record.medications ? `<div class="external-record-field"><small>Medicines</small>${recordText(record.medications)}</div>` : ''}
            ${record.investigations ? `<div class="external-record-field"><small>Tests / investigations</small>${recordText(record.investigations)}</div>` : ''}
            ${record.notes ? `<div class="external-record-field"><small>Additional notes</small>${recordText(record.notes)}</div>` : ''}
            ${record.fileDataUrl ? `<a class="external-record-attachment" href="${escapeHtml(record.fileDataUrl)}" download="${escapeHtml(record.fileName || 'outside-medical-record')}" target="_blank" rel="noopener noreferrer">Open attachment · ${escapeHtml(record.fileName || 'View file')}</a>` : '<span class="external-record-no-attachment">No attachment</span>'}
            <div class="patient-profile-actions"><button type="button" class="action-button" data-edit-external-record="${escapeHtml(record.id)}">Edit all details</button></div>
          </article>
        `).join('')}</div>` : '<div class="empty-state"><span>▤</span><b>No outside-provider records</b><p>Add previous doctor reports, diagnosis and treatment details here. CSK Clinic visits remain in the Visits tab.</p></div>'}
      `;
    } else if (activePatientProfileTab === 'personal') {
      panel = `<div class="patient-profile-info-grid"><section><h3>Personal information</h3><dl><div><dt>Full name</dt><dd>${escapeHtml(patient.name)}</dd></div><div><dt>Patient ID</dt><dd>${escapeHtml(patient.code)}</dd></div><div><dt>Patient type</dt><dd>${escapeHtml(patientTypeLabel(patientType))}</dd></div><div><dt>Date of birth</dt><dd>${escapeHtml(patient.dob ? formatDate(patient.dob) : 'Not recorded')}</dd></div><div><dt>Age</dt><dd>${escapeHtml(patientAge(patient))}</dd></div><div><dt>Gender</dt><dd>${escapeHtml(patient.gender || 'Unspecified')}</dd></div><div><dt>Blood group</dt><dd>${escapeHtml(patient.bloodGroup || 'Not recorded')}</dd></div><div><dt>Relation to account</dt><dd>${escapeHtml(patient.relationToAccount || 'Not recorded')}</dd></div><div><dt>Registration date</dt><dd>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</dd></div></dl></section><section><h3>Contact information</h3><dl><div><dt>Mobile</dt><dd>${escapeHtml(patient.phone || '—')}</dd></div><div><dt>Email</dt><dd>${escapeHtml(patient.email || '—')}</dd></div><div><dt>Emergency contact</dt><dd>${escapeHtml([patient.emergencyContactName, patient.emergencyContactRelationship, patient.emergencyPhone].filter(Boolean).join(' · ') || patient.emergencyContact || '—')}</dd></div><div><dt>Address</dt><dd>${recordText([patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean).join(', '))}</dd></div><div><dt>Occupation</dt><dd>${escapeHtml(patient.occupation || '—')}</dd></div><div><dt>Language</dt><dd>${escapeHtml(patient.preferredLanguage || '—')}</dd></div><div><dt>Marital status</dt><dd>${escapeHtml(patient.maritalStatus || '—')}</dd></div><div><dt>Insurance</dt><dd>${escapeHtml([patient.insuranceProvider, patient.insuranceNumber].filter(Boolean).join(' · ') || 'Not recorded')}</dd></div><div><dt>Sum insured</dt><dd>${patient.insuranceSumInsured !== null && patient.insuranceSumInsured !== undefined && patient.insuranceSumInsured !== '' ? escapeHtml(money(patient.insuranceSumInsured)) : 'Not recorded'}</dd></div></dl></section></div>`;
    } else if (activePatientProfileTab === 'medical') {
      panel = renderPatientHistoryPanel(patient);
    } else if (activePatientProfileTab === 'family') {
      panel = renderPatientFamilyHistoryPanel();
    } else if (activePatientProfileTab === 'vitals') {
      panel = renderPatientVitalsPanel(patient);
    } else if (activePatientProfileTab === 'medications') {
      const historicalPrescriptions = records.flatMap((record) =>
        (record.prescriptionItems || []).map((item) => ({
          ...item,
          prescriptionDate: record.visitDate,
          doctorName: record.doctorName,
          source: 'Clinic prescription',
        })),
      );
      const consultationPrescriptions = records.flatMap((record) =>
        (record.prescriptionVersions || []).flatMap((version) =>
          (version.medications || []).map((item) => ({
            ...item,
            prescriptionDate: record.visitDate,
            doctorName: version.doctorName || record.doctorName,
            revision: version.revision,
            source: `${item.section || 'Consultation'} prescription`,
          })),
        ),
      );
      const prescribed = [...consultationPrescriptions, ...historicalPrescriptions]
        .sort((left, right) => String(right.prescriptionDate).localeCompare(String(left.prescriptionDate)));
      const currentMedications = String(patient.currentMedications || '').trim();
      panel = prescribed.length ? `<div class="patient-profile-list">${prescribed.map((item) => {
        const dispensed = (item.dispenses || []).reduce((total, entry) => total + Number(entry.quantity || 0), 0);
        const administered = (item.nursingOrders || [])
          .flatMap((order) => order.administrations || [])
          .filter((entry) => ['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(entry.status))
          .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
        const billed = (data.invoices || [])
          .flatMap((invoice) => invoice.items || [])
          .filter((line) => line.prescriptionMedicationId === item.id)
          .reduce((total, line) => total + Number(line.quantity || 0), 0);
        const fulfilled = dispensed + administered + billed;
        const remaining = item.quantity === null || item.quantity === undefined
          ? null
          : Math.max(0, Number(item.quantity) - fulfilled);
        return `<article class="patient-profile-entry">
          <div class="patient-profile-entry-head"><b>${escapeHtml(item.name || item.medicineName || item.medicine?.name || 'Medicine')}</b><span>${escapeHtml(formatDate(item.prescriptionDate))}${item.revision ? ` · Version ${escapeHtml(item.revision)}` : ''}</span></div>
          <p>${escapeHtml([item.genericName, item.brand, item.manufacturer, item.dosage, item.frequency, item.route].filter(Boolean).join(' · ') || 'Prescription details not recorded')}</p>
          <p>Prescribed by ${escapeHtml(item.doctorName || 'Doctor not recorded')}${item.durationDays ? ` · ${escapeHtml(item.durationDays)} days` : ''}${item.quantity ? ` · Quantity ${escapeHtml(item.quantity)}` : ''}${item.foodTiming ? ` · ${escapeHtml(item.foodTiming)}` : ''}</p>
          <p>${dispensed || administered || billed ? `Dispensed ${dispensed} · administered ${administered} · billed ${billed}${remaining !== null ? ` · ${remaining} remaining` : ''}` : 'Not dispensed or administered'}</p>
          ${(item.dispenses || []).length ? `<div class="patient-profile-payments">${item.dispenses.map((entry) => `<span>${escapeHtml(formatDate(String(entry.createdAt || '').slice(0, 10)))} · ${escapeHtml(entry.quantity)} dispensed · ${escapeHtml(entry.dispensedBy?.email || 'Pharmacy')}</span>`).join('')}</div>` : ''}
          ${canCreateInvoices() && item.medicineId && (remaining === null || remaining > 0) ? `<button type="button" class="action-button" data-bill-patient-prescription="${escapeHtml(item.id)}" data-patient-id="${escapeHtml(patient.id)}">Bill remaining</button>` : ''}
        </article>`;
      }).join('')}</div>` : `<div class="empty-state"><span>✚</span><b>No prescription history</b><p>${currentMedications ? `Recorded current medicines: ${escapeHtml(currentMedications)}` : 'No prescribed medicines have been recorded.'}</p></div>`;
    } else if (activePatientProfileTab === 'documents') {
      const documents = records.flatMap((record) => (record.reports || []).map((report) => ({ ...report, recordDate: report.reportDate || record.visitDate })));
      externalRecords.forEach((record) => {
        if (record.fileDataUrl) {
          documents.push({
            name: record.fileName || record.recordType || 'Outside record',
            fileName: record.fileName,
            mimeType: record.mimeType,
            fileDataUrl: record.fileDataUrl,
            recordDate: record.recordDate,
            source: record.facilityName || record.doctorName,
          });
        }
      });
      panel = documents.length
        ? renderPatientDocumentGallery(documents)
        : '<div class="empty-state"><span>▤</span><b>No documents</b><p>Laboratory reports, imaging reports and external attachments will appear here.</p></div>';
    } else if (activePatientProfileTab === 'diagnoses') {
      const diagnoses = records.filter((record) => record.diagnosis);
      panel = diagnoses.length ? `<div class="patient-profile-list">${diagnoses.map((record) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${recordText(record.diagnosis)}</b><span>${escapeHtml(formatDate(record.visitDate))}</span></div><p>Recorded by ${escapeHtml(record.doctorName || 'Doctor not recorded')} · ${escapeHtml(record.encounterType || 'OPD')} · ${escapeHtml(record.status || 'Status not recorded')}</p>${record.consultationNotes ? `<p>${recordText(record.consultationNotes)}</p>` : ''}${record.followUpDate ? `<p>Follow-up: ${escapeHtml(formatDate(record.followUpDate))}</p>` : ''}</article>`).join('')}</div>` : '<div class="empty-state"><span>◇</span><b>No diagnoses recorded</b><p>Important diagnoses will appear here when they are entered in a clinic visit.</p></div>';
    } else if (activePatientProfileTab === 'investigations') {
      const investigations = records.filter((record) => record.tests || record.investigationAdvice || record.reports?.length);
      panel = investigations.length ? `<div class="patient-profile-list">${investigations.map((record) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(formatDate(record.visitDate))}</b><span>${escapeHtml(record.doctorName || 'Source not recorded')}</span></div>${record.tests ? `<p><b>Investigations:</b> ${recordText(record.tests)}</p>` : ''}${record.investigationAdvice ? `<p><b>Clinical advice:</b> ${recordText(record.investigationAdvice)}</p>` : ''}${record.reports?.length ? `<div class="patient-profile-report-list"><b>Reports</b>${record.reports.map((report) => `<div>${escapeHtml(report.name)}${report.reportDate ? ` · ${escapeHtml(formatDate(String(report.reportDate).slice(0, 10)))}` : ''}${report.fileDataUrl ? ` · <a href="${escapeHtml(report.fileDataUrl)}" download="${escapeHtml(report.fileName || report.name)}" target="_blank" rel="noopener noreferrer">Open report</a>` : ''}</div>`).join('')}</div>` : ''}</article>`).join('')}</div>` : '<div class="empty-state"><span>▧</span><b>No investigations</b><p>Laboratory, imaging and investigation advice from visits will appear here.</p></div>';
    } else if (activePatientProfileTab === 'supplies') {
      panel = consumableUsages.length
        ? `<div class="patient-profile-list">${consumableUsages.map((usage) => {
            const supply = usage.consumable || data.consumables.find((entry) => entry.id === usage.itemId);
            const quantity = Math.abs(Number(usage.quantityDelta || 0));
            const date = isApiConnected() ? String(usage.createdAt || '').slice(0, 10) : String(usage.createdAt || '').slice(0, 10);
            return `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(supply?.name || 'Clinical supply')}</b><span>${escapeHtml(formatDate(date))}</span></div><p>${escapeHtml(supply?.category?.name || supply?.category || 'Clinical supply')} · ${quantity} ${escapeHtml(supply?.unit || 'unit')}${usage.invoiceId ? ' · Included in billing' : ''}</p><p>${escapeHtml(usage.reason || 'Used for patient care')}</p><p>Recorded by ${escapeHtml(usage.user?.email || usage.recordedBy || 'Clinic staff')}</p></article>`;
          }).join('')}</div>`
        : '<div class="empty-state"><span>◇</span><b>No supply usage</b><p>Clinical consumables used for this patient will appear here with quantity and billing status.</p></div>';
    } else if (activePatientProfileTab === 'appointments') {
      panel = appointments.length ? `<div class="patient-profile-list">${appointments.map((appointment) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(appointment.reason || 'Appointment')}</b><span>${escapeHtml(formatDate(appointment.date))} · ${escapeHtml(formatTime(appointment.time))}</span></div><p>${escapeHtml(appointment.doctor || 'Doctor not recorded')} · ${escapeHtml(appointment.department || 'General medicine')}</p><span class="status-pill ${appointment.status === 'Scheduled' ? 'pending' : appointment.status === 'Cancelled' ? 'cancelled' : ''}">${escapeHtml(appointment.status)}</span></article>`).join('')}</div>` : '<div class="empty-state"><span>▣</span><b>No appointments</b><p>Appointments linked to this patient will appear here.</p></div>';
    } else if (activePatientProfileTab === 'timeline') {
      const events = [];
      if (patient.createdAt) events.push({ date: String(patient.createdAt).slice(0, 10), title: 'Patient registered', detail: `Patient ID ${patient.code}` });
      records.forEach((record) => events.push({ date: record.visitDate, title: record.encounterType === 'IPD' ? 'Hospital encounter' : 'Clinic visit', detail: record.diagnosis || record.symptoms || record.doctorName || 'Visit record' }));
      externalRecords.forEach((record) => events.push({ date: record.recordDate, title: 'Outside medical record', detail: `${record.recordType || 'Record'} · ${record.facilityName || record.doctorName || 'External provider'}` }));
      appointments.forEach((appointment) => events.push({ date: appointment.date, title: 'Appointment', detail: `${appointment.doctor || 'Doctor'} · ${appointment.status}` }));
      invoices.forEach((invoice) => events.push({ date: invoice.date, title: 'Billing event', detail: `${invoice.number} · ${money(invoice.total)} · ${invoiceStatus(invoice)}` }));
      consumableUsages.forEach((usage) => {
        const supply = usage.consumable || data.consumables.find((entry) => entry.id === usage.itemId);
        events.push({
          date: isApiConnected() ? String(usage.createdAt || '').slice(0, 10) : String(usage.createdAt || '').slice(0, 10),
          title: 'Clinical supply used',
          detail: `${supply?.name || 'Supply'} · ${Math.abs(Number(usage.quantityDelta || 0))} ${supply?.unit || 'unit'}${usage.invoiceId ? ' · Added to invoice' : ''}`,
        });
      });
      const filteredEvents = events.filter((event) => {
        if (!event.date) return false;
        if (activeTimelineFilter !== 'all') {
          const filterMap = {
            registration: 'Patient registered',
            visits: ['Clinic visit', 'Hospital encounter'],
            outside: 'Outside medical record',
            appointments: 'Appointment',
            billing: 'Billing event',
            supplies: 'Clinical supply used',
          };
          const allowed = filterMap[activeTimelineFilter];
          if (Array.isArray(allowed) ? !allowed.includes(event.title) : event.title !== allowed) return false;
        }
        if (activeTimelineFrom && event.date < activeTimelineFrom) return false;
        if (activeTimelineTo && event.date > activeTimelineTo) return false;
        return true;
      }).sort((left, right) => String(right.date).localeCompare(String(left.date)));
      panel = `<div class="patient-timeline-tools"><select id="patientTimelineFilter" aria-label="Filter timeline event type"><option value="all">All events</option><option value="registration">Registration</option><option value="visits">Clinic / hospital visits</option><option value="outside">Outside records</option><option value="appointments">Appointments</option><option value="billing">Billing</option><option value="supplies">Clinical supplies</option></select><label>From<input id="patientTimelineFrom" type="date" value="${escapeHtml(activeTimelineFrom)}"></label><label>To<input id="patientTimelineTo" type="date" value="${escapeHtml(activeTimelineTo)}"></label><button type="button" class="button button-light button-small" id="clearPatientTimeline">Clear</button></div>${filteredEvents.length
        ? `<div class="patient-timeline">${filteredEvents.map((event) => `<article><time>${escapeHtml(formatDate(event.date))}</time><div><b>${escapeHtml(event.title)}</b><p>${escapeHtml(event.detail)}</p></div></article>`).join('')}</div>`
        : '<div class="empty-state"><span>◷</span><b>No timeline events</b><p>Registration and clinical events will appear here.</p></div>'}`;
    } else {
      panel = invoices.length ? `<div class="patient-profile-list">${invoices.map((invoice) => {
        const voided = isInvoiceVoided(invoice);
        const balance = voided ? 0 : Math.max(0, Number(invoice.total) - Number(invoice.paid));
        return `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(invoice.number)}</b><span>${escapeHtml(formatDate(invoice.date))}</span></div><p>Total ${money(invoice.total)} · Paid ${money(invoice.paid)} · Balance ${money(balance)}</p>${invoice.encounterId ? `<p>Linked to a clinical visit · <button type="button" class="action-button" data-open-patient-records="${escapeHtml(patient.id)}">View visit history</button></p>` : '<p>General billing · no visit link recorded</p>'}<span class="status-pill ${Number(invoice.paid) >= Number(invoice.total) || voided ? '' : 'pending'}">${escapeHtml(invoiceStatus(invoice))}</span>${voided && invoice.voidReason ? `<p>Void reason: ${escapeHtml(invoice.voidReason)}</p>` : ''}${invoice.payments?.length ? `<div class="patient-profile-payments">${invoice.payments.map((payment) => `<span>${escapeHtml(formatDate(String(payment.date || '').slice(0, 10)))} · ${escapeHtml(payment.method || 'Payment')} ${payment.reference ? `· ${escapeHtml(payment.reference)}` : ''} · ${money(payment.amount)}</span>`).join('')}</div>` : ''}</article>`;
      }).join('')}</div>` : '<div class="empty-state"><span>▤</span><b>No billing history</b><p>Invoices and payments linked to this patient will appear here.</p></div>';
    }
    const lastVisitDate = latestRecord?.visitDate || patient.lastVisit;
    const profileHeader = `<section class="patient-profile-header">${patientAvatarMarkup(patient, 'patient-profile-photo')}<div class="patient-profile-header-main"><div><h3>${escapeHtml(patient.name)} <span class="patient-type-badge ${patientType}">${escapeHtml(patientTypeLabel(patientType))}</span></h3><p>${escapeHtml(patient.code || 'Patient ID pending')} · ${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Unspecified')}</p></div><p class="patient-profile-header-contact">${escapeHtml(patient.phone || 'Mobile not recorded')} · ${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</p></div><dl><div><dt>Registered</dt><dd>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</dd></div><div><dt>Last visit</dt><dd>${lastVisitDate ? escapeHtml(formatDate(lastVisitDate)) : 'No visits recorded'}</dd></div></dl>${canManagePatientData() ? `<button type="button" class="button button-light button-small" data-profile-edit="${escapeHtml(patient.id)}">Edit</button><button type="button" class="button button-primary button-small" data-profile-appointment="${escapeHtml(patient.id)}">Book</button>` : ''}</section>`;
    content.innerHTML = `${profileHeader}<nav class="patient-profile-tabs" role="tablist" aria-label="Patient profile sections">${profileTabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${activePatientProfileTab === key}" class="${activePatientProfileTab === key ? 'active' : ''}" data-profile-tab="${key}">${label}</button>`).join('')}</nav><section class="patient-profile-panel">${panel}</section>`;
    wirePatientDocumentGallery(content);
    if (activePatientProfileTab === 'vitals') {
      content.querySelectorAll('[data-patient-vitals-chart-type]').forEach((button) => {
        button.addEventListener('click', () => {
          activePatientVitalsChartType = button.dataset.patientVitalsChartType;
          renderPatientProfile(patient);
        });
      });
      const range = document.getElementById('patientVitalsRange');
      if (range) {
        range.value = activePatientVitalsRange;
        range.addEventListener('change', () => {
          activePatientVitalsRange = range.value;
          renderPatientProfile(patient);
        });
      }
      const form = document.getElementById('patientVitalsForm');
      if (form) {
        updatePatientVitalsPreview(form);
        form.addEventListener('input', () => updatePatientVitalsPreview(form));
        form.addEventListener('change', () => updatePatientVitalsPreview(form));
      }
    }
    if (activePatientProfileTab === 'timeline') {
      const filter = document.getElementById('patientTimelineFilter');
      const from = document.getElementById('patientTimelineFrom');
      const to = document.getElementById('patientTimelineTo');
      if (filter) {
        filter.value = activeTimelineFilter;
        filter.addEventListener('change', () => {
          activeTimelineFilter = filter.value;
          renderPatientProfile(patient);
        });
      }
      if (from) from.addEventListener('change', () => {
        activeTimelineFrom = from.value;
        renderPatientProfile(patient);
      });
      if (to) to.addEventListener('change', () => {
        activeTimelineTo = to.value;
        renderPatientProfile(patient);
      });
      document.getElementById('clearPatientTimeline')?.addEventListener('click', () => {
        activeTimelineFilter = 'all';
        activeTimelineFrom = '';
        activeTimelineTo = '';
        renderPatientProfile(patient);
      });
    }
  }

  async function openPatientProfile(patientId, initialTab = 'overview') {
    let patient = patientById(patientId);
    if (!patient) return;
    activePatientProfileId = patientId;
    activePatientHistory = null;
    activePatientVitals = isApiConnected()
      ? []
      : (data.patientVitals || []).filter((record) => record.patientId === patientId).map(normalizePatientVitalsRecord);
    activePatientVitalsRange = 'all';
    activePatientProfileTab = initialTab;
    document.getElementById('patientProfileContent').innerHTML = '<div class="patient-profile-loading" role="status">Loading patient profile…</div>';
    openModal('patientProfileModal');
    try {
      if (isApiConnected()) {
        patient = normalizeApiPatient(await apiRequest(`/patients/${encodeURIComponent(patientId)}`));
        data.patients = data.patients.map((item) => item.id === patientId ? { ...item, ...patient } : item);
        if (canAccessPatientVitals()) {
          const vitals = await apiRequest(`/patients/${encodeURIComponent(patientId)}/vitals`);
          if (!Array.isArray(vitals)) throw new Error('The clinic API returned an invalid patient vitals list.');
          activePatientVitals = vitals.map(normalizePatientVitalsRecord);
        }
        if (canViewClinicalRecords()) {
          activePatientHistory = await apiRequest(`/patients/${encodeURIComponent(patientId)}/history`);
          if (!activePatientHistory || !Array.isArray(activePatientHistory.medicalConditions)) {
            throw new Error('The clinic API returned an invalid patient history.');
          }
          const records = await apiRequest(`/patients/${encodeURIComponent(patientId)}/records`);
          if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid clinical history.');
          data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patientId)
            .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId })));
          patientVisitHistoryLoaded.add(patientId);
          const externalRecords = await apiRequest(`/patients/${encodeURIComponent(patientId)}/external-records`);
          if (!Array.isArray(externalRecords)) throw new Error('The clinic API returned an invalid outside-provider history.');
          data.externalMedicalRecords = data.externalMedicalRecords.filter((record) => record.patientId !== patientId)
            .concat(externalRecords.map((record) => normalizeApiExternalMedicalRecord({ ...record, patientId })));
          const consumableUsages = await apiRequest(`/patients/${encodeURIComponent(patientId)}/consumable-usages`);
          if (!Array.isArray(consumableUsages)) throw new Error('The clinic API returned invalid supply usage.');
          data.consumableUsages = (data.consumableUsages || []).filter((usage) => usage.patientId !== patientId)
            .concat(consumableUsages.map((usage) => ({ ...usage, patientId })));
        }
      } else {
        activePatientHistory = localPatientHistory(patientId);
      }
      renderPatientProfile(patient);
      renderPatients();
    } catch (error) {
      console.error('Unable to load patient profile.', error);
      document.getElementById('patientProfileContent').innerHTML = `<div class="patient-profile-loading" role="alert">${escapeHtml(error.message || 'Unable to load patient profile.')}</div>`;
      showToast(error.message || 'Unable to load patient profile.');
    }
  }

  function canViewClinicalRecords() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE'].includes(getStoredApiUser()?.role);
  }

  function openExternalMedicalRecordEditor(patientId, recordId = '') {
    if (!canViewClinicalRecords()) {
      showToast('Your account does not have permission to manage clinical records.');
      return;
    }
    const patient = patientById(patientId);
    if (!patient) return;
    const record = recordId
      ? data.externalMedicalRecords.find((item) => item.id === recordId && item.patientId === patientId)
      : null;
    if (recordId && !record) {
      showToast('Outside-provider record not found. Refresh the patient history and retry.');
      return;
    }

    const form = document.getElementById('externalMedicalRecordForm');
    form.reset();
    form.elements.namedItem('patientId').value = patientId;
    form.elements.namedItem('recordId').value = record?.id || '';
    form.elements.namedItem('recordDate').value = record?.recordDate
      ? String(record.recordDate).slice(0, 10)
      : dateKey(today);
    form.elements.namedItem('recordType').value = record?.recordType || '';
    form.elements.namedItem('doctorName').value = record?.doctorName || '';
    form.elements.namedItem('facilityName').value = record?.facilityName || '';
    ['diagnosis', 'treatment', 'medications', 'investigations', 'notes'].forEach((name) => {
      form.elements.namedItem(name).value = record?.[name] || '';
    });
    document.getElementById('externalMedicalRecordTitle').textContent = record
      ? 'Edit outside doctor record'
      : 'Add outside doctor record';
    form.querySelector('button[type="submit"]').textContent = record
      ? 'Update outside record'
      : 'Save outside record';
    const currentFile = document.getElementById('externalRecordCurrentFile');
    currentFile.innerHTML = record?.fileDataUrl
      ? `<span>Current attachment</span> <a href="${escapeHtml(record.fileDataUrl)}" download="${escapeHtml(record.fileName || 'outside-medical-record')}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.fileName || 'Open attachment')}</a>`
      : '';
    const removeFileLabel = document.getElementById('externalRecordRemoveFileLabel');
    removeFileLabel.classList.toggle('hidden', !record?.fileDataUrl);
    form.elements.namedItem('removeAttachment').checked = false;
    openModal('externalMedicalRecordModal');
  }

  function normalizeApiEncounter(item) {
    const vitalsRecord = item.vitalsRecords?.[0] || item.vitalsRecord || {};
    const legacyBloodPressure = vitalsRecord.systolicMmHg != null && vitalsRecord.diastolicMmHg != null
      ? `${vitalsRecord.systolicMmHg}/${vitalsRecord.diastolicMmHg}`
      : '';
    return {
      ...item,
      bloodPressure: item.bloodPressure || legacyBloodPressure,
      pulseBpm: item.pulseBpm ?? vitalsRecord.pulseBpm,
      respiratoryRateBpm: item.respiratoryRateBpm ?? vitalsRecord.respiratoryRateBpm,
      temperatureC: item.temperatureC ?? vitalsRecord.temperatureC,
      spo2Percent: item.spo2Percent ?? vitalsRecord.spo2Percent,
      cbgMgDl: item.cbgMgDl ?? vitalsRecord.cbgMgDl,
      weightKg: item.weightKg ?? vitalsRecord.weightKg,
      heightCm: item.heightCm ?? vitalsRecord.heightCm,
      bmi: item.bmi ?? vitalsRecord.bmi,
      reports: Array.isArray(item.reports) ? item.reports : [],
      visitDate: item.visitDate ? String(item.visitDate).slice(0, 10) : '',
      followUpDate: item.followUpDate ? String(item.followUpDate).slice(0, 10) : '',
      admittedAt: item.admittedAt || '',
      dischargedAt: item.dischargedAt || '',
      prescriptionItems: Array.isArray(item.prescriptionItems) ? item.prescriptionItems.map((prescription) => ({
        ...prescription,
        medicineName: prescription.medicineName || prescription.medicine?.name || 'Medicine',
        billedQuantity: Number(prescription.billedQuantity || 0),
        quantity: Number(prescription.quantity || 0),
      })) : [],
      prescriptionVersions: Array.isArray(item.prescriptionVersions)
        ? item.prescriptionVersions.map((prescription) => ({
          ...prescription,
          nextVisitDate: prescription.nextVisitDate
            ? String(prescription.nextVisitDate).slice(0, 10)
            : '',
          medications: Array.isArray(prescription.medications) ? prescription.medications : [],
          ivFluids: Array.isArray(prescription.ivFluids) ? prescription.ivFluids : [],
          investigations: Array.isArray(prescription.investigations) ? prescription.investigations : [],
        }))
        : [],
    };
  }

  function getPrescriptionListRows() {
    return data.patientRecords.flatMap((record) => {
      const patientId = record.patientId || record.patient?.id;
      const patient = patientById(patientId);
      if (!patient) return [];
      const versions = (record.prescriptionVersions || []).map((version) => ({
        patient,
        patientId,
        record,
        version,
        legacyItems: [],
        date: String(version.createdAt || version.visitDate || record.visitDate || '').slice(0, 10),
        doctor: version.doctorName || record.doctorName || version.createdBy?.email || 'Doctor not recorded',
        diagnosis: version.diagnosisName || record.diagnosis || '',
        medications: Array.isArray(version.medications) ? version.medications : [],
      }));
      const legacyItems = Array.isArray(record.prescriptionItems) ? record.prescriptionItems : [];
      const legacy = legacyItems.length ? [{
        patient,
        patientId,
        record,
        version: null,
        legacyItems,
        date: String(record.visitDate || record.createdAt || '').slice(0, 10),
        doctor: record.doctorName || 'Doctor not recorded',
        diagnosis: record.diagnosis || '',
        medications: [],
      }] : [];
      return [...versions, ...legacy];
    }).sort((left, right) => right.date.localeCompare(left.date));
  }

  function prescriptionRowMedicines(row) {
    if (row.legacyItems.length) {
      return row.legacyItems.map((item) => ({
        name: item.medicineName || item.medicine?.name || 'Medicine',
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
        instructions: item.instructions,
        section: 'TABLET',
      }));
    }
    return row.medications;
  }

  function prescriptionRowSummary(row) {
    const medicines = prescriptionRowMedicines(row)
      .map((item) => item.brand || item.name || item.medicineName || 'Medicine')
      .filter(Boolean);
    return [row.diagnosis, ...medicines].filter(Boolean).join(' · ') || 'No medicines';
  }

  function prescriptionRowCanBill(row) {
    return canCreateInvoices() && buildPharmacyPosItems(row).items.length > 0;
  }

  async function loadPrescriptionWorkspace() {
    const table = document.getElementById('prescriptionsTable');
    if (table) table.innerHTML = '<tr><td colspan="5"><div class="patient-profile-loading" role="status">Loading prescriptions…</div></td></tr>';
    try {
      if (isApiConnected()) {
        const records = await apiRequest('/patients/prescriptions');
        if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid prescription list.');
        const normalizedRecords = records.map((record) => normalizeApiEncounter(record));
        const apiPatients = new Map(data.patients.map((patient) => [patient.id, patient]));
        records.forEach((record) => {
          if (record.patient?.id) apiPatients.set(record.patient.id, normalizeApiPatient(record.patient));
        });
        data.patients = [...apiPatients.values()];
        const loadedPatientIds = new Set(normalizedRecords.map((record) => record.patientId));
        data.patientRecords = data.patientRecords.filter((record) => !loadedPatientIds.has(record.patientId))
          .concat(normalizedRecords);
      }
      renderPrescriptions();
    } catch (error) {
      console.error('Unable to load prescriptions.', error);
      if (table) table.innerHTML = `<tr><td colspan="5"><div class="patient-profile-loading" role="alert">${escapeHtml(error.message || 'Unable to load prescriptions.')}</div></td></tr>`;
      showToast(error.message || 'Unable to load prescriptions.');
    }
  }

  function renderPrescriptions() {
    const allRows = getPrescriptionListRows();
    const doctorSelect = document.getElementById('prescriptionDoctorFilter');
    const selectedDoctor = doctorSelect.value;
    const doctors = [...new Set(allRows.map((row) => row.doctor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    doctorSelect.innerHTML = '<option value="">All</option>' + doctors
      .map((doctor) => `<option value="${escapeHtml(doctor)}">${escapeHtml(doctor)}</option>`).join('');
    if (doctors.includes(selectedDoctor)) doctorSelect.value = selectedDoctor;

    const query = document.getElementById('prescriptionSearch').value.trim().toLowerCase();
    const from = document.getElementById('prescriptionFrom').value;
    const to = document.getElementById('prescriptionTo').value;
    const doctor = doctorSelect.value;
    prescriptionWorkspaceRows = allRows.filter((row) => {
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      if (doctor && row.doctor !== doctor) return false;
      if (!query) return true;
      return [
        row.patient.name,
        row.patient.phone,
        row.patient.code,
        row.doctor,
        row.diagnosis,
        prescriptionRowSummary(row),
      ].join(' ').toLowerCase().includes(query);
    });

    document.getElementById('prescriptionsCount').textContent =
      `Every prescription written in this clinic · ${prescriptionWorkspaceRows.length} found`;
    document.getElementById('prescriptionsEmpty').classList.toggle('hidden', prescriptionWorkspaceRows.length > 0);
    document.getElementById('prescriptionsTable').innerHTML = prescriptionWorkspaceRows.map((row, index) => {
      const editButton = canWriteConsultationPrescriptions()
        ? `<button type="button" class="button button-light button-small" data-prescription-action="edit" data-prescription-row="${index}">Edit</button>`
        : '';
      const billButton = prescriptionRowCanBill(row)
        ? `<button type="button" class="button button-primary button-small" data-prescription-action="bill" data-prescription-row="${index}">💊 Bill</button>`
        : '';
      return `<tr>
        <td><b>${escapeHtml(formatDate(row.date))}</b><small class="prescription-row-time">${escapeHtml(row.version?.createdAt ? new Date(row.version.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '')}</small></td>
        <td><b>${escapeHtml(row.patient.name)}</b><small class="prescription-row-time">${escapeHtml(row.patient.code || '')}</small></td>
        <td>${escapeHtml(row.doctor)}</td>
        <td class="prescription-summary-cell">${escapeHtml(prescriptionRowSummary(row))}</td>
        <td><div class="prescription-row-actions">
          <button type="button" class="button button-light button-small" data-prescription-action="view" data-prescription-row="${index}">View</button>
          ${editButton}
          <button type="button" class="button button-light button-small" data-prescription-action="print" data-prescription-row="${index}">Print</button>
          <button type="button" class="button button-light button-small" data-prescription-action="pdf" data-prescription-row="${index}">PDF</button>
          ${billButton}
        </div></td>
      </tr>`;
    }).join('');
  }

  function exportPrescriptionCsv() {
    const rows = [
      ['Date', 'Patient', 'Patient ID', 'Mobile', 'Doctor', 'Diagnosis', 'Medicines'],
      ...prescriptionWorkspaceRows.map((row) => [
        row.date,
        row.patient.name,
        row.patient.code,
        row.patient.phone,
        row.doctor,
        row.diagnosis,
        prescriptionRowMedicines(row).map((item) => item.brand || item.name || item.medicineName || 'Medicine').join('; '),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `csk-clinic-prescriptions-${dateKey(today)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Prescription list exported.');
  }

  function openPrescriptionDetails(row) {
    const items = prescriptionRowMedicines(row);
    const details = items.length
      ? `<div class="prescription-detail-medicines">${items.map((item) => `<article>
          <div><b>${escapeHtml(item.brand || item.name || item.medicineName || 'Medicine')}</b><small>${escapeHtml(item.genericName || item.strength || '')}</small></div>
          <p>${escapeHtml([item.dosage, item.frequency, item.durationDays ? `${item.durationDays} days` : '', item.startFrom ? `Start: ${item.startFrom}` : '', item.quantity ? `Qty ${item.quantity}` : '', item.route, item.foodTiming, item.instructions].filter(Boolean).join(' · ') || 'Directions not recorded')}</p>
        </article>`).join('')}</div>`
      : '<p class="muted">No medicine items were recorded on this prescription.</p>';
    const version = row.version;
    const otherDetails = version
      ? [
        version.symptoms ? `<p><b>Symptoms:</b> ${recordText(version.symptoms)}</p>` : '',
        version.clinicalObservations ? `<p><b>Clinical observations:</b> ${recordText(version.clinicalObservations)}</p>` : '',
        version.doctorNotes ? `<p><b>Doctor notes:</b> ${recordText(version.doctorNotes)}</p>` : '',
        version.ivFluids?.length ? `<p><b>IV fluids:</b> ${escapeHtml(version.ivFluids.map((item) => item.type).filter(Boolean).join(', '))}</p>` : '',
        version.investigations?.length ? `<p><b>Investigations:</b> ${escapeHtml(version.investigations.map((item) => item.name).filter(Boolean).join(', '))}</p>` : '',
      ].join('')
      : '';
    document.getElementById('prescriptionDetailsTitle').textContent = row.diagnosis || 'Prescription details';
    document.getElementById('prescriptionDetailsSubtitle').textContent =
      `${row.patient.name} · ${row.patient.code} · ${formatDate(row.date)} · ${row.doctor}`;
    document.getElementById('prescriptionDetailsContent').innerHTML =
      `<div class="prescription-detail-body"><p><b>Diagnosis:</b> ${escapeHtml(row.diagnosis || '—')}</p>${otherDetails}<h3>Prescribed medicines</h3>${details}</div>`;
    openModal('prescriptionDetailsModal');
  }

  function openPrescriptionRevision(row) {
    if (!canWriteConsultationPrescriptions()) {
      showToast('Your account does not have permission to edit clinical prescriptions.');
      return;
    }
    openConsultationPrescriptionEditor(row.patientId, row.record.id, row.version);
  }

  function getPrescriptionDocument(row) {
    if (row.version) return { record: row.record, version: row.version };
    return {
      record: row.record,
      version: {
        revision: 'Legacy',
        doctorName: row.doctor,
        diagnosisName: row.diagnosis,
        symptoms: '',
        clinicalObservations: '',
        doctorNotes: '',
        medications: row.legacyItems.map((item) => ({
          section: 'TABLET',
          name: item.medicineName || item.medicine?.name || 'Medicine',
          dosage: item.dosage || '',
          frequency: item.frequency || '',
          durationDays: item.durationDays || '',
          quantity: item.quantity || '',
          instructions: item.instructions || '',
        })),
        ivFluids: [],
        investigations: [],
        referral: null,
        createdBy: {},
      },
    };
  }

  function printPrescriptionListRow(row, asPdf = false) {
    const patient = patientById(row.patientId);
    if (!patient) {
      showToast('Patient record could not be found. Refresh and retry.');
      return;
    }
    const { record, version } = getPrescriptionDocument(row);
    if (asPdf) openPrescriptionDocument(patient, record, version, true);
    else openPrescriptionDocument(patient, record, version);
  }

  function canWriteConsultationPrescriptions() {
    if (!isApiConnected()) return true;
    return [
      'SUPER_ADMIN',
      'CLINIC_OWNER',
      'CLINIC_ADMIN',
      'DOCTOR',
    ].includes(getStoredApiUser()?.role);
  }

  function prescriptionVersionMarkup(record, patientId) {
    const versions = Array.isArray(record.prescriptionVersions) ? record.prescriptionVersions : [];
    if (!versions.length) return '';
    return `<section class="consultation-prescription-history">
      <h5>Prescription history · ${versions.length} version${versions.length === 1 ? '' : 's'}</h5>
      ${versions.map((version) => {
        const medicationSections = [
          ['INJECTION', 'Injection'],
          ['NEBULIZATION', 'Nebulization'],
          ['TABLET', 'Tablets'],
        ].map(([section, title]) => {
          const medications = version.medications.filter((item) => item.section === section);
          if (!medications.length) return '';
          return `<p><b>${title}:</b> ${medications.map((item) => [
            item.brand || item.name,
            item.brand ? item.name : '',
            item.dosage,
            item.frequency,
            item.durationDays ? `${item.durationDays} days` : '',
            item.startFrom ? `Start: ${item.startFrom}` : '',
            item.quantity ? `Qty ${item.quantity}` : '',
            item.route || '',
            item.foodTiming || '',
            item.instructions || '',
          ].filter(Boolean).map(escapeHtml).join(' · ')).join('; ')}</p>`;
        }).join('');
        const fluidDetails = version.ivFluids.map((fluid) =>
          `${fluid.type}: ${fluid.quantityMl} ml · ${fluid.flowRate} · ${fluid.duration}${fluid.instructions ? ` · ${fluid.instructions}` : ''}`
        ).map(escapeHtml).join('; ');
        const investigationDetails = version.investigations.map((item) =>
          `${item.category}: ${item.name}${item.instructions ? ` · ${item.instructions}` : ''}`
        ).map(escapeHtml).join('; ');
        const referral = version.referral && typeof version.referral === 'object'
          ? [
            version.referral.hospitalName,
            version.referral.doctorName,
            version.referral.reason,
            version.referral.notes,
          ].filter(Boolean).map(escapeHtml).join(' · ')
          : '';
        const summaryDate = version.createdAt
          ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(version.createdAt))
          : formatDate(record.visitDate);
        const writer = version.createdBy?.email || record.doctorName || 'Doctor';
        return `<article class="consultation-prescription-version">
          <details ${version.revision === versions[0].revision ? 'open' : ''}>
            <summary>Version ${Number(version.revision)} · ${escapeHtml(summaryDate)} · ${escapeHtml(writer)}</summary>
            ${version.diagnosisName ? `<p><b>Diagnosis:</b> ${recordText(version.diagnosisName)}</p>` : ''}
            ${version.symptoms ? `<p><b>Symptoms:</b> ${recordText(version.symptoms)}</p>` : ''}
            ${version.clinicalObservations ? `<p><b>Clinical observations:</b> ${recordText(version.clinicalObservations)}</p>` : ''}
            ${version.doctorNotes ? `<p><b>Doctor notes:</b> ${recordText(version.doctorNotes)}</p>` : ''}
            ${medicationSections}
            ${fluidDetails ? `<p><b>IV fluids:</b> ${fluidDetails}</p>` : ''}
            ${investigationDetails ? `<p><b>Investigations:</b> ${investigationDetails}</p>` : ''}
            ${version.nextVisitDate || version.followUpInstructions ? `<p><b>Next visit:</b> ${escapeHtml(version.nextVisitDate ? formatDate(version.nextVisitDate) : '')}${version.followUpInstructions ? ` · ${recordText(version.followUpInstructions)}` : ''}</p>` : ''}
            ${referral ? `<p><b>Referral:</b> ${referral}</p>` : ''}
          </details>
          <div class="consultation-prescription-actions">
            <button type="button" class="action-button" data-prescription-view="${escapeHtml(version.id)}" data-patient-id="${escapeHtml(patientId)}" data-consultation-id="${escapeHtml(record.id)}">View</button>
            <button type="button" class="action-button" data-prescription-print="${escapeHtml(version.id)}" data-patient-id="${escapeHtml(patientId)}" data-consultation-id="${escapeHtml(record.id)}">Print</button>
            <button type="button" class="action-button" data-prescription-download="${escapeHtml(version.id)}" data-patient-id="${escapeHtml(patientId)}" data-consultation-id="${escapeHtml(record.id)}">Save as PDF</button>
            ${canWriteConsultationPrescriptions() ? `<button type="button" class="action-button" data-prescription-revision="${escapeHtml(version.id)}" data-patient-id="${escapeHtml(patientId)}" data-consultation-id="${escapeHtml(record.id)}" title="Edit by creating a new revision; the saved version remains in history.">Edit</button>` : ''}
          </div>
        </article>`;
      }).join('')}
    </section>`;
  }

  function setConsultationWorkspaceTab(tabName) {
    document.querySelectorAll('[data-consultation-tab]').forEach((tab) => {
      const selected = tab.dataset.consultationTab === tabName;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    document.querySelectorAll('[data-consultation-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.consultationPanel !== tabName);
    });
  }

  function groupPatientDocumentsByDate(documents) {
    const grouped = new Map();
    documents.forEach((document) => {
      const reportDate = String(document.recordDate || '').slice(0, 10);
      const dateKey = reportDate ? reportDate.slice(0, 7) : 'unknown';
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey).push({ ...document, recordDate: reportDate });
    });
    return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left));
  }

  function patientDocumentType(document) {
    const dataMimeType = /^data:([^;,]+)/.exec(String(document.fileDataUrl || ''))?.[1] || '';
    const mimeType = String(document.mimeType || dataMimeType).toLowerCase();
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'text/plain') return 'text';
    return 'other';
  }

  function renderPatientDocumentCard(document) {
    const name = document.name || document.fileName || 'Clinical document';
    const fileName = document.fileName || name;
    const type = patientDocumentType(document);
    const typeLabel = type === 'image' ? 'Image'
      : type === 'pdf' ? 'PDF'
        : type === 'text' ? 'Text'
          : 'File';
    const date = document.recordDate ? formatDate(document.recordDate) : 'Date not recorded';
    const searchText = [name, fileName, date, document.source || '', typeLabel].join(' ').toLowerCase();
    const preview = type === 'image' && document.fileDataUrl
      ? `<img class="patient-document-thumbnail" src="${escapeHtml(document.fileDataUrl)}" alt="${escapeHtml(name)}" loading="lazy" />`
      : `<span class="patient-document-file-icon patient-document-file-${type}" aria-hidden="true">${escapeHtml(typeLabel)}</span>`;
    const previewMarkup = document.fileDataUrl
      ? `<a class="patient-document-preview" href="${escapeHtml(document.fileDataUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Preview ${escapeHtml(name)}">${preview}</a>`
      : `<div class="patient-document-preview">${preview}</div>`;
    return `<article class="patient-document-card" data-document-type="${type}" data-document-query="${escapeHtml(searchText)}">
      ${previewMarkup}
      <div class="patient-document-card-content">
        <small class="patient-document-card-date">${escapeHtml(date)}</small>
        <h4 title="${escapeHtml(name)}">${escapeHtml(name)}</h4>
        <div class="patient-document-card-meta"><span class="patient-document-type">${escapeHtml(typeLabel)}</span>${document.source ? `<span>${escapeHtml(document.source)}</span>` : ''}</div>
        ${document.fileDataUrl ? `<a class="patient-document-open" href="${escapeHtml(document.fileDataUrl)}" download="${escapeHtml(fileName)}" target="_blank" rel="noopener noreferrer">Open document</a>` : '<span class="patient-document-open is-unavailable">No file attached</span>'}
      </div>
    </article>`;
  }

  function renderPatientDocumentGallery(documents) {
    const counts = documents.reduce((result, document) => {
      const type = patientDocumentType(document);
      result[type] = (result[type] || 0) + 1;
      return result;
    }, {});
    const filters = [
      ['all', 'All', documents.length],
      ['image', 'Images', counts.image || 0],
      ['pdf', 'PDF', counts.pdf || 0],
      ['text', 'Text', counts.text || 0],
      ['other', 'Other', counts.other || 0],
    ].filter(([type, , count]) => type === 'all' || count > 0);
    const groups = groupPatientDocumentsByDate(documents);
    return `<div class="patient-document-gallery" data-patient-document-gallery>
      <div class="patient-document-gallery-toolbar">
        <label class="patient-document-search"><input type="search" data-document-search placeholder="Search medical records..." aria-label="Search medical records" /></label>
        <div class="patient-document-filters" role="group" aria-label="Filter medical records">${filters.map(([type, label, count], index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-document-filter="${type}">${label} <span>${count}</span></button>`).join('')}</div>
      </div>
      ${groups.map(([month, monthDocuments]) => `<section class="patient-document-month" data-document-month>
        <h4 class="patient-document-month-heading">${month === 'unknown' ? 'Date not recorded' : escapeHtml(new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`)))}<small>${monthDocuments.length} ${monthDocuments.length === 1 ? 'file' : 'files'}</small></h4>
        <div class="patient-document-card-grid">${monthDocuments.map(renderPatientDocumentCard).join('')}</div>
      </section>`).join('')}
    </div>`;
  }

  function wirePatientDocumentGallery(root) {
    const gallery = root.querySelector('[data-patient-document-gallery]');
    if (!gallery) return;
    const search = gallery.querySelector('[data-document-search]');
    const update = () => {
      const query = String(search.value || '').trim().toLowerCase();
      const activeFilter = gallery.querySelector('[data-document-filter].active')?.dataset.documentFilter || 'all';
      gallery.querySelectorAll('.patient-document-card').forEach((card) => {
        card.hidden = (activeFilter !== 'all' && card.dataset.documentType !== activeFilter)
          || !card.dataset.documentQuery.includes(query);
      });
      gallery.querySelectorAll('[data-document-month]').forEach((month) => {
        month.hidden = !month.querySelector('.patient-document-card:not([hidden])');
      });
    };
    search.addEventListener('input', update);
    gallery.querySelectorAll('[data-document-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        gallery.querySelectorAll('[data-document-filter]').forEach((filter) => filter.classList.toggle('active', filter === button));
        update();
      });
    });
  }

  function renderConsultationDocumentSummary(patientId) {
    const target = document.getElementById('consultationDocumentSummary');
    const visitDocuments = getPatientRecords(patientId).flatMap((record) => (record.reports || []).map((report) => ({
      ...report,
      recordDate: report.reportDate || record.visitDate,
    })));
    const outsideDocuments = (data.externalMedicalRecords || [])
      .filter((record) => record.patientId === patientId)
      .map((record) => ({
        name: record.fileName || record.recordType || 'Outside medical record',
        fileName: record.fileName,
        mimeType: record.mimeType,
        fileDataUrl: record.fileDataUrl,
        recordDate: record.recordDate,
        source: record.facilityName || record.doctorName || '',
      }));
    const documents = [...visitDocuments, ...outsideDocuments];
    target.innerHTML = documents.length
      ? renderPatientDocumentGallery(documents)
      : '<p class="muted">No reports or documents are recorded for this patient.</p>';
    wirePatientDocumentGallery(target);
  }

  function renderConsultationPatientHeader(patientId, encounterId) {
    const patient = patientById(patientId);
    const header = document.getElementById('consultationPatientHeader');
    const vitalsPanel = document.getElementById('consultationVitalsPanel');
    if (!patient || !header || !vitalsPanel) return;
    const queueEntry = (data.queueTokens || []).find((item) => item.encounterId === encounterId);
    const age = patientAge(patient);
    const allergyText = String(patient.knownAllergies || patient.allergies || '').trim();
    header.innerHTML = `<div class="consultation-patient-identity"><span class="consultation-patient-avatar">${escapeHtml(initials(patient.name || 'Patient'))}</span><div><h3>${escapeHtml(patient.name || 'Patient')}</h3><p>${escapeHtml(patient.code || patient.id)}${age !== '—' ? ` · ${escapeHtml(age)}` : ''}${patient.gender ? ` · ${escapeHtml(patient.gender)}` : ''}${patient.phone ? ` · ${escapeHtml(patient.phone)}` : ''}</p></div></div><div class="consultation-header-actions"><span class="consultation-token">${queueEntry?.tokenNumber ? `Token #${escapeHtml(queueEntry.tokenNumber)}` : 'Patient record'}</span><button type="button" class="button button-secondary" data-cancel-consultation>Queue</button></div>${allergyText ? `<div class="consultation-allergy-alert"><b>Allergies</b><span>${recordText(allergyText)}</span></div>` : '<div class="consultation-allergy-alert consultation-allergy-none">No allergy history recorded · Confirm with patient</div>'}`;
    const savedVitals = getPatientVitalsHistory(patientId).find((record) => record.encounterId === encounterId);
    const availableEncounter = getAvailablePatientVitalsEncounters(patientId).find((item) => item.id === encounterId);
    const encounterRecords = isApiConnected() && !canViewClinicalRecords()
      ? (data.queueTokens || [])
        .filter((token) => token.patientId === patientId && token.encounterId)
        .map((token) => ({
          id: token.encounterId,
          visitDate: token.queueDate,
          encounterType: token.encounterType || 'OPD',
          doctorName: token.doctor || 'Doctor',
        }))
      : getPatientRecords(patientId);
    const encounter = availableEncounter
      || (savedVitals ? encounterRecords.find((item) => item.id === encounterId) : null);
    const formattedTime = savedVitals?.recordedAt && Number.isFinite(new Date(savedVitals.recordedAt).getTime())
      ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(savedVitals.recordedAt))
      : '';
    const recordedBy = savedVitals?.recordedBy?.email || savedVitals?.recordedBy?.role || getStoredApiUser()?.email || 'Clinic staff';
    const tempUnit = savedVitals?.temperatureEnteredUnit === 'FAHRENHEIT' ? 'FAHRENHEIT' : 'CELSIUS';
    const savedTemperature = tempUnit === 'FAHRENHEIT' ? savedVitals?.temperatureF : savedVitals?.temperatureC;
    const format = (value) => value === null || value === undefined ? '—' : formatVitalNumber(value);
    const savedReadings = {
      bp: savedVitals?.systolicMmHg !== null && savedVitals?.systolicMmHg !== undefined
        ? `${format(savedVitals.systolicMmHg)}/${format(savedVitals.diastolicMmHg)}` : '—',
      temperature: savedTemperature === null || savedTemperature === undefined ? '—' : `${format(savedTemperature)} °${tempUnit === 'FAHRENHEIT' ? 'F' : 'C'}`,
      pulse: format(savedVitals?.pulseBpm),
      spo2: savedVitals?.spo2Percent === null || savedVitals?.spo2Percent === undefined ? '—' : `${format(savedVitals.spo2Percent)}%`,
      weight: savedVitals?.weightKg === null || savedVitals?.weightKg === undefined ? '—' : `${format(savedVitals.weightKg)} kg`,
      bmi: format(savedVitals?.bmi),
    };
    const savedStatus = savedVitals
      ? `✓ Vitals by ${recordedBy}${formattedTime ? ` · ${formattedTime}` : ''}`
      : 'Vitals not recorded · Enter today’s readings below';
    vitalsPanel.innerHTML = `<div class="consultation-vitals-status"><span class="${savedVitals ? 'is-saved' : ''}">${escapeHtml(savedStatus)}</span><button type="button" class="button button-light button-small" data-focus-consultation-vitals ${savedVitals ? 'aria-label="Vitals are read-only for this saved visit"' : ''}>${savedVitals ? 'Vitals saved' : 'Update vitals'}</button></div><div class="consultation-vitals-readings"><div><span>BP</span><b data-consultation-vital="bp">${escapeHtml(savedReadings.bp)}</b></div><div><span>Temp</span><b data-consultation-vital="temperature">${escapeHtml(savedReadings.temperature)}</b></div><div><span>Pulse</span><b data-consultation-vital="pulse">${escapeHtml(savedReadings.pulse)}<small>${savedReadings.pulse === '—' ? '' : ' bpm'}</small></b></div><div><span>SpO₂</span><b data-consultation-vital="spo2">${escapeHtml(savedReadings.spo2)}</b></div><div><span>Weight</span><b data-consultation-vital="weight">${escapeHtml(savedReadings.weight)}</b></div><div><span>BMI</span><b data-consultation-vital="bmi">${escapeHtml(savedReadings.bmi)}</b></div></div>${encounter && canAccessPatientVitals()
      ? `<div class="consultation-vitals-form ${savedVitals ? 'is-readonly' : ''}" data-patient-vitals-form data-patient-id="${escapeHtml(patientId)}"><input type="hidden" name="encounterId" value="${escapeHtml(encounterId)}"><label>BP Systolic<input name="systolicMmHg" type="number" min="40" max="300" step="1" value="${savedVitals ? escapeHtml(savedVitals.systolicMmHg ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>BP Diastolic<input name="diastolicMmHg" type="number" min="20" max="200" step="1" value="${savedVitals ? escapeHtml(savedVitals.diastolicMmHg ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>Temp (${tempUnit === 'FAHRENHEIT' ? '°F' : '°C'})<input name="temperatureValue" type="number" step="0.1" value="${savedVitals ? escapeHtml(savedTemperature ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label class="consultation-vitals-unit-label">Unit<select name="temperatureUnit" ${savedVitals ? 'disabled' : ''}><option value="CELSIUS" ${tempUnit === 'CELSIUS' ? 'selected' : ''}>°C</option><option value="FAHRENHEIT" ${tempUnit === 'FAHRENHEIT' ? 'selected' : ''}>°F</option></select></label><label>Pulse<input name="pulseBpm" type="number" min="20" max="300" value="${savedVitals ? escapeHtml(savedVitals.pulseBpm ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>SpO₂ (%)<input name="spo2Percent" type="number" min="0" max="100" step="0.1" value="${savedVitals ? escapeHtml(savedVitals.spo2Percent ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>Weight (kg)<input name="weightKg" type="number" min="0.1" max="1000" step="0.1" value="${savedVitals ? escapeHtml(savedVitals.weightKg ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>Height (cm)<input name="heightCm" type="number" min="20" max="300" step="0.1" value="${savedVitals ? escapeHtml(savedVitals.heightCm ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><label>Sugar (mg/dL)<input name="cbgMgDl" type="number" min="0" max="2000" step="0.1" value="${savedVitals ? escapeHtml(savedVitals.cbgMgDl ?? '') : ''}" ${savedVitals ? 'disabled' : ''}></label><div class="consultation-vitals-actions">${savedVitals ? '<span>Saved readings are permanent and cannot be overwritten.</span>' : '<button type="button" class="button button-light" data-cancel-consultation-vitals>Cancel</button><button class="button button-primary" type="button" data-save-consultation-vitals>Save vitals</button>'}</div></div>`
      : '<p class="muted">No active visit is available for vitals entry.</p>'}`;
    const vitalsForm = vitalsPanel.querySelector('[data-patient-vitals-form]:not(.is-readonly)');
    if (vitalsForm) {
      vitalsForm.addEventListener('input', () => updateConsultationVitalsPreview(vitalsForm));
      vitalsForm.addEventListener('change', () => updateConsultationVitalsPreview(vitalsForm));
    }
  }

  function updateConsultationVitalsPreview(form) {
    const value = (name) => String(form.querySelector(`[name="${name}"]`)?.value || '').trim();
    const number = (name) => value(name) === '' ? null : Number(value(name));
    const systolic = number('systolicMmHg');
    const diastolic = number('diastolicMmHg');
    const temperature = number('temperatureValue');
    const unit = value('temperatureUnit');
    const pulse = number('pulseBpm');
    const spo2 = number('spo2Percent');
    const weight = number('weightKg');
    const height = number('heightCm');
    const bmi = weight > 0 && height > 0 ? weight / ((height / 100) ** 2) : null;
    const values = {
      bp: systolic !== null && diastolic !== null ? `${formatVitalNumber(systolic)}/${formatVitalNumber(diastolic)}` : '—',
      temperature: temperature === null ? '—' : `${formatVitalNumber(temperature)} °${unit === 'FAHRENHEIT' ? 'F' : 'C'}`,
      pulse: pulse === null ? '—' : `${formatVitalNumber(pulse)} bpm`,
      spo2: spo2 === null ? '—' : `${formatVitalNumber(spo2)}%`,
      weight: weight === null ? '—' : `${formatVitalNumber(weight)} kg`,
      bmi: bmi === null ? '—' : formatVitalNumber(bmi),
    };
    Object.entries(values).forEach(([key, text]) => {
      const target = document.querySelector(`[data-consultation-vital="${key}"]`);
      if (target) target.textContent = text;
    });
  }

  function renderConsultationHistory(patientId, encounterId) {
    const target = document.getElementById('consultationHistoryContent');
    const records = getPatientRecords(patientId)
      .filter((record) => record.id !== encounterId)
      .sort((left, right) => String(right.visitDate || '').localeCompare(String(left.visitDate || '')));
    document.getElementById('consultationHistoryCount').textContent = String(records.length);
    target.innerHTML = records.length
      ? `<div class="consultation-history-list">${records.map((record) => `<article class="consultation-history-visit"><header><div><span>${escapeHtml(formatDate(record.visitDate))}</span><h3>${recordText(record.diagnosis || record.encounterType || 'Previous visit')}</h3></div><small>${escapeHtml(record.doctorName || 'Doctor not recorded')}</small></header>${record.symptoms ? `<p><b>Symptoms:</b> ${recordText(record.symptoms)}</p>` : ''}${record.consultationNotes ? `<p>${recordText(record.consultationNotes)}</p>` : ''}${record.prescriptionVersions?.length ? `<div class="consultation-history-prescriptions"><b>Prescription history</b>${record.prescriptionVersions.map((version) => `<p>Revision ${escapeHtml(version.revision)} · ${escapeHtml(version.medications?.map((item) => item.name || item.medicineName || 'Medicine').join(', ') || 'No medication items')}</p>`).join('')}</div>` : ''}</article>`).join('')}</div>`
      : '<div class="consultation-history-empty"><b>No previous visits</b><p>Previous consultations, diagnoses and prescriptions will appear here.</p></div>';
  }

  function setConsultationMainTab(tabName, patientId, encounterId) {
    document.querySelectorAll('[data-consultation-main-tab]').forEach((tab) => {
      const selected = tab.dataset.consultationMainTab === tabName;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    document.getElementById('consultationPrescriptionMainPanel').classList.toggle('hidden', tabName !== 'prescription');
    document.getElementById('consultationHistoryMainPanel').classList.toggle('hidden', tabName !== 'history');
    if (tabName === 'history') renderConsultationHistory(patientId, encounterId);
  }

  function fileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the selected file.'));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    });
  }

  async function openConsultationCamera() {
    const modal = document.getElementById('consultationCameraModal');
    const preview = document.getElementById('consultationCameraPreview');
    const captureButton = document.getElementById('consultationCameraCapture');
    const errorMessage = document.getElementById('consultationCameraError');
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
    captureButton.disabled = true;
    openModal('consultationCameraModal');
    if (!navigator.mediaDevices?.getUserMedia) {
      errorMessage.textContent = 'Camera access is unavailable in this browser. Use HTTPS or localhost, or choose Upload files.';
      errorMessage.classList.remove('hidden');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (modal.classList.contains('hidden')) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      consultationCameraStream = stream;
      preview.srcObject = stream;
      await preview.play();
      captureButton.disabled = false;
    } catch (error) {
      console.error('Unable to access the consultation camera.', error);
      errorMessage.textContent = error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, then try again.'
        : error.name === 'NotFoundError'
          ? 'No camera was found. Choose Upload files instead.'
          : 'The camera could not be opened. Check browser permissions or choose Upload files.';
      errorMessage.classList.remove('hidden');
    }
  }

  async function captureConsultationPhoto() {
    const preview = document.getElementById('consultationCameraPreview');
    const errorMessage = document.getElementById('consultationCameraError');
    if (!preview.videoWidth || !preview.videoHeight) {
      errorMessage.textContent = 'The camera is still starting. Please wait a moment and try again.';
      errorMessage.classList.remove('hidden');
      return;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2000 / Math.max(preview.videoWidth, preview.videoHeight));
    canvas.width = Math.max(1, Math.round(preview.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(preview.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      errorMessage.textContent = 'This browser cannot process the captured photo.';
      errorMessage.classList.remove('hidden');
      return;
    }
    context.drawImage(preview, 0, 0, canvas.width, canvas.height);
    let photoBlob = null;
    for (const quality of [0.84, 0.74, 0.64, 0.54]) {
      photoBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => result
          ? resolve(result)
          : reject(new Error('This browser could not process the captured photo.')), 'image/jpeg', quality);
      });
      if (photoBlob.size <= 2 * 1024 * 1024) break;
    }
    if (!photoBlob || photoBlob.size > 2 * 1024 * 1024) {
      errorMessage.textContent = 'This photo is still larger than the 2 MB upload limit.';
      errorMessage.classList.remove('hidden');
      return;
    }
    const photo = new File([photoBlob], `consultation-photo-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    closeModal(document.getElementById('consultationCameraModal'));
    await uploadConsultationDocuments(document.getElementById('consultationDocumentFiles'), [photo]);
  }

  async function uploadConsultationDocuments(input, selectedFiles = Array.from(input.files || [])) {
    const patientId = String(document.querySelector('#consultationPrescriptionForm [name="patientId"]').value || '');
    const encounterId = String(document.querySelector('#consultationPrescriptionForm [name="encounterId"]').value || '');
    const files = selectedFiles;
    const visit = getPatientRecords(patientId).find((record) => record.id === encounterId);
    if (!patientId || !encounterId || !visit) {
      showToast('Select an active visit before uploading documents.');
      input.value = '';
      return;
    }
    const existing = (visit.reports || []).filter((report) => report.fileDataUrl).length;
    if (existing + files.length > 12) {
      showToast('A visit can have up to 12 attached files.');
      input.value = '';
      return;
    }
    for (const selectedFile of files) {
      try {
        if (selectedFile.size > 2 * 1024 * 1024) {
          showToast(`${selectedFile.name} is larger than the 2 MB limit.`);
          continue;
        }
        if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain'].includes(selectedFile.type)) {
          showToast(`${selectedFile.name} is not a supported PDF, image, or text file.`);
          continue;
        }
        const fileDataUrl = await fileAsDataUrl(selectedFile);
        const report = {
          name: selectedFile.name,
          reportDate: dateKey(today),
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          fileDataUrl,
        };
        if (isApiConnected()) {
          const savedReport = await apiRequest(
            `/patients/${encodeURIComponent(patientId)}/records/${encodeURIComponent(encounterId)}/reports`,
            { method: 'POST', body: JSON.stringify(report) },
          );
          if (!savedReport?.id) throw new Error('The clinic API did not confirm the uploaded document.');
          visit.reports = [...(visit.reports || []), savedReport];
        } else {
          visit.reports = [...(visit.reports || []), { ...report, id: makeId('report') }];
          save();
        }
      } catch (error) {
        console.error('Unable to upload consultation document.', error);
        showToast(error.message || `Unable to upload ${selectedFile.name}.`);
      }
    }
    renderConsultationDocumentSummary(patientId);
    input.value = '';
  }

  function openConsultationPrescriptionEditor(patientId, consultationId = '', version = null, encounterId = '') {
    if (!canWriteConsultationPrescriptions()) {
      showToast('Sign in with a doctor or clinic manager account to create a prescription.');
      return;
    }
    const patient = patientById(patientId);
    if (!patient) {
      showToast('Patient record not found. Refresh and retry.');
      return;
    }
    const form = document.getElementById('consultationPrescriptionForm');
    form.reset();
    document.getElementById('prescriptionOutputLanguage').value = getPrescriptionOutputLanguage();
    form.elements.namedItem('patientId').value = patientId;
    form.elements.namedItem('consultationId').value = consultationId;
    form.elements.namedItem('encounterId').value = encounterId;
    const consultation = consultationId
      ? getPatientRecords(patientId).find((item) => item.id === consultationId)
      : null;
    const setFieldValue = (name, value) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    };
    setFieldValue('visitDate', version?.visitDate || consultation?.visitDate || dateKey(today));
    setFieldValue('doctorName', version?.doctorName || consultation?.doctorName
      || getStoredApiUser()?.email
      || data.settings.practitioner
      || '');
    [
      'diagnosisName',
      'symptoms',
      'clinicalObservations',
      'doctorNotes',
    ].forEach((name) => {
      setFieldValue(name, version?.[name] || '');
    });
    setFieldValue('nextVisitDate', version?.nextVisitDate || '');
    const storedFollowUpInstructions = String(version?.followUpInstructions || '');
    const followUpTypeMatch = /^(In clinic|Telehealth|Phone call|Other)(?:\s+—\s*)?/.exec(storedFollowUpInstructions);
    setFieldValue('followUpType', followUpTypeMatch?.[1] || 'In clinic');
    setFieldValue('followUpInstructions', followUpTypeMatch
      ? storedFollowUpInstructions.slice(followUpTypeMatch[0].length)
      : storedFollowUpInstructions);
    const referral = version?.referral || {};
    setFieldValue('referralHospitalName', referral.hospitalName || '');
    setFieldValue('referralDoctorName', referral.doctorName || '');
    setFieldValue('referralReason', referral.reason || '');
    setFieldValue('referralNotes', referral.notes || '');
    document.getElementById('consultationPrescriptionTitle').textContent = consultationId
      ? `Edit prescription · revision ${Number(version?.revision || 0) + 1}`
      : 'New consultation & prescription';
    document.getElementById('consultationPrescriptionSubtitle').textContent =
      `${patient.name} · ${patient.code}${consultationId ? ' · Previous prescription remains in history' : ''}`;
    renderConsultationPatientHeader(patientId, encounterId || consultationId);
    ['injections', 'nebulizations', 'tablets'].forEach((section) => {
      document.querySelector(`[data-rx-rows="${section}"]`).replaceChildren();
      document.querySelector(`[data-rx-results="${section}"]`).replaceChildren();
      const sectionName = { injections: 'INJECTION', nebulizations: 'NEBULIZATION', tablets: 'TABLET' }[section];
      const medications = (version?.medications || []).filter((item) => item.section === sectionName);
      medications.forEach((item) => addPrescriptionMedicationRow(section, item));
    });
    document.getElementById('ivFluidRows').replaceChildren();
    (version?.ivFluids || []).forEach((item) => addPrescriptionFluidRow(item));
    document.getElementById('investigationRows').replaceChildren();
    (version?.investigations || []).forEach((item) => addPrescriptionInvestigationRow(item));
    setConsultationWorkspaceTab('clinical');
    setConsultationMainTab('prescription', patientId, encounterId || consultationId);
    renderConsultationDocumentSummary(patientId);
    consultationPrescriptionHasChanges = false;
    openModal('consultationPrescriptionModal');
  }

  const tabletDoseChoices = ['0', '¼', '½', '¾', '1', '1½', '2'];
  const tabletDurationChoices = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const tabletStartFromChoices = ['Today', 'Tomorrow', 'After 3 days', 'After 1 week'];
  const tabletFoodTimingChoices = [
    { value: 'Before Food (AC)', label: 'Before Food (AC)' },
    { value: 'After Food (PC)', label: 'After Food (PC)' },
    { value: 'With food', label: 'With Food' },
    { value: 'Empty Stomach', label: 'Empty Stomach' },
    { value: 'Before Breakfast', label: 'Before Breakfast' },
    { value: 'After Breakfast', label: 'After Breakfast' },
    { value: 'At Bedtime', label: 'At Bedtime' },
    { value: 'Before food', label: 'Before food (legacy)' },
    { value: 'After food', label: 'After food (legacy)' },
    { value: 'Any time', label: 'Any time' },
  ];
  const tabletRouteChoices = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Eye Drops', 'Ear Drops', 'Nasal', 'Inhalation', 'Other', 'Subcutaneous', 'Intradermal'];
  let prescriptionMedicationRowSequence = 0;

  function getTabletFrequencyValue(row) {
    if (row.querySelector('[name="frequencyMode"]').value === 'custom') {
      return row.querySelector('[name="frequencyCustom"]').value.trim();
    }
    const fields = row.querySelector('[name="frequencyFormat"]').value === '4'
      ? ['frequencyMorning', 'frequencyAfternoon', 'frequencyEvening', 'frequencyNight']
      : ['frequencyMorning', 'frequencyAfternoon', 'frequencyNight'];
    const values = fields.map((name) => row.querySelector(`[name="${name}"]`).value);
    return values.some((value) => value !== '0') ? values.join('-') : '';
  }

  function getTabletFrequencySlotValues(row) {
    const parseDose = (name) => {
      const value = row.querySelector(`[name="${name}"]`).value;
      return value !== '0';
    };
    const fourSlots = row.querySelector('[name="frequencyFormat"]').value === '4';
    return {
      morning: parseDose('frequencyMorning'),
      afternoon: parseDose('frequencyAfternoon'),
      evening: fourSlots && parseDose('frequencyEvening'),
      night: parseDose('frequencyNight'),
    };
  }

  function getTabletDurationValue(row) {
    const preset = row.querySelector('[name="durationPreset"]').value;
    return preset === 'custom' ? row.querySelector('[name="durationDays"]').value : preset;
  }

  function getTabletStartFromValue(row) {
    const preset = row.querySelector('[name="startFromPreset"]').value;
    return preset === 'custom' ? row.querySelector('[name="startFrom"]').value.trim() : preset;
  }

  function getPrescriptionDosesPerDay(frequency) {
    const doseValues = { '0': 0, '¼': 0.25, '½': 0.5, '¾': 0.75, '1': 1, '1½': 1.5, '2': 2 };
    const slots = frequency.trim().split(/\s*-\s*/);
    if ((slots.length === 3 || slots.length === 4) && slots.every((slot) => Object.hasOwn(doseValues, slot))) {
      const doses = slots.reduce((total, count) => total + doseValues[count], 0);
      return doses > 0 && doses <= 24 ? doses : null;
    }

    const normalized = frequency.trim().toLowerCase().replace(/\s+/g, ' ');
    const dailyFrequency = /^(once|twice|three times|four times)(?: a day| daily)$/.exec(normalized);
    if (dailyFrequency) {
      return { once: 1, twice: 2, 'three times': 3, 'four times': 4 }[dailyFrequency[1]];
    }
    return null;
  }

  function updateTabletPrescriptionQuantity(row) {
    const quantity = row.querySelector('[name="quantity"]');
    const helper = row.querySelector('[data-rx-quantity-help]');
    const dosesPerDay = getPrescriptionDosesPerDay(getTabletFrequencyValue(row));
    const durationDays = Number(getTabletDurationValue(row));
    const calculatedQuantity = dosesPerDay * durationDays;
    if (!dosesPerDay || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365
      || calculatedQuantity > 10000) {
      quantity.value = '';
      const hasDuration = Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= 365;
      helper.textContent = !dosesPerDay && hasDuration
        ? 'Custom schedules need a manually entered quantity.'
        : 'Choose a frequency and duration to calculate quantity.';
      return;
    }

    quantity.value = String(Math.ceil(calculatedQuantity));
    helper.textContent = 'Auto-calculated from the daily dose total × days, rounded up to whole units; you can adjust it.';
  }

  function updateTabletCustomFields(row) {
    [
      ['durationPreset', 'durationDays'],
      ['startFromPreset', 'startFrom'],
    ].forEach(([selectName, inputName]) => {
      const select = row.querySelector(`[name="${selectName}"]`);
      const input = row.querySelector(`[name="${inputName}"]`);
      const isCustom = select.value === 'custom';
      input.classList.toggle('hidden', !isCustom);
      input.required = isCustom && select.required;
    });
  }

  function updateTabletFrequency(row) {
    const mode = row.querySelector('[name="frequencyMode"]');
    const customInput = row.querySelector('[name="frequencyCustom"]');
    const output = row.querySelector('[data-rx-frequency-preview]');
    const custom = mode.value === 'custom';
    customInput.classList.toggle('hidden', !custom);
    customInput.required = custom;
    const frequency = getTabletFrequencyValue(row);
    output.textContent = frequency || 'Choose a dose for at least one time slot.';
    mode.setCustomValidity(frequency ? '' : 'Choose at least one dose or enter a custom frequency.');
    row.querySelector('[data-rx-frequency-evening]').classList.toggle('hidden', row.querySelector('[name="frequencyFormat"]').value !== '4');
  }

  function addPrescriptionMedicationRow(section, medication = null, custom = false) {
    const container = document.querySelector(`[data-rx-rows="${section}"]`);
    const availableMedicine = medication?.medicineId
      ? data.medicines.find((item) => item.id === medication.medicineId)
      : null;
    const medicineId = availableMedicine?.id || '';
    const isCustom = custom || !medicineId;
    const name = medication?.name || medication?.medicineName || availableMedicine?.name || '';
    const genericName = medication?.genericName || availableMedicine?.name || '';
    const brand = medication?.brand || availableMedicine?.brand || '';
    const manufacturer = medication?.manufacturer || availableMedicine?.manufacturer || '';
    const strength = medication?.strength || availableMedicine?.productSize || '';
    const injectionRoutes = ['IV', 'IM', 'SC', 'Other'];
    if (medication?.route && !injectionRoutes.includes(medication.route)) injectionRoutes.unshift(medication.route);
    const route = section === 'injections'
      ? `<label>Route<select name="route" required><option value="">Select route</option>${injectionRoutes.map((value) => `<option value="${escapeHtml(value)}" ${medication?.route === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></label>`
      : '';
    const combination = section === 'nebulizations'
      ? `<label>Medicine combination<input name="combination" maxlength="300" value="${escapeHtml(medication?.combination || '')}" /></label>`
      : '';
    const schedule = '';
    const injectionDispositions = ['Stat — in OPD', 'Once', 'Daily', 'Other'];
    const injectionDispositionOptions = medication?.frequency && !injectionDispositions.includes(medication.frequency)
      ? [medication.frequency, ...injectionDispositions]
      : injectionDispositions;
    const row = document.createElement('article');
    row.className = 'rx-medication-row';
    const medicineSuggestionId = `rx-medicine-suggestions-${++prescriptionMedicationRowSequence}`;
    const existingFrequencyParts = String(medication?.frequency || '').trim().split(/\s*-\s*/);
    const existingDoseChoices = new Set(tabletDoseChoices);
    const hasSlotFrequency = (existingFrequencyParts.length === 3 || existingFrequencyParts.length === 4)
      && existingFrequencyParts.every((value) => existingDoseChoices.has(value));
    const frequencyMode = hasSlotFrequency || !medication?.frequency ? 'slots' : 'custom';
    const frequencyFormat = existingFrequencyParts.length === 4 ? '4' : '3';
    const frequencySlots = hasSlotFrequency
      ? existingFrequencyParts
      : [medication?.morning ? '1' : '0', medication?.afternoon ? '1' : '0', medication?.evening ? '1' : '0', medication?.night ? '1' : '0'];
    const doseOptions = (name, value, label) => `<label>${label}<select name="${name}" aria-label="${label} dose">${tabletDoseChoices.map((choice) => `<option value="${choice}" ${value === choice ? 'selected' : ''}>${choice}</option>`).join('')}</select></label>`;
    const selectedDuration = tabletDurationChoices.includes(Number(medication?.durationDays))
      ? String(medication.durationDays)
      : medication?.durationDays ? 'custom' : '';
    const selectedStartFrom = tabletStartFromChoices.find((value) => value.toLowerCase() === String(medication?.startFrom || '').toLowerCase())
      || (medication?.startFrom ? 'custom' : '');
    row.innerHTML = section === 'injections' ? `
      <input type="hidden" name="medicineId" value="${escapeHtml(medicineId)}" />
      <input type="hidden" name="genericName" value="${escapeHtml(genericName)}" />
      <input type="hidden" name="brand" value="${escapeHtml(brand)}" />
      <input type="hidden" name="manufacturer" value="${escapeHtml(manufacturer)}" />
      <input type="hidden" name="strength" value="${escapeHtml(strength)}" />
      <input type="hidden" name="durationDays" value="${escapeHtml(medication?.durationDays ?? '')}" />
      <input type="hidden" name="quantity" value="${escapeHtml(medication?.quantity ?? '')}" />
      <input type="hidden" name="instructions" value="${escapeHtml(medication?.instructions || '')}" />
      <label>Injection / procedure<input name="name" required minlength="2" maxlength="160" placeholder="Medicine or procedure" value="${escapeHtml(name)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Dose<input name="dosage" type="text" maxlength="120" placeholder="e.g. 1 mL" required value="${escapeHtml(medication?.dosage || '')}" /></label>
      ${route}
      <label>Disposition<select name="frequency" required><option value="">Select</option>${injectionDispositionOptions.map((value) => `<option ${medication?.frequency === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></label>
      <button type="button" class="rx-remove-row" data-rx-remove-row aria-label="Remove injection or procedure">×</button>` : section === 'tablets' ? `
      <input type="hidden" name="medicineId" value="${escapeHtml(medicineId)}" />
      <label class="rx-tablet-medicine">Medicine name<span class="rx-autocomplete-wrap"><input name="name" required minlength="2" maxlength="160" autocomplete="off" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="${medicineSuggestionId}" value="${escapeHtml(name)}" ${isCustom ? '' : 'readonly'} /><button type="button" class="rx-autocomplete-toggle" data-rx-autocomplete-toggle aria-label="Show medicine suggestions" aria-expanded="false">▾</button><span class="rx-medicine-autocomplete hidden" id="${medicineSuggestionId}" role="listbox"></span></span></label>
      <label>Dosage <span>*</span><input name="dosage" type="text" maxlength="120" placeholder="1 tablet" required value="${escapeHtml(medication?.dosage || '')}" /></label>
      <div class="rx-frequency-editor">
        <label>Frequency mode<select name="frequencyMode" required><option value="slots" ${frequencyMode === 'slots' ? 'selected' : ''}>Select time slots</option><option value="custom" ${frequencyMode === 'custom' ? 'selected' : ''}>Custom frequency</option></select></label>
        <div class="rx-frequency-slots" data-rx-frequency-slots>
          <label>Schedule<select name="frequencyFormat" aria-label="Frequency schedule"><option value="3" ${frequencyFormat === '3' ? 'selected' : ''}>Morning–Afternoon–Night</option><option value="4" ${frequencyFormat === '4' ? 'selected' : ''}>Morning–Afternoon–Evening–Night</option></select></label>
          <div class="rx-frequency-slot-grid">
            ${doseOptions('frequencyMorning', frequencySlots[0], 'Morning')}
            ${doseOptions('frequencyAfternoon', frequencySlots[1], 'Afternoon')}
            <div data-rx-frequency-evening class="${frequencyFormat === '4' ? '' : 'hidden'}">${doseOptions('frequencyEvening', frequencyFormat === '4' ? frequencySlots[2] : '0', 'Evening')}</div>
            ${doseOptions('frequencyNight', frequencySlots[frequencyFormat === '4' ? 3 : 2], 'Night')}
          </div>
          <output data-rx-frequency-preview aria-live="polite"></output>
        </div>
        <input class="${frequencyMode === 'custom' ? '' : 'hidden'}" name="frequencyCustom" type="text" list="rxCustomFrequencyOptions" maxlength="120" placeholder="Type custom frequency" aria-label="Custom frequency" value="${escapeHtml(frequencyMode === 'custom' ? medication?.frequency || '' : '')}" />
      </div>
      <label>Duration <span>*</span><select name="durationPreset" required><option value="">Choose</option>${tabletDurationChoices.map((days) => `<option value="${days}" ${selectedDuration === String(days) ? 'selected' : ''}>${days} days</option>`).join('')}<option value="custom" ${selectedDuration === 'custom' ? 'selected' : ''}>Custom…</option></select><input class="hidden" name="durationDays" type="number" min="1" max="365" placeholder="Days" aria-label="Custom duration in days" value="${escapeHtml(selectedDuration === 'custom' ? medication?.durationDays ?? '' : '')}" /></label>
      <label>Start from<select name="startFromPreset"><option value="">Choose</option>${tabletStartFromChoices.map((value) => `<option value="${escapeHtml(value)}" ${selectedStartFrom === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}<option value="custom" ${selectedStartFrom === 'custom' ? 'selected' : ''}>Custom…</option></select><input class="hidden" name="startFrom" type="text" maxlength="80" placeholder="Enter start date" aria-label="Custom start date" value="${escapeHtml(selectedStartFrom === 'custom' ? medication?.startFrom || '' : '')}" /></label>
      <label class="rx-tablet-instructions">Instructions<input name="instructions" list="rxInstructionOptions" maxlength="1000" placeholder="After food" value="${escapeHtml(medication?.instructions || '')}" /></label>
      <label class="rx-tablet-quantity">Qty<input name="quantity" type="number" min="1" max="10000" step="1" value="${escapeHtml(medication?.quantity ?? '')}" required /><small data-rx-quantity-help>Calculated when frequency and duration are selected.</small></label>
      <button type="button" class="rx-remove-row" data-rx-remove-row aria-label="Remove medicine">×</button>
      <details class="rx-tablet-extra-details" open><summary>More medicine details</summary>
      <div class="rx-tablet-extra">
        <label>Generic name<input name="genericName" maxlength="160" value="${escapeHtml(genericName)}" ${isCustom ? '' : 'readonly'} /></label>
        <label>Brand<input name="brand" maxlength="120" value="${escapeHtml(brand)}" ${isCustom ? '' : 'readonly'} /></label>
        <label>Company<input name="manufacturer" maxlength="160" value="${escapeHtml(manufacturer)}" ${isCustom ? '' : 'readonly'} /></label>
        <label>Strength<input name="strength" maxlength="120" value="${escapeHtml(strength)}" ${isCustom ? '' : 'readonly'} /></label>
        <label>Route<select name="route"><option value="">Select route</option>${tabletRouteChoices.map((value) => `<option value="${escapeHtml(value)}" ${medication?.route === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></label>
        <label>Food timing<select name="foodTiming" required><option value="">Select</option>${tabletFoodTimingChoices.map((choice) => `<option value="${escapeHtml(choice.value)}" ${medication?.foodTiming === choice.value ? 'selected' : ''}>${escapeHtml(choice.label)}</option>`).join('')}</select></label>
      </div>
      </details>` : `
      <input type="hidden" name="medicineId" value="${escapeHtml(medicineId)}" />
      <label>Medicine name<input name="name" required minlength="2" maxlength="160" value="${escapeHtml(name)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Generic name<input name="genericName" maxlength="160" value="${escapeHtml(genericName)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Brand<input name="brand" maxlength="120" value="${escapeHtml(brand)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Company<input name="manufacturer" maxlength="160" value="${escapeHtml(manufacturer)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Strength<input name="strength" maxlength="120" value="${escapeHtml(strength)}" ${isCustom ? '' : 'readonly'} /></label>
      <label>Dosage <span>*</span><input name="dosage" ${section === 'tablets' ? 'type="text" maxlength="120" placeholder="e.g. 1 tablet"' : 'type="number" min="0.01" step="0.01" max="10000" placeholder="mL"'} required value="${escapeHtml(section === 'tablets' ? medication?.dosage || '' : String(medication?.dosage || '').replace(/\s*ml$/i, ''))}" /></label>
      <label>Frequency <span>*</span><input name="frequency" list="rxFrequencyOptions" required maxlength="120" placeholder="e.g. 1-0-1" value="${escapeHtml(medication?.frequency || '')}" /></label>
      ${route}${combination}${schedule}
      <label>Days<input name="durationDays" type="number" min="1" max="365" value="${escapeHtml(medication?.durationDays ?? '')}" ${section === 'tablets' ? 'required' : ''} /></label>
      <label>Total quantity<input name="quantity" type="number" min="1" max="10000" value="${escapeHtml(medication?.quantity ?? '')}" ${section === 'tablets' ? 'required' : ''} /></label>
      <label class="form-full">Instructions<textarea name="instructions" maxlength="1000" rows="1">${escapeHtml(medication?.instructions || '')}</textarea></label>
      <button type="button" class="rx-remove-row" data-rx-remove-row aria-label="Remove medicine">Remove</button>`;
    container.append(row);
    if (section === 'tablets') {
      updateTabletCustomFields(row);
      updateTabletFrequency(row);
      if (!medication?.quantity) updateTabletPrescriptionQuantity(row);
      else row.querySelector('[data-rx-quantity-help]').textContent = 'Saved quantity; change the frequency or duration to recalculate.';
    }
  }

  function renderPrescriptionMedicineSuggestions(input, showAll = false) {
    const row = input.closest('.rx-medication-row');
    const list = row.querySelector('.rx-medicine-autocomplete');
    const query = input.value.trim().toLowerCase();
    const matches = data.medicines.filter((medicine) => medicine.active !== false &&
      [medicine.name, medicine.brand, medicine.manufacturer, medicine.category, medicine.productSize]
        .some((value) => String(value || '').toLowerCase().includes(query))
    ).slice(0, 8);
    if (!showAll && !query) {
      list.replaceChildren();
      list.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      row.querySelector('[data-rx-autocomplete-toggle]').setAttribute('aria-expanded', 'false');
      return;
    }
    list.innerHTML = matches.map((medicine, index) => `<button type="button" role="option" aria-selected="false" id="${list.id}-option-${index}" data-rx-select-medicine="${escapeHtml(medicine.id)}"><b>${escapeHtml(medicine.name)}</b><small>${escapeHtml([medicine.brand, medicine.productSize, `Stock: ${Number(medicine.quantity || 0)}`].filter(Boolean).join(' · '))}</small></button>`).join('')
      || '<span class="rx-medicine-no-match">No matching active clinic medicines.</span>';
    list.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
    row.querySelector('[data-rx-autocomplete-toggle]').setAttribute('aria-expanded', 'true');
  }

  function closePrescriptionMedicineSuggestions(row) {
    const input = row.querySelector('.rx-tablet-medicine [name="name"]');
    const list = row.querySelector('.rx-medicine-autocomplete');
    list.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    row.querySelector('[data-rx-autocomplete-toggle]').setAttribute('aria-expanded', 'false');
  }

  function selectPrescriptionMedicine(row, medicine) {
    row.querySelector('[name="medicineId"]').value = medicine.id;
    const nameInput = row.querySelector('.rx-tablet-medicine [name="name"]');
    nameInput.value = medicine.name;
    nameInput.dataset.selectedName = medicine.name;
    ['genericName', 'brand', 'manufacturer', 'strength'].forEach((field) => {
      const input = row.querySelector(`[name="${field}"]`);
      const value = field === 'genericName' ? medicine.name : field === 'strength' ? medicine.productSize : medicine[field];
      input.value = value || '';
      input.readOnly = true;
    });
    closePrescriptionMedicineSuggestions(row);
    row.querySelector('[name="dosage"]').focus();
  }

  function addPrescriptionFluidRow(fluid = {}) {
    const row = document.createElement('article');
    row.className = 'rx-structured-row';
    row.innerHTML = `<label>Fluid<select name="type">${['RL', 'NS', '25D', 'DNS', 'Other'].map((value) => `<option ${fluid.type === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>Quantity (ml)<input name="quantityMl" type="number" min="0.01" max="10000" step="0.01" required value="${escapeHtml(fluid.quantityMl ?? '')}" /></label>
      <label>Flow rate<input name="flowRate" required maxlength="100" placeholder="e.g. 60 ml/hour" value="${escapeHtml(fluid.flowRate || '')}" /></label>
      <label>Duration<input name="duration" required maxlength="100" placeholder="e.g. 4 hours" value="${escapeHtml(fluid.duration || '')}" /></label>
      <label class="form-full">Instructions<textarea name="instructions" maxlength="1000" rows="1">${escapeHtml(fluid.instructions || '')}</textarea></label>
      <button type="button" class="rx-remove-row" data-rx-remove-row>Remove</button>`;
    document.getElementById('ivFluidRows').append(row);
  }

  function addPrescriptionInvestigationRow(investigation = {}) {
    const categories = ['Blood test', 'Urine test', 'X-ray', 'ECG', 'Scan', 'Custom investigation'];
    const row = document.createElement('article');
    row.className = 'rx-structured-row';
    row.innerHTML = `<label>Type<select name="category">${categories.map((value) => `<option ${investigation.category === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label>Investigation name<input name="name" required minlength="2" maxlength="160" value="${escapeHtml(investigation.name || '')}" placeholder="e.g. Complete blood count" /></label>
      <label class="form-full">Instructions<textarea name="instructions" maxlength="500" rows="1">${escapeHtml(investigation.instructions || '')}</textarea></label>
      <button type="button" class="rx-remove-row" data-rx-remove-row>Remove</button>`;
    document.getElementById('investigationRows').append(row);
  }

  function searchPrescriptionMedicines(section) {
    const query = document.querySelector(`[data-rx-search="${section}"]`).value.trim().toLowerCase();
    const matches = data.medicines.filter((medicine) => medicine.active !== false &&
      [medicine.name, medicine.brand, medicine.manufacturer, medicine.category]
        .some((value) => String(value || '').toLowerCase().includes(query))
    ).slice(0, 30);
    const results = document.querySelector(`[data-rx-results="${section}"]`);
    results.innerHTML = matches.map((medicine) => `<button type="button" data-rx-add-medicine="${escapeHtml(medicine.id)}" data-rx-section="${section}">
      <b>${escapeHtml(medicine.brand ? `${medicine.brand} · ${medicine.name}` : medicine.name)}</b>
      <small>${escapeHtml(medicine.manufacturer || 'Company not recorded')} · Generic: ${escapeHtml(medicine.name)}</small>
    </button>`).join('') || '<span class="muted">No matching active medicines in the clinic database.</span>';
  }

  function getPrescriptionMedicationPayload(section) {
    return [...document.querySelectorAll(`[data-rx-rows="${section}"] .rx-medication-row`)].map((row) => {
      const value = (name) => row.querySelector(`[name="${name}"]`);
      const medicineId = value('medicineId').value;
      const dosage = value('dosage').value.trim();
      const frequency = section === 'tablets'
        ? getTabletFrequencyValue(row)
        : value('frequency').value.trim();
      const durationDays = section === 'tablets'
        ? getTabletDurationValue(row)
        : value('durationDays')?.value;
      const tabletSlots = section === 'tablets' ? getTabletFrequencySlotValues(row) : null;
      const startFrom = section === 'tablets'
        ? getTabletStartFromValue(row)
        : value('startFrom')?.value.trim();
      const result = {
        ...(medicineId ? { medicineId } : {
          name: value('name').value.trim(),
          genericName: value('genericName').value.trim(),
          brand: value('brand').value.trim(),
          manufacturer: value('manufacturer').value.trim(),
        }),
        ...(value('strength').value.trim() ? { strength: value('strength').value.trim() } : {}),
        dosage: section === 'nebulizations' ? `${dosage} ml` : dosage,
        frequency,
        ...(value('route')?.value ? { route: value('route').value } : {}),
        ...(value('combination')?.value.trim() ? { combination: value('combination').value.trim() } : {}),
        ...(tabletSlots ? {
          ...tabletSlots,
          ...(value('foodTiming').value ? { foodTiming: value('foodTiming').value } : {}),
        } : {}),
        ...(durationDays ? { durationDays: Number.parseInt(durationDays, 10) || undefined } : {}),
        ...(startFrom ? { startFrom: startFrom.trim() } : {}),
        ...(value('quantity')?.value ? { quantity: Number(value('quantity').value) } : {}),
        ...(value('instructions').value.trim() ? { instructions: value('instructions').value.trim() } : {}),
      };
      return result;
    });
  }

  function buildConsultationPrescriptionPayload(form) {
    const fields = new FormData(form);
    const ivFluids = [...document.querySelectorAll('#ivFluidRows .rx-structured-row')].map((row) => ({
      type: row.querySelector('[name="type"]').value,
      quantityMl: Number(row.querySelector('[name="quantityMl"]').value),
      flowRate: row.querySelector('[name="flowRate"]').value.trim(),
      duration: row.querySelector('[name="duration"]').value.trim(),
      ...(row.querySelector('[name="instructions"]').value.trim()
        ? { instructions: row.querySelector('[name="instructions"]').value.trim() }
        : {}),
    }));
    const investigations = [...document.querySelectorAll('#investigationRows .rx-structured-row')].map((row) => ({
      category: row.querySelector('[name="category"]').value,
      name: row.querySelector('[name="name"]').value.trim(),
      ...(row.querySelector('[name="instructions"]').value.trim()
        ? { instructions: row.querySelector('[name="instructions"]').value.trim() }
        : {}),
    }));
    const referral = {
      hospitalName: String(fields.get('referralHospitalName') || '').trim(),
      doctorName: String(fields.get('referralDoctorName') || '').trim(),
      reason: String(fields.get('referralReason') || '').trim(),
      notes: String(fields.get('referralNotes') || '').trim(),
    };
    const symptomRows = [...document.querySelectorAll('[data-clinical-symptoms], .clinical-symptom-row')].map((row) => {
      const name = row.querySelector('[name="symptomName"]')?.value.trim();
      const duration = row.querySelector('[name="symptomDuration"]')?.value.trim();
      const severity = row.querySelector('[data-clinical-menu="symptomSeverity"]')?.textContent.trim();
      return [name, duration, severity].filter(Boolean).join(' — ');
    }).filter(Boolean);
    const complaints = String(fields.get('complaints') || '').trim();
    const selectedPast = [...document.querySelectorAll('[data-history-chips="past"] .clinical-chip.active')].map((chip) => chip.textContent.trim());
    const selectedHabits = [...document.querySelectorAll('[data-history-chips="habits"] .clinical-chip.active')].map((chip) => chip.textContent.trim());
    const diagnosisStatus = document.querySelector('[data-clinical-menu="diagnosisStatus"]')?.textContent.trim();
    const clinicalNotes = [
      selectedPast.length ? `Past illness: ${selectedPast.join(', ')}` : '',
      selectedHabits.length ? `Habits: ${selectedHabits.join(', ')}` : '',
      String(fields.get('familyHistory') || '').trim() ? `Family history: ${String(fields.get('familyHistory')).trim()}` : '',
      String(fields.get('surgicalHistory') || '').trim() ? `Surgical/obstetric: ${String(fields.get('surgicalHistory')).trim()}` : '',
      String(fields.get('currentMedication') || '').trim() ? `Current medication: ${String(fields.get('currentMedication')).trim()}` : '',
      String(fields.get('otherNotes') || '').trim() ? `Other notes: ${String(fields.get('otherNotes')).trim()}` : '',
      diagnosisStatus ? `Diagnosis status: ${diagnosisStatus}` : '',
    ].filter(Boolean).join('\n');
    const advice = String(fields.get('advice') || '').trim();
    const dietaryAdvice = String(fields.get('dietaryAdvice') || '').trim();
    const doctorNotes = [
      clinicalNotes,
      String(fields.get('doctorNotes') || '').trim(),
      advice ? `Advice: ${advice}` : '',
      dietaryAdvice ? `Dietary advice: ${dietaryAdvice}` : '',
    ].filter(Boolean).join('\n');
    const nextVisitDate = String(fields.get('nextVisitDate') || '');
    const followUpDetails = String(fields.get('followUpInstructions') || '').trim();
    const followUpType = String(fields.get('followUpType') || '').trim();
    const followUpInstructions = nextVisitDate || followUpDetails
      ? [followUpType, followUpDetails].filter(Boolean).join(' — ')
      : '';
    return {
      ...(String(fields.get('encounterId') || '')
        ? { encounterId: String(fields.get('encounterId')) }
        : {}),
      visitDate: String(fields.get('visitDate') || ''),
      doctorName: String(fields.get('doctorName') || '').trim(),
      diagnosisName: [String(fields.get('diagnosisName') || '').trim(), String(fields.get('diagnosisIcd') || '').trim() !== 'ICD-10' ? String(fields.get('diagnosisIcd') || '').trim() : ''].filter(Boolean).join(' — '),
      symptoms: [complaints ? `Complaints: ${complaints}` : '', ...symptomRows].filter(Boolean).join('\n'),
      clinicalObservations: String(fields.get('clinicalObservations') || '').trim(),
      doctorNotes,
      injections: getPrescriptionMedicationPayload('injections'),
      nebulizations: getPrescriptionMedicationPayload('nebulizations'),
      tablets: getPrescriptionMedicationPayload('tablets'),
      ivFluids,
      ...(nextVisitDate
        ? { nextVisitDate }
        : {}),
      followUpInstructions,
      investigations,
      ...(Object.values(referral).some(Boolean) ? { referral } : {}),
    };
  }

  function saveLocalConsultationPrescription(patientId, payload) {
    const encounter = data.patientRecords.find((record) => record.id === payload.encounterId && record.patientId === patientId);
    if (!encounter) throw new Error('Create or select an active visit from the doctor queue before saving a consultation.');
    const previousVersions = Array.isArray(encounter.prescriptionVersions) ? encounter.prescriptionVersions : [];
    const version = {
      id: makeId('prescription-version'),
      revision: Math.max(0, ...previousVersions.map((item) => Number(item.revision) || 0)) + 1,
      visitDate: payload.visitDate,
      doctorName: payload.doctorName,
      diagnosisName: payload.diagnosisName,
      symptoms: payload.symptoms,
      clinicalObservations: payload.clinicalObservations,
      doctorNotes: payload.doctorNotes,
      medications: [
        ...payload.injections.map((item) => ({ ...item, id: makeId('prescription-medication'), section: 'INJECTION' })),
        ...payload.nebulizations.map((item) => ({ ...item, id: makeId('prescription-medication'), section: 'NEBULIZATION' })),
        ...payload.tablets.map((item) => ({ ...item, id: makeId('prescription-medication'), section: 'TABLET' })),
      ],
      ivFluids: payload.ivFluids,
      investigations: payload.investigations,
      nextVisitDate: payload.nextVisitDate || '',
      followUpInstructions: payload.followUpInstructions,
      referral: payload.referral || null,
      createdAt: new Date().toISOString(),
      createdBy: { email: getStoredApiUser()?.email || 'Clinic doctor' },
    };
    encounter.prescriptionVersions = [version, ...previousVersions];
    if (payload.diagnosisName) encounter.diagnosis = payload.diagnosisName;
    if (payload.symptoms) encounter.symptoms = payload.symptoms;
    encounter.consultationNotes = [payload.clinicalObservations, payload.doctorNotes].filter(Boolean).join('\n\n');
    encounter.followUpDate = payload.nextVisitDate || '';
    encounter.followUpInstructions = payload.followUpInstructions;
    if (payload.investigations.length) {
      encounter.investigationAdvice = payload.investigations.map((item) => `${item.category}: ${item.name}`).join('; ');
    }
    save();
    return { id: version.id, encounterId: encounter.id };
  }

  function findPrescriptionVersion(patientId, consultationId, versionId) {
    const record = getPatientRecords(patientId).find((item) => item.id === consultationId);
    const version = record?.prescriptionVersions?.find((item) => item.id === versionId);
    return record && version ? { record, version } : null;
  }

  function getPrescriptionOutputLanguage() {
    const language = localStorage.getItem('cskClinicPrescriptionLanguage');
    return ['english', 'tamil', 'both'].includes(language) ? language : 'both';
  }

  function openPrescriptionDocument(patient, record, version, autoPrint = false) {
    const language = getPrescriptionOutputLanguage();
    const label = (english, tamil) => language === 'english' ? english : language === 'tamil' ? tamil : `${english} / ${tamil}`;
    const recordedVitals = record.vitalsRecords?.[0] || record.vitalsRecord || {};
    const readVital = (name) => record[name] ?? recordedVitals[name];
    const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';
    const displayValue = (value) => hasValue(value) ? String(value).trim() : '';
    const displayNumber = (value) => {
      if (!hasValue(value)) return '';
      const number = Number(value);
      return Number.isFinite(number) ? String(Number(number.toFixed(1))) : String(value).trim();
    };
    const prescriptionDate = (value) => {
      const date = String(value || '').slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
    };
    const followUpDate = version.nextVisitDate || record.followUpDate || '';
    const age = patient.dob ? patientAge(patient).replace(/\s*yrs?$/i, '') : '';
    const genderValue = String(patient.gender || '').trim();
    const gender = ({ MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' })[genderValue.toUpperCase()] || genderValue;
    const systolic = readVital('systolicMmHg');
    const diastolic = readVital('diastolicMmHg');
    const bloodPressure = displayValue(record.bloodPressure)
      || (hasValue(systolic) || hasValue(diastolic) ? `${displayValue(systolic)}/${displayValue(diastolic)}` : '');
    const temperatureC = readVital('temperatureC');
    const recordedTemperatureF = readVital('temperatureF');
    const temperatureF = hasValue(recordedTemperatureF)
      ? recordedTemperatureF
      : hasValue(temperatureC) ? (Number(temperatureC) * 9 / 5 + 32).toFixed(1) : '';
    const temperature = hasValue(temperatureF) && hasValue(temperatureC)
      ? `${displayNumber(temperatureF)} / ${displayNumber(temperatureC)}`
      : displayNumber(temperatureF || temperatureC);
    const heightCm = readVital('heightCm');
    const weightKg = readVital('weightKg');
    const recordedBmi = readVital('bmi');
    const bmi = hasValue(recordedBmi)
      ? displayNumber(recordedBmi)
      : Number(heightCm) > 0 && Number(weightKg) > 0
        ? (Number(weightKg) / ((Number(heightCm) / 100) ** 2)).toFixed(1)
        : '';
    const knownHistory = data.patientHistoryRecords.find((history) => history.patientId === patient.id);
    const activeHistory = activePatientProfileId === patient.id ? activePatientHistory : null;
    const selectedQueueEntry = getDoctorQueueEntries().find((entry) => entry.id === activeDoctorQueueTokenId);
    const doctorHistory = selectedQueueEntry?.patientId === patient.id ? activeDoctorPatientHistory : null;
    const conditionNames = [
      ...(knownHistory?.medicalConditions || []),
      ...(activeHistory?.medicalConditions || []),
      ...(doctorHistory?.medicalConditions || []),
    ].map((condition) => condition.condition || condition.name).filter(Boolean);
    const knownCases = [
      record.knownCase,
      patient.medicalHistory,
      ...conditionNames,
    ].flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const knownCase = [...new Set(knownCases)].join(', ');
    const medicineItems = Array.isArray(version.medications) ? version.medications : [];
    const sectionNames = {
      TABLET: label('Medicines', 'மருந்துகள்'),
      INJECTION: label('Injections', 'ஊசிகள்'),
      NEBULIZATION: label('Nebulization', 'நெபுலைசேஷன்'),
    };
    const frequencyMeaning = (frequency) => {
      const slots = String(frequency || '').split(/\s*-\s*/);
      if (slots.length !== 3 && slots.length !== 4) return '';
      const times = slots.length === 4 ? ['Morning', 'Afternoon', 'Evening', 'Night'] : ['Morning', 'Afternoon', 'Night'];
      const tamilTimes = { Morning: 'காலை', Afternoon: 'மதியம்', Evening: 'மாலை', Night: 'இரவு' };
      return slots.map((dose, index) => dose === '0' ? '' : `${dose} ${label(times[index], tamilTimes[times[index]])}`).filter(Boolean).join(' · ');
    };
    const foodTimingTamil = {
      'Before food': 'உணவுக்கு முன்',
      'Before Food (AC)': 'உணவுக்கு முன் (AC)',
      'After food': 'உணவுக்குப் பின்',
      'After Food (PC)': 'உணவுக்குப் பின் (PC)',
      'With food': 'உணவுடன்',
      'Empty Stomach': 'வெறும் வயிற்றில்',
      'Before Breakfast': 'காலை உணவுக்கு முன்',
      'After Breakfast': 'காலை உணவுக்குப் பின்',
      'At Bedtime': 'படுக்கைக்கு முன்',
      'Any time': 'எந்த நேரத்திலும்',
    };
    const blocks = [];
    let serial = 0;
    const addMedicationSection = (section) => {
      const items = medicineItems.filter((item) => (item.section || 'TABLET') === section);
      if (!items.length) return;
      blocks.push({ html: `<div class="rx-section-title">${sectionNames[section]}</div>`, lines: 1 });
      items.forEach((item) => {
        serial += 1;
        const name = item.name || item.medicineName || item.medicine?.name || '';
        const main = [
          `${serial}. ${name}${item.strength ? ` · ${item.strength}` : ''}`,
          item.dosage ? `${label('Dose', 'அளவு')}: ${item.dosage}` : '',
        ].filter(Boolean).join(' · ');
        const frequency = String(item.frequency || '').trim();
        const details = [
          frequency ? `${label('Frequency', 'அட்டவணை')}: ${frequency}${frequencyMeaning(frequency) ? ` (${frequencyMeaning(frequency)})` : ''}` : '',
          item.foodTiming ? `${label('Food', 'உணவு')}: ${label(item.foodTiming, foodTimingTamil[item.foodTiming] || item.foodTiming)}` : '',
          item.route ? `${label('Route', 'வழி')}: ${item.route}` : '',
          item.durationDays ? `${label('Duration', 'காலம்')}: ${item.durationDays} ${label('days', 'நாட்கள்')}` : '',
          hasValue(item.quantity) ? `${label('Qty', 'அளவு')}: ${item.quantity}` : '',
          item.startFrom ? `${label('Start', 'தொடக்கம்')}: ${item.startFrom}` : '',
        ].filter(Boolean).join(' · ');
        const instructions = item.instructions ? `${label('Instructions', 'வழிமுறைகள்')}: ${item.instructions}` : '';
        const escapeText = (text) => escapeHtml(text);
        const html = `<article class="rx-entry"><b>${escapeText(main)}</b>${details ? `<div>${escapeText(details)}</div>` : ''}${instructions ? `<div>${escapeText(instructions)}</div>` : ''}</article>`;
        const lineCount = (text) => Math.max(1, Math.ceil(text.length / 68));
        blocks.push({ html, lines: lineCount(main) + (details ? lineCount(details) : 0) + (instructions ? lineCount(instructions) : 0) + 1 });
      });
    };
    addMedicationSection('TABLET');
    addMedicationSection('INJECTION');
    addMedicationSection('NEBULIZATION');
    const ivFluids = Array.isArray(version.ivFluids) ? version.ivFluids : [];
    if (ivFluids.length) {
      blocks.push({ html: `<div class="rx-section-title">${label('IV Fluids', 'நரம்புவழி திரவங்கள்')}</div>`, lines: 1 });
      ivFluids.forEach((fluid) => {
        const text = [
          fluid.type,
          hasValue(fluid.quantityMl) ? `${fluid.quantityMl} ml` : '',
          fluid.flowRate,
          fluid.duration,
          fluid.instructions,
        ].filter(Boolean).join(' · ');
        blocks.push({ html: `<article class="rx-entry">${escapeHtml(text)}</article>`, lines: Math.max(2, Math.ceil(text.length / 68) + 1) });
      });
    }
    const pages = [{ blocks: [], instructionLines: [], continuedInstructions: false }];
    let pageLines = 0;
    const maxFlowLines = 27;
    blocks.forEach((block) => {
      if (pageLines && pageLines + block.lines > maxFlowLines) {
        pages.push({ blocks: [], instructionLines: [], continuedInstructions: false });
        pageLines = 0;
      }
      pages[pages.length - 1].blocks.push(block.html);
      pageLines += block.lines;
    });
    const investigationText = (Array.isArray(version.investigations) ? version.investigations : []).map((item) =>
      [item.name || '', item.instructions || ''].filter(Boolean).join(' · ')
    ).filter(Boolean).join('\n');
    const referral = version.referral && typeof version.referral === 'object'
      ? [version.referral.hospitalName, version.referral.doctorName, version.referral.reason, version.referral.notes].filter(Boolean).join(' · ')
      : '';
    const referralDetails = referral || record.referralDetails || '';
    const instructionNotes = String(version.doctorNotes || '')
      .split(/\r?\n/)
      .filter((line) => !/^(Past illness|Habits|Family history|Surgical\/obstetric|Current medication|Diagnosis status):\s*/i.test(line))
      .map((line) => line.trim())
      .filter(Boolean);
    const additionalInstructions = [...instructionNotes, version.followUpInstructions || record.followUpInstructions || ''].filter(Boolean).join('\n');
    const wrapText = (text, maxCharacters) => {
      const lines = [];
      String(text).split(/\r?\n/).forEach((paragraph) => {
        const words = paragraph.split(/\s+/).filter(Boolean);
        let line = '';
        words.forEach((word) => {
          if (line && `${line} ${word}`.length > maxCharacters) {
            lines.push(line);
            line = word;
          } else {
            line = line ? `${line} ${word}` : word;
          }
        });
        if (line) lines.push(line);
      });
      return lines;
    };
    const noteLines = wrapText(additionalInstructions, 78);
    const noteChunks = [];
    for (let index = 0; index < noteLines.length; index += 6) noteChunks.push(noteLines.slice(index, index + 6));
    if (noteChunks.length) {
      pages[pages.length - 1].instructionLines = noteChunks[0];
      noteChunks.slice(1).forEach((lines) => pages.push({ blocks: [], instructionLines: lines, continuedInstructions: true }));
    }
    const templateUrl = new URL('assets/csk-prescription-template.png', window.location.href).href;
    const textOverlay = (className, value) => hasValue(value)
      ? `<span class="data-field ${className}">${escapeHtml(value)}</span>`
      : '';
    const pageMarkup = pages.map((page, index) => {
      const instructions = page.instructionLines.length
        ? `<div class="rx-instructions"><b>${label(page.continuedInstructions ? 'Additional instructions (continued)' : 'Additional instructions', page.continuedInstructions ? 'கூடுதல் வழிமுறைகள் (தொடர்ச்சி)' : 'கூடுதல் வழிமுறைகள்')}</b><div>${page.instructionLines.map(escapeHtml).join('<br>')}</div></div>`
        : '';
      return `<article class="prescription-page" aria-label="Prescription page ${index + 1}">
        <img class="template-image" src="${escapeHtml(templateUrl)}" alt="CSK Clinic original prescription sheet" loading="eager" decoding="sync" fetchpriority="high" />
        ${textOverlay('visit-date', prescriptionDate(version.visitDate || record.visitDate))}
        ${textOverlay('follow-up-date', prescriptionDate(followUpDate))}
        ${textOverlay('patient-name', patient.name)}
        ${textOverlay('patient-age', age)}
        ${textOverlay('patient-gender', gender)}
        ${textOverlay('vital-bp', bloodPressure)}
        ${textOverlay('vital-pr', displayNumber(readVital('pulseBpm')))}
        ${textOverlay('vital-temperature', temperature)}
        ${textOverlay('vital-spo2', displayNumber(readVital('spo2Percent')))}
        ${textOverlay('vital-cbg', displayNumber(readVital('cbgMgDl')))}
        ${textOverlay('vital-height', displayNumber(heightCm))}
        ${textOverlay('vital-weight', displayNumber(weightKg))}
        ${textOverlay('vital-bmi', bmi)}
        ${textOverlay('known-case', knownCase)}
        ${textOverlay('investigations', investigationText)}
        ${textOverlay('referral-details', referralDetails)}
        <div class="rx-flow">${page.blocks.join('')}</div>
        ${instructions}
      </article>`;
    }).join('');
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      showToast('Allow pop-ups to print the prescription.');
      return;
    }
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="${language === 'tamil' ? 'ta' : 'en'}"><head><meta charset="utf-8"><link rel="preload" as="image" href="${escapeHtml(templateUrl)}"><title>${escapeHtml(patient.name)} - Prescription</title><style>
      *{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#10254a;font:2.2mm Arial,"Noto Sans Tamil","Nirmala UI",sans-serif}.prescription-page{position:relative;width:210mm;height:297mm;margin:10px auto;overflow:hidden;background:#fff;page-break-after:always;break-after:page}.prescription-page:last-of-type{page-break-after:auto;break-after:auto}.template-image{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.data-field{position:absolute;display:block;overflow-wrap:anywhere;line-height:1.15;font-size:2.3mm;color:#10254a}.visit-date{left:11%;top:26.3%;width:19%;height:2.3%}.follow-up-date{left:73%;top:26.3%;width:22%;height:2.3%}.patient-name{left:11.5%;top:31.5%;width:22%;height:2.2%}.patient-age{left:13%;top:36.4%;width:10%;height:2.2%}.patient-gender{left:25.5%;top:36.4%;width:9%;height:2.2%}
      .vital-bp{left:16.5%;top:42.2%;width:14%;height:2.2%}.vital-pr{left:16.5%;top:45.4%;width:14%;height:2.2%}.vital-temperature{left:16.5%;top:48.6%;width:14%;height:2.2%}.vital-spo2{left:16.5%;top:51.9%;width:14%;height:2.2%}.vital-cbg{left:16.5%;top:55.1%;width:14%;height:2.2%}.vital-height{left:16.5%;top:58.3%;width:14%;height:2.2%}.vital-weight{left:16.5%;top:61.5%;width:14%;height:2.2%}.vital-bmi{left:16.5%;top:64.8%;width:14%;height:2.2%}
      .known-case{left:4.2%;top:71.1%;width:29%;height:8.1%;font-size:2mm;line-height:1.2}.investigations{left:4.2%;top:80.2%;width:29%;height:4.3%;font-size:1.9mm;line-height:1.2;white-space:pre-wrap}.referral-details{left:4.6%;top:89.5%;width:22%;height:2.2%;font-size:1.8mm;line-height:1.1}.rx-flow{position:absolute;left:39%;right:5.7%;top:40.3%;height:32.2%;overflow:hidden;font-size:2mm;line-height:1.2;overflow-wrap:anywhere}.rx-section-title{font-size:2.35mm;font-weight:700;margin:0 0 1mm}.rx-entry{margin:0 0 1.3mm;line-height:1.2}.rx-entry b{font-weight:700}.rx-instructions{position:absolute;left:39%;right:5.7%;top:73.4%;height:8.4%;overflow:hidden;font-size:1.9mm;line-height:1.2;overflow-wrap:anywhere}.rx-instructions b{display:block;font-size:2.1mm;margin-bottom:.6mm}
      .print-controls{display:flex;justify-content:center;gap:8px;margin:14px}.print-controls button{padding:9px 16px;border:0;border-radius:6px;background:#10254a;color:#fff;cursor:pointer}
      @page{size:A4;margin:0}@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.prescription-page{width:210mm;height:297mm;margin:0}.print-controls{display:none}}@media screen and (max-width:760px){.prescription-page{width:min(100vw,210mm);height:auto;aspect-ratio:210/297;margin:8px auto}.data-field,.rx-flow,.rx-instructions{font-size:1.7vw}.rx-section-title,.rx-instructions b{font-size:1.9vw}}
    </style></head><body>${pageMarkup}<div class="print-controls"><button onclick="window.print()">Print</button><button onclick="window.print()">Save as PDF</button></div>${autoPrint ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script>' : ''}</body></html>`);
    popup.document.close();
  }

  function openPrescriptionPrint(patientId, consultationId, versionId, autoPrint = false) {
    const found = findPrescriptionVersion(patientId, consultationId, versionId);
    const patient = patientById(patientId);
    if (!found || !patient) {
      showToast('Prescription history could not be found. Refresh and retry.');
      return;
    }
    openPrescriptionDocument(patient, found.record, found.version, autoPrint);
  }

  function downloadPrescriptionPdf(patientId, consultationId, versionId) {
    const found = findPrescriptionVersion(patientId, consultationId, versionId);
    const patient = patientById(patientId);
    if (!found || !patient) {
      showToast('Prescription history could not be found. Refresh and retry.');
      return;
    }
    openPrescriptionDocument(patient, found.record, found.version, true);
  }

  function normalizeApiExternalMedicalRecord(item) {
    return {
      ...item,
      recordDate: item.recordDate ? String(item.recordDate).slice(0, 10) : '',
    };
  }

  function recordText(value) {
    return escapeHtml(value || '—').replace(/\n/g, '<br>');
  }

  function printPatientClinicalSheet(patientId, recordId) {
    const patient = patientById(patientId);
    const record = (data.patientRecords || []).find((item) => item.id === recordId);
    if (!patient || !record) {
      showToast('The patient clinical record could not be found.');
      return;
    }
    const version = record.prescriptionVersions?.[0] || {
      doctorName: record.doctorName,
      diagnosisName: record.diagnosis,
      medications: (record.prescriptionItems || []).map((item) => ({
        section: 'TABLET',
        name: item.medicineName || item.medicine?.name || 'Medicine',
        dosage: item.dosage || '',
        frequency: item.frequency || '',
        durationDays: item.durationDays || '',
        quantity: item.quantity || '',
        instructions: item.instructions || '',
      })),
      ivFluids: [],
      investigations: record.investigationAdvice || record.tests
        ? [{ category: '', name: record.investigationAdvice || record.tests }]
        : [],
      nextVisitDate: record.followUpDate || '',
      followUpInstructions: record.followUpInstructions || '',
      referral: record.referralDetails ? { notes: record.referralDetails } : null,
    };
    openPrescriptionDocument(patient, record, version, true);
  }

  function getPatientRecords(patientId) {
    return (data.patientRecords || [])
      .filter((record) => record.patientId === patientId)
      .sort((a, b) => `${b.visitDate || ''} ${b.createdAt || ''}`.localeCompare(`${a.visitDate || ''} ${a.createdAt || ''}`));
  }

  function getPatientType(patientId) {
    const records = getPatientRecords(patientId);
    if (isApiConnected() && !patientVisitHistoryLoaded.has(patientId) && records.length === 0) {
      return 'unverified';
    }
    return records.length > 0 ? 'returning' : 'new';
  }

  function patientTypeLabel(type) {
    if (type === 'returning') return 'Returning patient';
    if (type === 'new') return 'New patient';
    return 'Visit history not checked';
  }

  function getExternalMedicalRecords(patientId) {
    return (data.externalMedicalRecords || [])
      .filter((record) => record.patientId === patientId)
      .sort((a, b) => `${b.recordDate || ''} ${b.createdAt || ''}`.localeCompare(`${a.recordDate || ''} ${a.createdAt || ''}`));
  }

  function getFilteredPatientRecords(patientId) {
    const search = document.getElementById('patientHistorySearch').value.trim().toLowerCase();
    const from = document.getElementById('patientHistoryFrom').value;
    const to = document.getElementById('patientHistoryTo').value;
    const doctor = document.getElementById('patientHistoryDoctor').value;
    const encounterType = document.getElementById('patientHistoryType').value;
    const status = document.getElementById('patientHistoryStatus').value;
    const content = document.getElementById('patientHistoryContent').value;
    const allRecords = getPatientRecords(patientId);
    if (from && to && from > to) return { allRecords, records: [], invalidRange: true };

    const records = allRecords.filter((record) => {
      const reports = Array.isArray(record.reports) ? record.reports : [];
      const medicines = Array.isArray(record.prescriptionItems) ? record.prescriptionItems : [];
      const searchable = [
        record.doctorName,
        record.encounterType,
        record.status,
        record.symptoms,
        record.diagnosis,
        record.consultationNotes,
        record.knownCase,
        record.bloodPressure,
        record.temperatureC,
        record.pulseBpm,
        record.spo2Percent,
        record.cbgMgDl,
        record.tests,
        record.investigationAdvice,
        record.referralDetails,
        record.followUpInstructions,
        record.ward,
        record.bed,
        ...reports.flatMap((report) => [report.name, report.notes, report.fileName]),
        ...medicines.flatMap((item) => [item.medicineName, item.medicine?.name, item.dosage, item.frequency]),
        record.prescriptions,
      ].join(' ').toLowerCase();
      return (!search || searchable.includes(search))
        && (!from || (record.visitDate || '') >= from)
        && (!to || (record.visitDate || '') <= to)
        && (!doctor || (record.doctorName || '') === doctor)
        && (!encounterType || record.encounterType === encounterType)
        && (!status || (status === 'CLOSED' ? record.status === 'CLOSED' : record.status !== 'CLOSED'))
        && (!content
          || (content === 'medicines' && (medicines.length > 0 || Boolean(record.prescriptions)))
          || (content === 'tests' && Boolean(record.tests || record.investigationAdvice))
          || (content === 'reports' && reports.length > 0));
    });
    return { allRecords, records, invalidRange: false };
  }

  function syncPatientHistoryDoctorFilter(patientId) {
    const select = document.getElementById('patientHistoryDoctor');
    const selectedDoctor = select.value;
    const doctors = [...new Set(getPatientRecords(patientId)
      .map((record) => String(record.doctorName || '').trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All doctors</option>' + doctors
      .map((doctor) => `<option value="${escapeHtml(doctor)}">${escapeHtml(doctor)}</option>`)
      .join('');
    if (doctors.includes(selectedDoctor)) select.value = selectedDoctor;
  }

  function getPatientHistoryFilterSummary() {
    const filters = [];
    const search = document.getElementById('patientHistorySearch').value.trim();
    const from = document.getElementById('patientHistoryFrom').value;
    const to = document.getElementById('patientHistoryTo').value;
    const doctor = document.getElementById('patientHistoryDoctor');
    const type = document.getElementById('patientHistoryType');
    const status = document.getElementById('patientHistoryStatus');
    const content = document.getElementById('patientHistoryContent');
    if (search) filters.push(`Search: ${search}`);
    if (from || to) filters.push(`Date: ${from || 'Any'} to ${to || 'Any'}`);
    if (doctor.value) filters.push(`Doctor: ${doctor.value}`);
    if (type.value) filters.push(`Visit type: ${type.selectedOptions[0].textContent}`);
    if (status.value) filters.push(`Status: ${status.selectedOptions[0].textContent}`);
    if (content.value) filters.push(`Includes: ${content.selectedOptions[0].textContent}`);
    return filters;
  }

  function renderPatientRecords(patientId) {
    syncPatientHistoryDoctorFilter(patientId);
    const { allRecords, records, invalidRange } = getFilteredPatientRecords(patientId);
    const target = document.getElementById('patientRecordsHistory');
    const count = document.getElementById('patientHistoryResultCount');
    count.textContent = invalidRange
      ? 'Start date must be on or before end date.'
      : `Showing ${records.length} of ${allRecords.length} ${allRecords.length === 1 ? 'visit' : 'visits'}${getPatientHistoryFilterSummary().length ? ' with filters applied' : ''}.`;
    if (invalidRange) {
      target.innerHTML = '<div class="patient-record-empty">Update the date range to view visit records.</div>';
      return;
    }
    target.innerHTML = records.length ? records.map((record, recordIndex) => {
      const dateLabel = recordIndex === 0 || records[recordIndex - 1].visitDate !== record.visitDate
        ? `<div class="patient-timeline-date">${escapeHtml(formatDate(record.visitDate))}</div>`
        : '';
      const inpatient = record.encounterType === 'IPD';
      const closed = record.status === 'CLOSED';
      const vitals = [
        record.bloodPressure ? `BP ${record.bloodPressure}` : '',
        record.temperatureC !== null && record.temperatureC !== undefined ? `${record.temperatureC} °C` : '',
        record.spo2Percent !== null && record.spo2Percent !== undefined ? `SpO2 ${record.spo2Percent}%` : '',
        record.cbgMgDl !== null && record.cbgMgDl !== undefined ? `CBG ${record.cbgMgDl} mg/dL` : '',
        record.weightKg !== null && record.weightKg !== undefined ? `${record.weightKg} kg` : '',
        record.heightCm !== null && record.heightCm !== undefined ? `Height ${record.heightCm} cm` : '',
        record.bmi !== null && record.bmi !== undefined ? `BMI ${record.bmi}` : '',
        record.pulseBpm !== null && record.pulseBpm !== undefined ? `Pulse ${record.pulseBpm} bpm` : '',
      ].filter(Boolean);
      const followUpDetails = [
        record.followUpDate ? formatDate(record.followUpDate) : '',
        record.followUpInstructions || '',
      ].filter(Boolean).map(escapeHtml).join(' · ');
      const prescriptionItems = Array.isArray(record.prescriptionItems) ? record.prescriptionItems : [];
      const outstandingPrescriptions = prescriptionItems.filter((item) => Number(item.quantity) > Number(item.billedQuantity || 0));
      const prescriptionsMarkup = prescriptionItems.length
        ? `<div class="prescription-record-list"><b>Prescribed medicines</b>${prescriptionItems.map((item) => {
          const remaining = Math.max(0, Number(item.quantity) - Number(item.billedQuantity || 0));
          const medicineName = item.medicineName || item.medicine?.name || 'Medicine';
          return `<div class="prescription-record-item"><span><strong>${escapeHtml(medicineName)}</strong><small>${escapeHtml(item.dosage)} · ${escapeHtml(item.frequency)} · ${Number(item.durationDays)} days · prescribed ${Number(item.quantity)}${item.instructions ? ` · ${escapeHtml(item.instructions)}` : ''}</small></span><span class="prescription-remaining">${remaining ? `${remaining} to bill` : 'Complete'}</span></div>`;
        }).join('')}${record.prescriptions ? `<p>${recordText(record.prescriptions)}</p>` : ''}</div>`
        : record.prescriptions ? `<div><b>Prescription notes</b><p>${recordText(record.prescriptions)}</p></div>` : '';
      const invoiceAction = outstandingPrescriptions.length && canCreateInvoices()
        ? `<button type="button" class="action-button" data-invoice-prescriptions="${escapeHtml(record.id)}" data-patient-id="${escapeHtml(patientId)}">Invoice remaining</button>`
        : '';
      const consultationPrescriptions = prescriptionVersionMarkup(record, patientId);
      const reportLinks = (Array.isArray(record.reports) ? record.reports : []).map((report) => {
        const downloadUrl = safeReportDataUrl(report.fileDataUrl);
        return `<div><b>${escapeHtml(report.name || 'Report')}</b>${report.reportDate ? `<p>Report date: ${escapeHtml(formatDate(String(report.reportDate).slice(0, 10)))}</p>` : ''}${report.notes ? `<p>${recordText(report.notes)}</p>` : ''}${downloadUrl ? `<a class="patient-report-link" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(sanitizeReportFileName(report.fileName || 'attached-report'))}">Download ${escapeHtml(report.fileName || 'attached report')}</a>` : report.fileName ? `<p>Attached file: ${escapeHtml(report.fileName)}</p>` : ''}</div>`;
      }
      ).join('');
      return `${dateLabel}<article class="patient-record-card">
        <div class="patient-record-top"><div><span class="record-type ${inpatient ? 'ipd' : ''}">${inpatient ? 'IPD · Inpatient' : 'OPD · Outpatient'}</span><h4>${escapeHtml(record.diagnosis || 'Visit record')}</h4><p>${escapeHtml(formatDate(record.visitDate))} · ${escapeHtml(record.doctorName || 'Doctor not recorded')}</p></div><div class="record-status"><span class="status-pill ${closed ? '' : inpatient ? 'pending' : ''}">${inpatient && !closed ? 'Admitted' : closed ? 'Closed' : 'Open'}</span>${canManageClinicalEncounters() && record.status !== 'CLOSED' ? `<button type="button" class="action-button" data-edit-patient-encounter="${escapeHtml(record.id)}">Edit</button>` : ''}${inpatient && !closed && canManageClinicalEncounters() ? `<button type="button" class="action-button danger" data-discharge-record="${escapeHtml(record.id)}" data-patient-id="${escapeHtml(patientId)}">Discharge</button>` : ''}<button type="button" class="action-button" data-print-patient-sheet="${escapeHtml(record.id)}" data-patient-id="${escapeHtml(patientId)}">Print sheet</button>${invoiceAction}</div></div>
        <div class="patient-record-grid">
          ${record.symptoms ? `<div><b>Symptoms</b><p>${recordText(record.symptoms)}</p></div>` : ''}
          ${record.consultationNotes ? `<div><b>Consultation notes</b><p>${recordText(record.consultationNotes)}</p></div>` : ''}
          ${record.knownCase ? `<div><b>Known case of</b><p>${recordText(record.knownCase)}</p></div>` : ''}
          ${vitals.length ? `<div><b>Vitals</b><p>${escapeHtml(vitals.join(' · '))}</p></div>` : ''}
          ${prescriptionsMarkup}
          ${consultationPrescriptions}
          ${record.tests ? `<div><b>Tests / lab orders</b><p>${recordText(record.tests)}</p></div>` : ''}
          ${reportLinks ? `<div><b>Reports / uploaded documents</b>${reportLinks}</div>` : ''}
          ${record.investigationAdvice ? `<div><b>Investigation advised</b><p>${recordText(record.investigationAdvice)}</p></div>` : ''}
          ${record.referralDetails ? `<div><b>Referral details</b><p>${recordText(record.referralDetails)}</p></div>` : ''}
          ${followUpDetails ? `<div><b>Follow-up</b><p>${followUpDetails}</p></div>` : ''}
          ${inpatient ? `<div><b>Admission</b><p>${record.admittedAt ? escapeHtml(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.admittedAt))) : '—'}${record.ward ? ` · Ward ${escapeHtml(record.ward)}` : ''}${record.bed ? ` · Bed ${escapeHtml(record.bed)}` : ''}${record.dischargedAt ? `<br>Discharged ${escapeHtml(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.dischargedAt)))}` : ''}</p></div>` : ''}
        </div>
      </article>`;
    }).join('') : allRecords.length
      ? '<div class="patient-record-empty">No visits match these filters. Clear a filter or widen the date range.</div>'
      : '<div class="patient-record-empty">No visit records have been saved.</div>';
  }

  function sanitizeReportFileName(fileName) {
    return String(fileName || 'report')
      .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120) || 'report';
  }

  function safeReportDataUrl(value) {
    const dataUrl = String(value || '');
    return /^data:(?:application\/pdf|image\/(?:png|jpeg|webp|gif)|text\/plain);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)
      ? dataUrl
      : '';
  }

  function csvCell(value) {
    const text = String(value ?? '');
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  function patientRecordExportRow(patient, record) {
    const reports = (Array.isArray(record.reports) ? record.reports : []).map((report) =>
      [report.name, report.reportDate ? String(report.reportDate).slice(0, 10) : '', report.notes, report.fileName].filter(Boolean).join(' — ')
    ).join(' | ');
    const medicines = (Array.isArray(record.prescriptionItems) ? record.prescriptionItems : []).map((item) =>
      [item.medicineName || item.medicine?.name, item.dosage, item.frequency, item.durationDays ? `${item.durationDays} days` : '', item.instructions].filter(Boolean).join(' / ')
    ).join(' | ');
    return [
      patient.name,
      patient.code,
      record.visitDate,
      record.encounterType,
      record.doctorName,
      record.symptoms,
      record.diagnosis,
      record.consultationNotes,
      record.bloodPressure,
      record.temperatureC,
      record.pulseBpm,
      record.spo2Percent,
      record.cbgMgDl,
      record.weightKg,
      record.heightCm,
      record.bmi,
      record.knownCase,
      medicines || record.prescriptions,
      record.tests,
      reports,
      record.investigationAdvice,
      record.referralDetails,
      record.followUpDate,
      record.followUpInstructions,
      record.admittedAt,
      record.dischargedAt,
      record.ward,
      record.bed,
    ];
  }

  function exportPatientHistory(patientId) {
    const patient = patientById(patientId);
    const { records, invalidRange } = getFilteredPatientRecords(patientId);
    if (!patient || invalidRange || !records.length) {
      showToast(invalidRange ? 'Correct the history date range before downloading.' : 'There are no visits to download.');
      return;
    }
    const headers = [
      'Patient name', 'Patient ID', 'Visit date', 'Visit type', 'Doctor', 'Symptoms', 'Diagnosis', 'Consultation notes',
      'Blood pressure', 'Temperature °C', 'Pulse bpm', 'SpO2 %', 'CBG mg/dL', 'Weight kg', 'Height cm', 'BMI',
      'Known case', 'Prescriptions', 'Tests / lab orders', 'Reports', 'Investigation advice', 'Referral details',
      'Follow-up date', 'Follow-up instructions', 'Admitted at', 'Discharged at', 'Ward', 'Bed',
    ];
    const rows = [headers, ...records.map((record) => patientRecordExportRow(patient, record))];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient-history-${sanitizeReportFileName(patient.code)}-${dateKey(today)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPatientDirectory() {
    const query = (document.getElementById('patientSearch')?.value || '').trim().toLowerCase();
    const phoneQuery = patientPhoneKey(query);
    const gender = document.getElementById('patientGenderFilter')?.value || '';
    const bloodGroup = document.getElementById('patientBloodFilter')?.value || '';
    const patientType = document.getElementById('patientTypeFilter')?.value || '';
    const sort = document.getElementById('patientSort')?.value || 'recent';
    const rows = data.patients.filter((patient) => {
      const records = getPatientRecords(patient.id);
      const appointments = data.appointments.filter((item) => item.patientId === patient.id);
      const textMatch = [patient.name, patient.code, patient.phone, patient.email]
        .some((value) => String(value || '').toLowerCase().includes(query));
      const phoneMatch = phoneQuery.length >= 3 && patientPhoneKey(patient.phone).includes(phoneQuery);
      if (query && !textMatch && !phoneMatch) return false;
      if (gender && String(patient.gender || 'Unspecified') !== gender) return false;
      if (bloodGroup && patient.bloodGroup !== bloodGroup) return false;
      if (patientType === 'new' && getPatientType(patient.id) !== 'new') return false;
      if (patientType === 'returning' && getPatientType(patient.id) !== 'returning') return false;
      if (patientType === 'followup' && !records.some((record) => record.followUpDate && record.followUpDate >= dateKey(today))) return false;
      if (patientType === 'appointment' && !appointments.some((item) => item.status !== 'Cancelled')) return false;
      return true;
    }).sort((left, right) => {
      if (sort === 'name') return String(left.name).localeCompare(String(right.name));
      if (sort === 'code') return String(left.code).localeCompare(String(right.code), undefined, { numeric: true });
      if (sort === 'lastVisit') {
        const leftVisit = getPatientRecords(left.id)[0]?.visitDate || '';
        const rightVisit = getPatientRecords(right.id)[0]?.visitDate || '';
        return rightVisit.localeCompare(leftVisit);
      }
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    });

    if (!rows.length) {
      showToast('There are no matching patients to export.');
      return;
    }

    const headers = [
      'Patient name', 'Patient ID', 'Mobile', 'Email', 'Date of birth', 'Age', 'Gender', 'Blood group',
      'Address', 'Emergency contact', 'Occupation', 'Preferred language', 'Marital status',
      'Insurance provider', 'Insurance number', 'Allergies / reactions', 'Existing conditions',
      'Surgical history', 'Family history', 'Current medications', 'Latest visit', 'Registration date',
    ];
    const exportRows = [headers, ...rows.map((patient) => {
      const latestVisit = getPatientRecords(patient.id)[0]?.visitDate;
      return [
        patient.name, patient.code, patient.phone, patient.email, patient.dob,
        patientAge(patient), patient.gender, patient.bloodGroup, patient.address,
        patient.emergencyContact, patient.occupation, patient.preferredLanguage, patient.maritalStatus,
        patient.insuranceProvider, patient.insuranceNumber, patient.allergies || patient.notes,
        patient.medicalHistory, patient.surgicalHistory, patient.familyHistory, patient.currentMedications,
        latestVisit ? formatDate(latestVisit) : '', String(patient.createdAt || '').slice(0, 10),
      ];
    })];
    const csv = `\uFEFF${exportRows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `csk-patient-directory-${dateKey(today)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${rows.length} patient record${rows.length === 1 ? '' : 's'} exported.`);
  }

  function printPatientHistory(patientId) {
    const patient = patientById(patientId);
    const { records, invalidRange } = getFilteredPatientRecords(patientId);
    if (!patient || invalidRange || !records.length) {
      showToast(invalidRange ? 'Correct the history date range before printing.' : 'There are no visits to print.');
      return;
    }
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      showToast('Allow pop-ups to print patient history.');
      return;
    }
    const visitMarkup = records.map((record) => {
      const fields = [
        ['Symptoms', record.symptoms],
        ['Diagnosis', record.diagnosis],
        ['Consultation notes', record.consultationNotes],
        ['Known case', record.knownCase],
        ['Vitals', [
          record.bloodPressure ? `BP ${record.bloodPressure}` : '',
          record.temperatureC != null ? `${record.temperatureC} °C` : '',
          record.pulseBpm != null ? `Pulse ${record.pulseBpm} bpm` : '',
          record.spo2Percent != null ? `SpO2 ${record.spo2Percent}%` : '',
          record.cbgMgDl != null ? `CBG ${record.cbgMgDl} mg/dL` : '',
          record.weightKg != null ? `${record.weightKg} kg` : '',
          record.heightCm != null ? `Height ${record.heightCm} cm` : '',
          record.bmi != null ? `BMI ${record.bmi}` : '',
        ].filter(Boolean).join(' · ')],
        ['Prescriptions', (record.prescriptionItems || []).map((item) =>
          [item.medicineName || item.medicine?.name, item.dosage, item.frequency, item.durationDays ? `${item.durationDays} days` : '', item.instructions].filter(Boolean).join(' / ')
        ).join(' · ') || record.prescriptions],
        ['Tests / lab orders', record.tests],
        ['Reports', (record.reports || []).map((report) =>
          [report.name, report.reportDate ? formatDate(String(report.reportDate).slice(0, 10)) : '', report.notes, report.fileName].filter(Boolean).join(' · ')
        ).join(' | ')],
        ['Investigation advice', record.investigationAdvice],
        ['Referral details', record.referralDetails],
        ['Follow-up', [record.followUpDate ? formatDate(record.followUpDate) : '', record.followUpInstructions].filter(Boolean).join(' · ')],
      ].filter(([, value]) => value);
      return `<article class="visit"><header><span>${escapeHtml(record.encounterType === 'IPD' ? 'IPD · Inpatient' : 'OPD · Outpatient')}</span><h2>${escapeHtml(record.diagnosis || 'Visit record')}</h2><p>${escapeHtml(formatDate(record.visitDate))} · ${escapeHtml(record.doctorName || 'Doctor not recorded')}</p></header><dl>${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${recordText(value)}</dd></div>`).join('')}</dl></article>`;
    }).join('');
    const filterSummary = getPatientHistoryFilterSummary();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(patient.name)} - Patient history</title><style>
      body{margin:0;padding:24px;color:#203750;font:14px Arial,sans-serif}.page{max-width:850px;margin:0 auto}h1{margin:0 0 6px}.patient{margin:0 0 8px;color:#52677d}.filters{margin:0 0 20px;color:#52677d;font-size:12px}.visit{margin:0 0 18px;padding:14px;border:1px solid #d9e2e8;border-radius:8px;break-inside:avoid}.visit header{padding-bottom:10px;border-bottom:1px solid #e4e9ee}.visit header span{color:#168f83;font-size:11px;font-weight:bold}.visit h2{margin:7px 0;font-size:17px}.visit p{margin:4px 0;color:#6b7b8b}.visit dl{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}.visit dl div{min-width:0}.visit dt{font-weight:bold;font-size:11px}.visit dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}@media print{body{padding:0}.visit{border-radius:0}}
      </style></head><body><main class="page"><h1>${escapeHtml(data.settings.clinicName || 'CSK Clinic')} · Patient history</h1><p class="patient">${escapeHtml(patient.name)} · ${escapeHtml(patient.code)} · ${escapeHtml(patient.phone)} · ${records.length} ${records.length === 1 ? 'visit' : 'visits'}</p>${filterSummary.length ? `<p class="filters">Filters: ${filterSummary.map(escapeHtml).join(' · ')}</p>` : ''}${visitMarkup}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function canCreateInvoices() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'PHARMACIST'].includes(getStoredApiUser()?.role);
  }

  async function openPatientRecords(patientId) {
    const patient = patientById(patientId);
    if (!patient) return;
    if (!canViewClinicalRecords()) {
      showToast('Your account does not have permission to view clinical records.');
      return;
    }

    activePatientRecordsId = patientId;
    document.getElementById('patientHistorySearch').value = '';
    document.getElementById('patientHistoryFrom').value = '';
    document.getElementById('patientHistoryTo').value = '';
    document.getElementById('patientHistoryDoctor').value = '';
    document.getElementById('patientHistoryType').value = '';
    document.getElementById('patientHistoryStatus').value = '';
    document.getElementById('patientHistoryContent').value = '';
    document.getElementById('patientRecordsTitle').textContent = 'Patient visit history';
    document.getElementById('patientRecordsSubtitle').textContent = `${patient.name} · ${patient.code} · ${patient.phone}`;
    document.getElementById('newPatientEncounter').classList.toggle('hidden', !canManageClinicalEncounters());
    document.getElementById('patientClinicalIdentity').innerHTML = `
      <span class="patient-clinical-avatar">${escapeHtml(initials(patient.name))}</span>
      <div class="patient-clinical-person">
        <div class="patient-clinical-name">${escapeHtml(patient.name)} <span>${escapeHtml(patient.code)}</span></div>
        <div class="patient-clinical-demographics">
          <span>${escapeHtml(patientAge(patient))}</span>
          <span>${escapeHtml(patient.gender || 'Gender not recorded')}</span>
          <span>${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</span>
          <span>${escapeHtml(patient.phone || 'Phone not recorded')}</span>
        </div>
      </div>
      <div class="patient-clinical-visit"><span class="status-pill">Clinical history</span><small>Past clinic records and archived intake</small>${canWriteConsultationPrescriptions() ? '<button type="button" class="button button-primary button-small" id="newConsultationPrescription">＋ New consultation</button>' : ''}</div>
    `;
    if (isApiConnected()) {
      try {
        const [records, intakes] = await Promise.all([
          apiRequest(`/patients/${encodeURIComponent(patientId)}/records`),
          apiRequest(`/patients/${encodeURIComponent(patientId)}/intakes`),
        ]);
        if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid patient record list.');
        if (!Array.isArray(intakes)) throw new Error('The clinic API returned an invalid archived intake list.');
        data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patientId)
          .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId })));
        patientVisitHistoryLoaded.add(patientId);
        data.patientIntakes = data.patientIntakes.filter((record) => record.patientId !== patientId)
          .concat(intakes.map((record) => ({ ...record, patientId })));
      } catch (error) {
        console.error('Unable to load patient clinical history.', error);
        showToast(error.message || 'Unable to load patient clinical history.');
        return;
      }
    }
    renderPatientRecords(patientId);
    renderPatientHistorySummary(patientId);
    renderPatientIntakeHistory(patientId);
    renderPatients();
    openModal('patientRecordsModal');
  }

  function canManageClinicalEncounters() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'DOCTOR'].includes(getStoredApiUser()?.role);
  }

  function openPatientEncounterEditor(patientId, encounterId = '') {
    if (!canManageClinicalEncounters()) {
      showToast('Only a doctor or clinic administrator can add or update clinical visits.');
      return;
    }
    const patient = patientById(patientId);
    if (!patient) {
      showToast('Patient not found. Refresh and retry.');
      return;
    }
    const encounter = encounterId ? getPatientRecords(patientId).find((record) => record.id === encounterId) : null;
    if (encounterId && !encounter) {
      showToast('Visit not found. Refresh and retry.');
      return;
    }
    const form = document.getElementById('patientEncounterForm');
    form.reset();
    form.elements.namedItem('patientId').value = patientId;
    form.elements.namedItem('encounterId').value = encounter?.id || '';
    form.elements.namedItem('queueTokenId').value = encounter?.queueTokenId || '';
    form.elements.namedItem('encounterType').value = encounter?.encounterType || 'OPD';
    form.elements.namedItem('encounterType').disabled = Boolean(encounter);
    form.elements.namedItem('visitDate').value = encounter?.visitDate || dateKey(today);
    form.elements.namedItem('doctorName').value = encounter?.doctorName || getStoredApiUser()?.email || '';
    [
      'symptoms', 'consultationNotes', 'diagnosis', 'bloodPressure', 'temperatureC', 'pulseBpm',
      'spo2Percent', 'cbgMgDl', 'weightKg', 'heightCm', 'knownCase', 'prescriptions', 'tests',
      'investigationAdvice', 'referralDetails', 'followUpDate', 'followUpInstructions', 'ward', 'bed',
    ].forEach((name) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = encounter?.[name] ?? '';
    });
    const admittedAt = form.elements.namedItem('admittedAt');
    admittedAt.value = encounter?.admittedAt ? (() => {
      const date = new Date(encounter.admittedAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    })() : '';
    document.getElementById('patientEncounterTitle').textContent = encounter ? 'Update patient visit' : 'Add patient visit';
    document.getElementById('patientEncounterContext').textContent = `${patient.name} · ${patient.code}`;
    document.getElementById('patientEncounterAdmissionFields').classList.toggle('hidden', form.elements.namedItem('encounterType').value !== 'IPD');
    openModal('patientEncounterModal');
  }

  async function openNurseIntake(queueTokenId) {
    if (!canRecordNurseIntake()) {
      showToast('Your account does not have permission to record nursing intake.');
      return;
    }
    const queue = (data.queueTokens || []).find((item) => item.id === queueTokenId);
    if (!queue) {
      showToast('Queue entry not found. Refresh and retry.');
      return;
    }
    let intake = (data.patientIntakes || []).find((item) => item.queueTokenId === queueTokenId) || null;
    if (isApiConnected()) {
      try {
        intake = await apiRequest(`/nursing/queue/${encodeURIComponent(queueTokenId)}/intake`);
        data.patientIntakes = data.patientIntakes.filter((item) => item.queueTokenId !== queueTokenId);
        if (intake) data.patientIntakes.push({ ...intake, patientId: queue.patientId, queueTokenId });
      } catch (error) {
        console.error('Unable to load nurse intake.', error);
        showToast(error.message || 'Unable to load nurse intake.');
        return;
      }
    }
    const patient = patientById(queue.patientId);
    const form = document.getElementById('nurseIntakeForm');
    form.reset();
    form.elements.namedItem('queueTokenId').value = queueTokenId;
    document.getElementById('nurseIntakePatientContext').textContent = `${patient?.name || 'Patient'} · ${patient?.code || ''} · ${queue.doctor || 'Assigned doctor'} · Token ${queue.tokenNumber}`;
    [
      'chiefComplaint', 'onset', 'symptoms', 'allergyStatus', 'allergyDetails', 'medicationsReviewed',
      'medicationNotes', 'painScore', 'bloodPressure', 'temperatureC', 'pulseBpm', 'spo2Percent',
      'cbgMgDl', 'weightKg', 'heightCm', 'nurseNotes',
    ].forEach((name) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = intake?.[name] ?? (name === 'allergyStatus' ? 'NOT_CONFIRMED' : name === 'medicationsReviewed' ? 'false' : '');
    });
    updateNurseIntakeBmi();
    const isAcknowledged = intake?.status === 'ACKNOWLEDGED';
    form.querySelectorAll('input:not([type="hidden"]),select,textarea,button[type="submit"]').forEach((field) => {
      field.disabled = isAcknowledged;
    });
    openModal('nurseIntakeModal');
  }

  function canRecordNurseIntake() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'NURSE'].includes(getStoredApiUser()?.role);
  }

  function updateNurseIntakeBmi() {
    const form = document.getElementById('nurseIntakeForm');
    const weight = Number(form.elements.namedItem('weightKg').value);
    const height = Number(form.elements.namedItem('heightCm').value);
    form.elements.namedItem('bmi').value = weight > 0 && height > 0
      ? (weight / ((height / 100) ** 2)).toFixed(2)
      : '';
  }

  function optionalFormNumber(fields, name) {
    const raw = String(fields.get(name) || '').trim();
    return raw === '' ? undefined : Number(raw);
  }

  function optionalFormText(fields, name) {
    return formString(fields, name) || undefined;
  }

  async function submitNurseIntake(form, intent) {
    const fields = new FormData(form);
    const queueTokenId = formString(fields, 'queueTokenId');
    const payload = {
      status: intent === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      chiefComplaint: formString(fields, 'chiefComplaint'),
      onset: optionalFormText(fields, 'onset'),
      symptoms: optionalFormText(fields, 'symptoms'),
      allergyStatus: formString(fields, 'allergyStatus') || 'NOT_CONFIRMED',
      allergyDetails: optionalFormText(fields, 'allergyDetails'),
      medicationsReviewed: formString(fields, 'medicationsReviewed') === 'true',
      medicationNotes: optionalFormText(fields, 'medicationNotes'),
      painScore: optionalFormNumber(fields, 'painScore'),
      bloodPressure: optionalFormText(fields, 'bloodPressure'),
      temperatureC: optionalFormNumber(fields, 'temperatureC'),
      pulseBpm: optionalFormNumber(fields, 'pulseBpm'),
      spo2Percent: optionalFormNumber(fields, 'spo2Percent'),
      cbgMgDl: optionalFormNumber(fields, 'cbgMgDl'),
      weightKg: optionalFormNumber(fields, 'weightKg'),
      heightCm: optionalFormNumber(fields, 'heightCm'),
      nurseNotes: optionalFormText(fields, 'nurseNotes'),
    };
    if (isApiConnected()) {
      const saved = await apiRequest(`/nursing/queue/${encodeURIComponent(queueTokenId)}/intake`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      data.patientIntakes = data.patientIntakes.filter((item) => item.queueTokenId !== queueTokenId)
        .concat({ ...saved, patientId: saved.patientId, queueTokenId });
    } else {
      const queue = data.queueTokens.find((item) => item.id === queueTokenId);
      if (!queue) throw new Error('Queue entry not found.');
      const current = data.patientIntakes.find((item) => item.queueTokenId === queueTokenId);
      if (current?.status === 'ACKNOWLEDGED') throw new Error('Doctor-reviewed intake cannot be edited.');
      const intake = {
        ...payload,
        id: current?.id || makeId('intake'),
        patientId: queue.patientId,
        queueTokenId,
        tokenNumber: queue.tokenNumber,
        doctorName: queue.doctor,
        visitDate: queue.queueDate,
        enteredBy: getStoredApiUser()?.email || 'Clinic nurse',
        bmi: payload.weightKg && payload.heightCm
          ? Number((payload.weightKg / ((payload.heightCm / 100) ** 2)).toFixed(2))
          : null,
        createdAt: current?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.patientIntakes = data.patientIntakes.filter((item) => item.queueTokenId !== queueTokenId).concat(intake);
      save();
    }
    closeModal(document.getElementById('nurseIntakeModal'));
    renderPatientQueue();
    showToast(intent === 'SUBMITTED' ? 'Nurse intake sent to the doctor worklist.' : 'Nurse intake draft saved.');
  }

  async function savePatientEncounter(form) {
    const fields = new FormData(form);
    const patientId = formString(fields, 'patientId');
    const encounterId = formString(fields, 'encounterId');
    const queueTokenId = formString(fields, 'queueTokenId');
    const textFields = [
      'doctorName', 'visitDate', 'encounterType', 'symptoms', 'consultationNotes', 'diagnosis',
      'bloodPressure', 'knownCase', 'investigationAdvice', 'referralDetails', 'prescriptions', 'tests',
      'followUpDate', 'followUpInstructions', 'admittedAt', 'ward', 'bed',
    ];
    const payload = Object.fromEntries(textFields.map((name) => [name, formString(fields, name)]));
    if (encounterId && queueTokenId) payload.status = 'CLOSED';
    ['temperatureC', 'spo2Percent', 'cbgMgDl', 'weightKg', 'heightCm', 'pulseBpm'].forEach((name) => {
      const value = optionalFormNumber(fields, name);
      if (value !== undefined) payload[name] = value;
    });
    if (!payload.admittedAt) delete payload.admittedAt;
    if (!payload.followUpDate) delete payload.followUpDate;
    if (!payload.ward) delete payload.ward;
    if (!payload.bed) delete payload.bed;
    if (isApiConnected()) {
      const path = `/patients/${encodeURIComponent(patientId)}/records${encounterId ? `/${encodeURIComponent(encounterId)}` : ''}`;
      const saved = await apiRequest(path, { method: encounterId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      const records = await apiRequest(`/patients/${encodeURIComponent(patientId)}/records`);
      if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid clinical history.');
      data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patientId)
        .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId })));
      if (!records.some((record) => record.id === saved.id)) throw new Error('The saved visit was not returned in patient history.');
    } else {
      const patient = patientById(patientId);
      if (!patient) throw new Error('Patient not found.');
      const previous = getPatientRecords(patientId).find((record) => record.id === encounterId);
      const encounter = {
        ...previous,
        ...payload,
        id: encounterId || makeId('visit'),
        patientId,
        encounterType: payload.encounterType || previous?.encounterType || 'OPD',
        status: payload.status || previous?.status || (payload.encounterType === 'IPD' ? 'OPEN' : 'CLOSED'),
        visitDate: payload.visitDate,
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bmi: payload.weightKg && payload.heightCm
          ? Number((payload.weightKg / ((payload.heightCm / 100) ** 2)).toFixed(2))
          : previous?.bmi || null,
        admittedAt: payload.admittedAt || previous?.admittedAt || null,
        dischargedAt: previous?.dischargedAt || null,
        prescriptionItems: previous?.prescriptionItems || [],
        reports: previous?.reports || [],
      };
      data.patientRecords = data.patientRecords.filter((record) => record.id !== encounter.id).concat(encounter);
      save();
      if (queueTokenId) await updateQueueEntry(queueTokenId, 'COMPLETED');
    }
    closeModal(document.getElementById('patientEncounterModal'));
    if (activePatientRecordsId === patientId) {
      renderPatientRecords(patientId);
      renderPatientHistorySummary(patientId);
    }
    renderPatients();
    showToast(encounterId ? 'Patient visit updated.' : 'Patient visit saved.');
  }

  function renderPatientIntakeHistory(patientId) {
    const target = document.getElementById('patientIntakeHistory');
    const intakes = isApiConnected()
      ? data.patientIntakes.filter((item) => item.patientId === patientId)
      : [
          ...data.patientIntakes.filter((item) => item.patientId === patientId),
          ...data.queueTokens
            .filter((token) => token.patientId === patientId && token.nurseIntake)
            .map((token) => ({
              ...token.nurseIntake,
              visitDate: token.date,
              tokenNumber: token.tokenNumber,
              doctorName: token.doctor,
            })),
        ];
    if (!intakes.length) {
      target.innerHTML = '<div class="patient-record-empty">No archived nurse intake records.</div>';
      return;
    }

    target.innerHTML = intakes.map((intake) => {
      const vitals = [
        intake.bloodPressure ? `BP ${intake.bloodPressure}` : '',
        intake.temperatureC != null && `Temp ${intake.temperatureC} °C`,
        intake.pulseBpm != null && `Pulse ${intake.pulseBpm} bpm`,
        intake.spo2Percent != null && `SpO₂ ${intake.spo2Percent}%`,
        intake.cbgMgDl != null && `Glucose ${intake.cbgMgDl} mg/dL`,
        intake.weightKg != null && `Weight ${intake.weightKg} kg`,
        intake.heightCm != null && `Height ${intake.heightCm} cm`,
        intake.bmi != null && `BMI ${intake.bmi}`,
      ].filter(Boolean).join(' · ');
      const fields = [
        ['Chief complaint', intake.chiefComplaint],
        ['Symptoms', intake.symptoms],
        ['Onset / duration', intake.onset],
        ['Allergy status', intake.allergyStatus],
        ['Allergy details', intake.allergyDetails],
        ['Current medicines', intake.medicationNotes],
        ['Arrival vitals', vitals],
        ['Handoff notes', intake.nurseNotes],
        ['Recorded by', intake.enteredBy?.email || intake.enteredBy],
      ].filter(([, value]) => value);
      const visitDate = intake.queueToken?.queueDate || intake.visitDate || intake.createdAt;
      const tokenNumber = intake.queueToken?.tokenNumber || intake.tokenNumber;
      const doctor = intake.queueToken?.doctor?.email || intake.doctorName;
      return `<article class="patient-intake-archive-card">
        <div class="patient-intake-archive-heading">
          <b>${escapeHtml(visitDate ? formatDate(String(visitDate).slice(0, 10)) : 'Date not recorded')}</b>
          <span class="status-pill">${escapeHtml(intake.status || 'Archived')}</span>
        </div>
        <small>${tokenNumber ? `Token T${String(tokenNumber).padStart(3, '0')}` : 'Visit'}${doctor ? ` · ${escapeHtml(doctor)}` : ''}</small>
        <div class="patient-intake-archive-fields">${fields.map(([label, value]) => `<div><b>${escapeHtml(label)}</b><p>${recordText(value)}</p></div>`).join('')}</div>
      </article>`;
    }).join('');
  }

  function renderPatientHistorySummary(patientId) {
    const patient = patientById(patientId);
    const records = getPatientRecords(patientId);
    const summary = document.getElementById('patientHistorySummary');
    if (!summary) return;

    if (!records.length) {
      summary.classList.add('hidden');
      summary.replaceChildren();
      return;
    }

    const latest = records[0];
    summary.classList.remove('hidden');
    summary.innerHTML = `
      <div><b>${records.length} saved ${records.length === 1 ? 'visit' : 'visits'}</b><small>Latest visit: ${escapeHtml(formatDate(latest.visitDate))}</small></div>
      <div><b>Latest diagnosis</b><small>${escapeHtml(latest.diagnosis || 'Not recorded')}</small></div>
      <div><b>Latest doctor</b><small>${escapeHtml(latest.doctorName || 'Not recorded')}</small></div>
      <div><b>Known case</b><small>${escapeHtml(latest.knownCase || patient?.medicalHistory || 'Not recorded')}</small></div>
    `;
  }

  async function isValidReportFileContent(file, extension) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const startsWith = (...signature) => signature.every((byte, index) => bytes[index] === byte);
    if (extension === 'pdf') return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
    if (extension === 'png') return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    if (extension === 'jpg' || extension === 'jpeg') return startsWith(0xff, 0xd8, 0xff);
    if (extension === 'webp') return startsWith(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (extension === 'gif') return ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)));
    if (extension === 'txt') {
      try {
        if (bytes.includes(0)) return false;
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  function fileToDataUrl(file, mimeType) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        if (comma < 0) {
          reject(new Error('The browser returned an invalid file data URL.'));
          return;
        }
        resolve(`data:${mimeType};base64,${result.slice(comma + 1)}`);
      };
      reader.onerror = () => reject(reader.error || new Error('The report file could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  function renderAppointments() {
    const query = document.getElementById('appointmentSearch').value.trim().toLowerCase();
    const rows = [...data.appointments].filter((appointment) => {
      const name = patientById(appointment.patientId)?.name || '';
      return `${name} ${appointment.doctor} ${appointment.department} ${appointment.reason}`.toLowerCase().includes(query);
    }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    document.getElementById('appointmentsEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('appointmentsTable').innerHTML = rows.map((appointment) => {
      const patient = patientById(appointment.patientId);
      const statusClass = appointment.status === 'Cancelled' ? 'cancelled' : appointment.status === 'Scheduled' ? 'pending' : '';
      return `<tr><td>${escapeHtml(patient?.name || 'Patient record unavailable')}</td><td>${escapeHtml(appointment.doctor)}</td><td>${escapeHtml(appointment.department || '—')}</td><td>${escapeHtml(formatDate(appointment.date))} · ${escapeHtml(formatTime(appointment.time))}</td><td>${escapeHtml(appointment.reason || '—')}</td><td><span class="status-pill ${statusClass}">${escapeHtml(appointment.status)}</span></td><td>${appointment.status === 'Scheduled' && canManagePatientData() ? `<button class="action-button" data-check-in-appointment="${escapeHtml(appointment.id)}">Check in</button>` : ''}${appointment.status !== 'Cancelled' && appointment.status !== 'Completed' ? `<button class="action-button danger" data-cancel-appointment="${escapeHtml(appointment.id)}">Cancel</button>` : ''}</td></tr>`;
    }).join('');
    renderPatientQueue();
  }

  function renderPatientQueue() {
    const queueTokens = isApiConnected()
      ? (data.queueTokens || [])
      : (data.queueTokens || []).filter((item) => item.queueDate === dateKey(today));
    const canCall = !isApiConnected() || ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE'].includes(getStoredApiUser()?.role);
    const canCancel = canManagePatientData();
    const canConsult = canWriteConsultationPrescriptions();
    const canIntake = !isApiConnected() || ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'NURSE'].includes(getStoredApiUser()?.role);
    document.getElementById('queueCount').textContent = `${queueTokens.length} ${queueTokens.length === 1 ? 'patient' : 'patients'}`;
    document.getElementById('patientQueueEmpty').classList.toggle('hidden', queueTokens.length > 0);
    document.getElementById('patientQueueTable').innerHTML = queueTokens.map((item) => {
      const patient = patientById(item.patientId);
      const intake = (data.patientIntakes || []).find((record) => record.queueTokenId === item.id);
      const statusLabel = intake?.status === 'DRAFT'
        ? 'Intake in progress'
        : intake?.status === 'SUBMITTED'
          ? 'Ready for doctor'
          : intake?.status === 'ACKNOWLEDGED'
            ? 'Reviewed by doctor'
            : ({
        WAITING: 'Waiting',
        CALLED: 'Called',
        IN_CONSULTATION: 'With doctor',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        NO_SHOW: 'No-show',
      }[item.status] || item.status);
      const statusClass = ['CANCELLED', 'NO_SHOW'].includes(item.status) ? 'cancelled' : ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(item.status) ? 'pending' : '';
      const actions = [
        canViewClinicalRecords() ? `<button class="action-button" data-queue-patient-profile="${escapeHtml(item.patientId)}">History</button>` : '',
        ['WAITING', 'CALLED'].includes(item.status) && canIntake ? `<button class="action-button" data-record-queue-intake="${escapeHtml(item.id)}">${intake?.status === 'DRAFT' ? 'Resume intake' : intake?.status === 'SUBMITTED' ? 'View intake' : 'Record intake'}</button>` : '',
        item.status === 'WAITING' && canCall ? `<button class="action-button" data-queue-status="${escapeHtml(item.id)}" data-status="CALLED">Call</button>` : '',
        item.status === 'CALLED' && canCall ? `<button class="action-button" data-queue-status="${escapeHtml(item.id)}" data-status="WAITING">Return</button>` : '',
        item.status === 'CALLED' && canConsult ? `<button class="action-button" data-start-queue-consultation="${escapeHtml(item.id)}">Start consultation</button>` : '',
        item.status === 'IN_CONSULTATION' && canConsult ? `<button class="action-button" data-queue-status="${escapeHtml(item.id)}" data-status="COMPLETED">Complete</button>` : '',
        ['WAITING', 'CALLED'].includes(item.status) && canCancel ? `<button class="action-button danger" data-queue-status="${escapeHtml(item.id)}" data-status="CANCELLED">Cancel</button>` : '',
        ['WAITING', 'CALLED'].includes(item.status) && canCancel ? `<button class="action-button" data-queue-status="${escapeHtml(item.id)}" data-status="NO_SHOW">No-show</button>` : '',
      ].filter(Boolean).join('');
      return `<tr><td><strong class="patient-queue-token">${escapeHtml(`${item.priority === 'EMERGENCY' ? 'E' : item.priority === 'URGENT' ? 'U' : 'T'}${item.tokenNumber}`)}</strong></td><td><b>${escapeHtml(patient?.name || item.patientName || 'Patient unavailable')}</b><small class="table-secondary">${escapeHtml(patient?.code || '')}</small></td><td>${escapeHtml(patient ? `${patientAge(patient)} / ${patient.gender || 'Unspecified'}` : '—')}</td><td>${escapeHtml(item.doctor || 'Doctor')}</td><td>${escapeHtml(item.encounterType || 'OPD')}</td><td>${escapeHtml(item.reason || '—')}</td><td><span class="status-pill ${statusClass}">${escapeHtml(statusLabel)}</span></td><td><span class="row-actions">${actions || '<span class="muted">—</span>'}</span></td></tr>`;
    }).join('');
    document.getElementById('openWalkInCheckIn').classList.toggle('hidden', !canManagePatientData());
  }

  function getDoctorQueueEntries() {
    const entries = isApiConnected()
      ? (data.queueTokens || [])
      : (data.queueTokens || []).filter((item) => item.queueDate === dateKey(today));
    return entries.filter((item) => !['CANCELLED'].includes(item.status))
      .sort((left, right) => Number(left.tokenNumber || 0) - Number(right.tokenNumber || 0));
  }

  function doctorHistoryBoolean(value) {
    return value === true ? 'Yes' : value === false ? 'No' : 'Not recorded';
  }

  function doctorVitalsTrendMarkup(records) {
    const sorted = [...records].sort((left, right) =>
      new Date(left.recordedAt || left.visitDate).getTime() - new Date(right.recordedAt || right.visitDate).getTime());
    return `<details class="doctor-vitals-history">
      <summary class="doctor-vitals-history-summary doctor-vitals-history-heading">
        <div><h3>Vitals history &amp; trends</h3><p>${sorted.length} recorded reading${sorted.length === 1 ? '' : 's'} · click to view charts.</p></div>
        <span>${sorted.length} record${sorted.length === 1 ? '' : 's'}</span><i aria-hidden="true">⌄</i>
      </summary>
      <div class="doctor-vitals-history-content">
        <div class="doctor-vitals-chart-type" role="group" aria-label="Vitals chart type">
          <button type="button" class="${activeDoctorVitalsChartType === 'line' ? 'active' : ''}" aria-pressed="${activeDoctorVitalsChartType === 'line'}" data-doctor-vitals-chart-type="line">Line graph</button>
          <button type="button" class="${activeDoctorVitalsChartType === 'bar' ? 'active' : ''}" aria-pressed="${activeDoctorVitalsChartType === 'bar'}" data-doctor-vitals-chart-type="bar">Bar graph</button>
        </div>
        <div class="doctor-vitals-trend-grid">${doctorVitalsTrendCardsMarkup(sorted)}</div>
        <p class="field-help">Reference indicators appear only when clinic-approved ranges exist for the patient’s age at the reading date. They are not diagnoses.</p>
      </div>
    </details>`;
  }

  function doctorVitalsTrendCardsMarkup(sorted) {
    const metrics = [
      ...vitalReferenceMetrics.filter((item) => item.key !== 'bmi'),
      vitalReferenceMetrics.find((item) => item.key === 'bmi'),
    ].filter(Boolean);
    return metrics.map((metric) => {
        const points = sorted.map((record) => ({ record, value: record[metric.key] }))
          .filter((point) => point.value !== null && point.value !== undefined && Number.isFinite(Number(point.value)));
        const chart = points.length < 2
          ? '<p class="muted">Add another reading to compare visits.</p>'
          : (() => {
            const values = points.map((point) => Number(point.value));
            const minimum = Math.min(...values);
            const maximum = Math.max(...values);
            const span = maximum - minimum || 1;
            const coordinates = values.map((value, index) => {
              const x = 8 + (index * 224) / (values.length - 1);
              const y = 44 - ((value - minimum) / span) * 34;
              return `${x},${y}`;
            }).join(' ');
            const last = points[points.length - 1];
            const dateLabels = points.slice(-3).map((point) =>
              formatDate(String(point.record.visitDate || point.record.recordedAt || '').slice(0, 10))).join(' · ');
            const graph = activeDoctorVitalsChartType === 'bar'
              ? `<line x1="8" y1="45" x2="232" y2="45" stroke="#dfe8ed" stroke-width="1"></line>${values.map((value, index) => {
                const step = 224 / values.length;
                const height = 10 + ((value - minimum) / span) * 28;
                const barWidth = Math.min(18, step * 0.55);
                const x = 8 + index * step + (step - barWidth) / 2;
                const record = points[index].record;
                const date = formatDate(String(record.visitDate || record.recordedAt || '').slice(0, 10));
                return `<rect x="${x}" y="${45 - height}" width="${barWidth}" height="${height}" rx="2" fill="#0da99b"><title>${escapeHtml(`${formatVitalNumber(value)} ${metric.unit} · ${date}`)}</title></rect>`;
              }).join('')}`
              : `<polyline points="${coordinates}" fill="none" stroke="#0da99b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline><circle cx="${coordinates.split(' ').pop().split(',')[0]}" cy="${coordinates.split(' ').pop().split(',')[1]}" r="3.5" fill="#0da99b"><title>Latest ${escapeHtml(formatVitalNumber(last.value))} ${escapeHtml(metric.unit)}</title></circle>`;
            return `<svg viewBox="0 0 240 52" role="img" aria-label="${escapeHtml(`${metric.label} ${activeDoctorVitalsChartType} trend`)}">${graph}</svg><small>${escapeHtml(dateLabels)}</small>`;
          })();
        return `<article class="doctor-vitals-trend-card"><div><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metric.unit)}</span></div>${chart}</article>`;
      }).join('');
  }

  function wireDoctorVitalsTrend(host, records) {
    host.querySelectorAll('[data-doctor-vitals-chart-type]').forEach((button) => {
      button.addEventListener('click', () => {
        activeDoctorVitalsChartType = button.dataset.doctorVitalsChartType;
        const trend = button.closest('.doctor-vitals-history');
        const sorted = [...records].sort((left, right) =>
          new Date(left.recordedAt || left.visitDate).getTime() - new Date(right.recordedAt || right.visitDate).getTime());
        trend.querySelector('.doctor-vitals-trend-grid').innerHTML = doctorVitalsTrendCardsMarkup(sorted);
        trend.querySelectorAll('[data-doctor-vitals-chart-type]').forEach((chartButton) => {
          const selected = chartButton.dataset.doctorVitalsChartType === activeDoctorVitalsChartType;
          chartButton.classList.toggle('active', selected);
          chartButton.setAttribute('aria-pressed', String(selected));
        });
      });
    });
  }

  function renderDoctorWorkspace() {
    const nav = document.getElementById('doctorWorkspaceNav');
    nav?.classList.toggle('hidden', !canAccessDoctorWorkspace());
    if (WORKSPACE_MODE === 'front-office') return;
    const entries = getDoctorQueueEntries();
    const activeEntry = entries.find((item) => item.id === activeDoctorQueueTokenId);
    const nextPatient = entries.find((item) => item.status === 'WAITING')
      || entries.find((item) => item.status === 'CALLED')
      || entries.find((item) => item.status === 'IN_CONSULTATION');
    if ((!activeEntry || activeEntry.status === 'COMPLETED') && nextPatient && activeEntry?.id !== nextPatient.id) {
      void openDoctorQueuePatient(nextPatient.id);
      return;
    }
    const search = (document.getElementById('doctorQueueSearch')?.value || '').trim().toLowerCase();
    const filtered = entries.filter((item) => {
      const patient = patientById(item.patientId);
      return `${item.tokenNumber} ${patient?.name || item.patientName || ''} ${patient?.code || ''} ${item.reason || ''}`
        .toLowerCase().includes(search);
    });
    const waiting = entries.filter((item) => item.status === 'WAITING').length;
    const inProgress = entries.filter((item) => ['CALLED', 'IN_CONSULTATION'].includes(item.status)).length;
    const done = entries.filter((item) => item.status === 'COMPLETED').length;
    document.getElementById('doctorQueueCounts').textContent = `${waiting} waiting · ${inProgress} in progress · ${done} done`;
    document.getElementById('doctorQueueCount').textContent = String(entries.length);
    document.getElementById('doctorQueueEmpty').classList.toggle('hidden', filtered.length > 0);
    document.getElementById('doctorWorkspaceQueue').innerHTML = filtered.map((item) => {
      const patient = patientById(item.patientId);
      const name = patient?.name || item.patientName || 'Patient unavailable';
      const status = item.status === 'COMPLETED'
        ? 'Done'
        : item.status === 'IN_CONSULTATION'
          ? 'With doctor'
          : item.status === 'CALLED'
            ? 'Called'
            : item.status === 'NO_SHOW'
              ? 'No-show'
              : 'Waiting';
      const statusClass = item.status === 'COMPLETED'
        ? 'doctor-queue-done'
        : ['IN_CONSULTATION', 'NO_SHOW'].includes(item.status)
          ? 'doctor-queue-progress'
          : '';
      const priority = item.priority === 'EMERGENCY' ? 'Emergency' : item.priority === 'URGENT' ? 'Urgent' : 'Normal';
      const patientAgeLabel = patient ? patientAge(patient) : '—';
      const registrationTime = formatTime(String(item.patientRegisteredAt || patient?.createdAt || '').slice(11, 16));
      const assignmentTime = formatTime(String(item.assignmentAt || '').slice(11, 16));
      return `<button type="button" class="doctor-queue-item ${activeDoctorQueueTokenId === item.id ? 'active' : ''}" data-doctor-select-token="${escapeHtml(item.id)}" aria-pressed="${activeDoctorQueueTokenId === item.id}">
        <span class="doctor-queue-avatar">${escapeHtml(initials(name))}<small>${escapeHtml(`${item.priority === 'EMERGENCY' ? 'E' : item.priority === 'URGENT' ? 'U' : 'T'}${item.tokenNumber}`)}</small></span>
        <span class="doctor-queue-person"><b>${escapeHtml(name)}</b><small>${escapeHtml(patient?.code || item.patientCode || '')} · ${escapeHtml(patientAgeLabel)} / ${escapeHtml(patient?.gender || item.patientGender || 'Not recorded')}</small><small>Reg ${escapeHtml(registrationTime)} · Assigned ${escapeHtml(assignmentTime)} · ${escapeHtml(item.patientType === 'NEW' ? 'New' : 'Existing')} · ${escapeHtml(priority)}</small></span>
        <span class="doctor-queue-status ${statusClass}">${escapeHtml(status)}</span>
      </button>`;
    }).join('');

    const selected = entries.find((item) => item.id === activeDoctorQueueTokenId);
    const placeholder = document.getElementById('doctorWorkspacePlaceholder');
    const patientHost = document.getElementById('doctorWorkspacePatient');
    if (!selected) {
      placeholder.classList.remove('hidden');
      patientHost.classList.add('hidden');
      patientHost.replaceChildren();
      return;
    }

    const patient = patientById(selected.patientId);
    if (!patient) {
      placeholder.classList.remove('hidden');
      patientHost.classList.add('hidden');
      patientHost.replaceChildren();
      return;
    }
    const records = getPatientRecords(patient.id);
    const visit = records.find((item) => item.id === selected.encounterId) || records[0] || {};
    const vitals = activeDoctorVitals
      .filter((item) => item.encounterId === selected.encounterId)
      .sort((left, right) => String(right.recordedAt || right.visitDate).localeCompare(String(left.recordedAt || left.visitDate)))[0] || visit;
    const trendRecords = activeDoctorVitals.length ? activeDoctorVitals : getPatientVitalsHistory(patient.id);
    const bp = vitals.systolicMmHg != null && vitals.diastolicMmHg != null
      ? `${vitals.systolicMmHg}/${vitals.diastolicMmHg}`
      : vitals.bloodPressure || '—';
    const temperature = vitals.temperatureF != null
      ? `${formatVitalNumber(vitals.temperatureF)} °F`
      : vitals.temperatureC != null ? `${formatVitalNumber(vitals.temperatureC)} °C` : '—';
    const heightDisplay = vitals.heightCm == null
      ? '—'
      : `${vitals.heightEnteredValue || formatVitalNumber(vitals.heightCm)} ${vitals.heightEnteredUnit === 'FEET_INCHES' ? '' : 'cm'}${vitals.heightEnteredUnit === 'FEET_INCHES' ? ` (${formatVitalNumber(vitals.heightCm)} cm)` : ''}`;
    const weightDisplay = vitals.weightKg == null
      ? '—'
      : `${vitals.weightEnteredValue ?? formatVitalNumber(vitals.weightKg)} ${vitals.weightEnteredUnit === 'POUNDS' ? 'lb' : 'kg'}${vitals.weightEnteredUnit === 'POUNDS' ? ` (${formatVitalNumber(vitals.weightKg)} kg)` : ''}`;
    const vitalRecordedAt = vitals.recordedAt || selected.assignmentAt || selected.queueDate;
    const allergy = patient.allergies || patient.notes || '';
    const structuredConditions = (activeDoctorPatientHistory?.medicalConditions || [])
      .map((item) => item.condition || item.name)
      .filter(Boolean);
    const medicalConditions = activeDoctorPatientHistory?.medicalConditions || [];
    const familyHistoryMembers = activeDoctorPatientHistory?.familyHistoryMembers || [];
    const personalHistory = activeDoctorPatientHistory?.personalHistory || {};
    const femaleHistory = activeDoctorPatientHistory?.femaleHistory || {};
    const conditions = structuredConditions.length
      ? structuredConditions.join(', ')
      : patient.medicalHistory || 'Not recorded';
    const registrationPanel = `<section class="doctor-record-card doctor-registration-card"><h3>Front office registration &amp; assignment</h3><dl>
      ${[['Patient ID', patient.code || 'Not recorded'], ['Patient name', patient.name], ['Date of birth', patient.dob ? formatDate(patient.dob) : 'Not recorded'], ['Age / gender', `${patientAge(patient)} / ${patient.gender || 'Not recorded'}`], ['Blood group', patient.bloodGroup || 'Not recorded'], ['Mobile', patient.phone || 'Not recorded'], ['Email', patient.email || 'Not recorded'], ['Address', [patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean).join(', ') || 'Not recorded'], ['Emergency contact', [patient.emergencyContactName, patient.emergencyContactRelationship, patient.emergencyPhone].filter(Boolean).join(' · ') || patient.emergencyContact || 'Not recorded'], ['Occupation / marital status', [patient.occupation, patient.maritalStatus].filter(Boolean).join(' · ') || 'Not recorded'], ['Preferred language', patient.preferredLanguage || 'Not recorded'], ['Insurance', [patient.insuranceProvider, patient.insuranceNumber].filter(Boolean).join(' · ') || 'Not recorded'], ['Registered at', formatDateTime(patient.createdAt || selected.patientRegisteredAt)], ['Registered by', patient.registeredBy || selected.patientRegisteredBy || 'Not recorded'], ['Patient type', selected.patientType === 'NEW' ? 'New patient' : 'Existing patient'], ['Assigned doctor', selected.doctor || 'Not recorded'], ['Department / specialization', selected.department || 'Not recorded'], ['Assigned at', formatDateTime(selected.assignmentAt)], ['Assigned by', selected.assignedBy || 'Not recorded'], ['Appointment date / time', selected.appointmentStartsAt ? formatDateTime(selected.appointmentStartsAt) : 'Walk-in check-in'], ['Priority / status', `${selected.priority} / ${selected.status.replace(/_/g, ' ').toLowerCase()}`]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${recordText(value)}</dd></div>`).join('')}
    </dl></section>`;
    const statusAction = selected.status === 'WAITING'
      ? `<button type="button" class="button button-light" data-doctor-call-token="${escapeHtml(selected.id)}">Call patient</button>${canWriteConsultationPrescriptions() ? `<button type="button" class="button button-light" data-queue-status="${escapeHtml(selected.id)}" data-status="NO_SHOW">Mark no-show</button>` : ''}`
      : selected.status === 'CALLED'
        ? `<button type="button" class="button button-primary" data-start-queue-consultation="${escapeHtml(selected.id)}" ${canWriteConsultationPrescriptions() ? '' : 'disabled title="Sign in with a doctor account to start consultations"'}>Start consultation</button>${canWriteConsultationPrescriptions() ? `<button type="button" class="button button-light" data-queue-status="${escapeHtml(selected.id)}" data-status="NO_SHOW">Mark no-show</button>` : ''}`
        : selected.status === 'IN_CONSULTATION'
          ? `<button type="button" class="button button-primary" data-doctor-continue-consultation="${escapeHtml(selected.id)}">Continue consultation</button><button type="button" class="button button-light" data-doctor-complete-token="${escapeHtml(selected.id)}">Complete visit</button>`
          : '';
    const consultationAction = selected.status === 'COMPLETED'
      ? `<button type="button" class="button button-primary button-small" data-doctor-new-visit="${escapeHtml(patient.id)}" ${canManagePatientData() ? 'title="Create a new visit before starting another consultation"' : 'disabled title="Ask reception to check in a new visit"'}>＋ New consultation</button>`
      : `<button type="button" class="button button-primary button-small" data-doctor-open-consultation="${escapeHtml(selected.id)}" ${!['CALLED', 'IN_CONSULTATION'].includes(selected.status) || !canWriteConsultationPrescriptions() ? 'disabled title="Call the patient before starting the consultation"' : ''}>＋ New consultation</button>`;

    const nurseIntake = (data.patientIntakes || []).find((item) => item.queueTokenId === selected.id);
    const handoffDetails = nurseIntake
      ? `<section class="doctor-record-card" id="nurseHandoffDetails"><div class="doctor-record-card-heading"><h3>Nurse intake handoff</h3><span class="status-pill">${escapeHtml(nurseIntake.status || 'Draft')}</span></div><dl>
          ${[['Chief complaint', nurseIntake.chiefComplaint], ['Symptoms', nurseIntake.symptoms], ['Onset / duration', nurseIntake.onset], ['Allergy status', `${nurseIntake.allergyStatus || 'NOT_CONFIRMED'}${nurseIntake.allergyDetails ? ` · ${nurseIntake.allergyDetails}` : ''}`], ['Medication review', nurseIntake.medicationsReviewed ? nurseIntake.medicationNotes || 'Reviewed' : 'Not reviewed'], ['Vitals', [nurseIntake.bloodPressure ? `BP ${nurseIntake.bloodPressure}` : '', nurseIntake.temperatureC != null ? `Temp ${nurseIntake.temperatureC} °C` : '', nurseIntake.pulseBpm != null ? `Pulse ${nurseIntake.pulseBpm}` : '', nurseIntake.spo2Percent != null ? `SpO₂ ${nurseIntake.spo2Percent}%` : '', nurseIntake.weightKg != null ? `Weight ${nurseIntake.weightKg} kg` : '', nurseIntake.heightCm != null ? `Height ${nurseIntake.heightCm} cm` : ''].filter(Boolean).join(' · ')], ['Nurse notes', nurseIntake.nurseNotes]].filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${recordText(value)}</dd></div>`).join('')}
        </dl>${nurseIntake.status === 'SUBMITTED' && (!isApiConnected() || getStoredApiUser()?.role === 'DOCTOR') ? `<button type="button" class="button button-light button-small" data-ack-intake="${escapeHtml(selected.id)}">Mark intake reviewed</button>` : ''}</section>`
      : '';
    const overviewPanel = `<div class="doctor-record-grid">
      ${registrationPanel}
      ${handoffDetails}
      <section class="doctor-record-card"><h3>Medical history</h3><dl>
        <div><dt>Existing conditions</dt><dd>${recordText(conditions)}</dd></div>
        <div><dt>Known allergies</dt><dd class="${allergy ? 'doctor-alert-text' : ''}">${recordText(allergy || 'No allergy recorded')}</dd></div>
        <div><dt>Current medications</dt><dd>${recordText(patient.currentMedications || 'Not recorded')}</dd></div>
        <div><dt>Previous treatment</dt><dd>${recordText(patient.surgicalHistory || 'Not recorded')}</dd></div>
      </dl>${medicalConditions.length ? `<div class="doctor-structured-history">${medicalConditions.map((item) => `<article><b>${recordText(item.condition || item.name)}</b><small>${escapeHtml(item.status || 'Active')}${item.diagnosedAt ? ` · Diagnosed ${escapeHtml(formatDate(String(item.diagnosedAt).slice(0, 10)))}` : ''}</small>${item.currentMedication ? `<p><b>Medication:</b> ${recordText(item.currentMedication)}</p>` : ''}${item.previousTreatment ? `<p><b>Previous treatment:</b> ${recordText(item.previousTreatment)}</p>` : ''}${item.doctorRemarks ? `<p><b>Doctor remarks:</b> ${recordText(item.doctorRemarks)}</p>` : ''}</article>`).join('')}</div>` : ''}</section>
      <section class="doctor-record-card"><h3>Family medical history</h3>
        ${familyHistoryMembers.length ? `<div class="doctor-structured-history">${familyHistoryMembers.map((member) => `<article><b>${recordText(member.relationship === 'Other' ? member.customRelationship || 'Other' : member.relationship)}</b><small>Age at diagnosis: ${member.ageAtDiagnosis ?? 'Not recorded'}</small><p><b>Conditions:</b> ${recordText((member.conditions || []).map((item) => item.condition || item.name || item).join(', ') || 'Not recorded')}</p>${member.remarks ? `<p><b>Remarks:</b> ${recordText(member.remarks)}</p>` : ''}</article>`).join('')}</div>` : `<p class="muted">${recordText(patient.familyHistory || 'No family history recorded.')}</p>`}
      </section>
      <section class="doctor-record-card"><h3>Personal history</h3><dl>
        ${[['Alcohol', doctorHistoryBoolean(personalHistory.alcohol)], ['Alcohol frequency / quantity', [personalHistory.alcoholFrequency, personalHistory.alcoholQuantity].filter(Boolean).join(' · ') || 'Not recorded'], ['Smoking', doctorHistoryBoolean(personalHistory.smoking)], ['Smoking duration', personalHistory.smokingDuration], ['Tobacco chewing', doctorHistoryBoolean(personalHistory.tobaccoChewing)], ['Tobacco duration', personalHistory.tobaccoDuration], ['Coffee / tea per day', `${personalHistory.coffeePerDay ?? '—'} / ${personalHistory.teaPerDay ?? '—'}`], ['Sleep', `${doctorHistoryBoolean(personalHistory.sleepAdequate)}${personalHistory.sleepingHours != null ? ` · ${personalHistory.sleepingHours} hours` : ''}`], ['Other habits', personalHistory.otherHabits]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${recordText(value)}</dd></div>`).join('')}
      </dl></section>
      ${String(patient.gender || '').toLowerCase() === 'female' ? `<section class="doctor-record-card"><h3>Female patient history</h3><dl>
        ${[['Menstrual cycle', femaleHistory.menstrualCycle ? String(femaleHistory.menstrualCycle).toLowerCase() : 'Not recorded'], ['Last menstrual period', femaleHistory.lastMenstrualPeriod ? formatDate(String(femaleHistory.lastMenstrualPeriod).slice(0, 10)) : 'Not recorded'], ['Cycle duration', femaleHistory.cycleDurationDays ? `${femaleHistory.cycleDurationDays} days` : 'Not recorded'], ['Menstrual complaints', femaleHistory.menstrualComplaints], ['White discharge', doctorHistoryBoolean(femaleHistory.whiteDischarge)], ['Duration', femaleHistory.dischargeDuration], ['Associated symptoms', femaleHistory.associatedSymptoms], ['Doctor remarks', femaleHistory.doctorRemarks]].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${recordText(value)}</dd></div>`).join('')}
      </dl></section>` : ''}
      <section class="doctor-record-card"><div class="doctor-record-card-heading"><h3>Previous visits</h3><button type="button" class="action-button" data-doctor-history-tab>View all ${records.length}</button></div>
        ${records.length ? `<div class="doctor-history-list">${records.slice(0, 4).map((record) => `<article><time>${escapeHtml(formatDate(record.visitDate))}</time><div><b>${recordText(record.diagnosis || record.encounterType || 'Consultation')}</b><small>${escapeHtml(record.doctorName || 'Doctor not recorded')}</small></div></article>`).join('')}</div>` : '<p class="muted">No previous clinic visits recorded.</p>'}
      </section>
      <section class="doctor-record-card"><h3>Previous prescriptions</h3>
        ${records.some((record) => record.prescriptionVersions?.length || record.prescriptionItems?.length)
          ? records.slice(0, 4).map((record) => prescriptionVersionMarkup(record, patient.id)
            || (record.prescriptionItems?.length ? `<p>${escapeHtml(record.prescriptionItems.map((item) => item.medicineName || item.medicine?.name || 'Medicine').join(', '))}</p>` : '')).join('')
          : '<p class="muted">No previous prescriptions recorded.</p>'}
      </section>
      <section class="doctor-record-card"><h3>Investigations &amp; reports</h3>
        ${records.some((record) => record.tests || record.investigationAdvice || record.reports?.length)
          ? `<div class="doctor-history-list">${records.slice(0, 5).filter((record) => record.tests || record.investigationAdvice || record.reports?.length).map((record) => `<article><time>${escapeHtml(formatDate(record.visitDate))}</time><div>${record.tests ? `<b>${recordText(record.tests)}</b>` : ''}${record.investigationAdvice ? `<small>${recordText(record.investigationAdvice)}</small>` : ''}${record.reports?.length ? `<small>${record.reports.map((report) => escapeHtml(report.name || 'Report')).join(', ')}</small>` : ''}</div></article>`).join('')}</div>`
          : '<p class="muted">No investigations or reports recorded.</p>'}
      </section>
    </div>`;
    const historyPanel = records.length
      ? `<div class="doctor-history-list doctor-history-list-expanded">${records.map((record) => `<article><time>${escapeHtml(formatDate(record.visitDate))}</time><div><b>${recordText(record.diagnosis || record.encounterType || 'Visit')}</b><small>${escapeHtml(record.doctorName || 'Doctor not recorded')} · ${escapeHtml(record.encounterType || 'OPD')}</small>${record.symptoms ? `<p>${recordText(record.symptoms)}</p>` : ''}${record.consultationNotes ? `<p>${recordText(record.consultationNotes)}</p>` : ''}</div></article>`).join('')}</div>`
      : '<div class="empty-state"><b>No visit history yet</b><p>Previous consultations will appear here.</p></div>';
    patientHost.innerHTML = `
      <header class="doctor-patient-header">
        ${patientAvatarMarkup(patient, 'doctor-patient-avatar')}
        <div class="doctor-patient-identity"><h2>${escapeHtml(patient.name)} <span class="doctor-token-badge">${escapeHtml(`${selected.priority === 'EMERGENCY' ? 'E' : selected.priority === 'URGENT' ? 'U' : 'T'}${selected.tokenNumber}`)}</span></h2>
          <p>${escapeHtml(patient.code)} · ${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Not recorded')} · ${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</p>
          <small>${escapeHtml(selected.reason || 'Walk-in · chief complaint not recorded')} · ${escapeHtml(selected.patientType === 'NEW' ? 'New patient' : 'Existing patient')} · ${escapeHtml(selected.department || 'Department not recorded')}</small>
        </div>
        <div class="doctor-patient-contact"><a href="${patient.phone ? `tel:${escapeHtml(patient.phone)}` : '#'}">${escapeHtml(patient.phone || 'Mobile not recorded')}</a><span>${escapeHtml(selected.doctor || selected.doctorName || 'Assigned doctor')}</span></div>
        <div class="doctor-patient-actions">${statusAction}<button type="button" class="button button-light" data-doctor-open-vitals="${escapeHtml(patient.id)}">Update vitals</button><button type="button" class="action-button" data-doctor-open-profile="${escapeHtml(patient.id)}">Patient profile</button></div>
      </header>
      ${allergy ? `<div class="doctor-allergy-banner"><b>Allergies:</b> ${recordText(allergy)}</div>` : '<div class="doctor-allergy-banner doctor-allergy-unrecorded">Allergy status has not been recorded.</div>'}
      <div class="doctor-vitals-strip">${[
        ['BP', bp, 'mmHg', 'bloodPressure'],
        ['Pulse', vitals.pulseBpm != null ? `${vitals.pulseBpm} bpm` : '—', '', 'pulseBpm'],
        ['Temperature', temperature, '', 'temperatureC'],
        ['Respiratory rate', vitals.respiratoryRateBpm != null ? `${vitals.respiratoryRateBpm} breaths/min` : '—', '', 'respiratoryRateBpm'],
        ['SpO2', vitals.spo2Percent != null ? `${vitals.spo2Percent}%` : '—', '', 'spo2Percent'],
        ['Height', heightDisplay, '', 'heightCm'],
        ['Weight', weightDisplay, '', 'weightKg'],
        ['BMI', vitals.bmi != null ? formatVitalNumber(vitals.bmi) : '—', 'kg/m²', 'bmi'],
        ['CBG', vitals.cbgMgDl != null ? `${formatVitalNumber(vitals.cbgMgDl)} mg/dL` : '—', '', 'cbgMgDl'],
      ].map(([label, value, unit, metric]) => {
        const status = metric === 'bloodPressure'
          ? (() => {
            const systolic = vitalReferenceStatus('systolicMmHg', vitals.systolicMmHg, patient, vitalRecordedAt);
            const diastolic = vitalReferenceStatus('diastolicMmHg', vitals.diastolicMmHg, patient, vitalRecordedAt);
            const label = vitals.systolicMmHg == null && vitals.diastolicMmHg == null
              ? 'Not recorded'
              : systolic.label === 'High' || diastolic.label === 'High'
                ? 'High'
                : systolic.label === 'Low' || diastolic.label === 'Low'
                  ? 'Low'
                  : systolic.label === 'Normal' && diastolic.label === 'Normal'
                    ? 'Normal'
                    : 'Not configured';
            return { label, className: label.toLowerCase().replace(' ', '-') };
          })()
          : metric ? vitalReferenceStatus(metric, vitals[metric], patient, vitalRecordedAt) : { label: 'Not recorded', className: '' };
        return `<article><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b>${unit ? `<span>${escapeHtml(unit)}</span>` : ''}<small class="vital-reading-status ${status.className}">${escapeHtml(status.label)}</small></article>`;
      }).join('')}</div>
      <p class="field-help">Vitals recorded ${escapeHtml(formatDateTime(vitals.recordedAt || selected.assignmentAt))} · by ${escapeHtml(vitals.recordedBy?.email || 'Not recorded')}</p>
      ${doctorVitalsTrendMarkup(trendRecords)}
      <div class="doctor-record-toolbar"><div class="doctor-record-tabs" role="tablist" aria-label="Doctor patient record">
        <button type="button" class="${activeDoctorWorkspaceTab === 'overview' ? 'active' : ''}" data-doctor-tab="overview">Consultation</button>
        <button type="button" class="${activeDoctorWorkspaceTab === 'history' ? 'active' : ''}" data-doctor-tab="history">History (${records.length})</button>
      </div>
      ${consultationAction}</div>
      <section class="doctor-record-panel">${activeDoctorWorkspaceTab === 'history' ? historyPanel : overviewPanel}</section>
    `;
    wireDoctorVitalsTrend(patientHost, trendRecords);
    placeholder.classList.add('hidden');
    patientHost.classList.remove('hidden');
  }

  function getNurseQueueEntries() {
    return getDoctorQueueEntries().filter((item) => ['IN_CONSULTATION', 'COMPLETED'].includes(item.status));
  }

  function renderNurseWorkspace() {
    const nav = document.getElementById('nurseWorkspaceNav');
    nav?.classList.toggle('hidden', !canAccessNurseWorkspace());
    const entries = getNurseQueueEntries();
    const activeEntry = entries.find((item) => item.id === activeNurseQueueTokenId);
    document.getElementById('nurseInProgressCount').textContent = String(entries.filter((item) => item.status === 'IN_CONSULTATION').length);
    document.getElementById('nurseCompletedCount').textContent = String(entries.filter((item) => item.status === 'COMPLETED').length);
    document.getElementById('nurseTotalCount').textContent = String(entries.length);
    document.getElementById('nurseQueueCounts').textContent = `${entries.length} ${entries.length === 1 ? 'visit' : 'visits'} ready`;
    document.getElementById('nurseQueueCount').textContent = String(entries.length);
    const queueSearch = document.getElementById('nurseQueueSearch').value.trim().toLowerCase();
    const visibleEntries = entries.filter((item) => {
      const patient = patientById(item.patientId);
      return `${patient?.name || item.patientName || ''} ${patient?.code || ''} ${item.tokenNumber} ${item.doctor || ''}`
        .toLowerCase().includes(queueSearch);
    });
    const queueEmpty = document.getElementById('nurseQueueEmpty');
    queueEmpty.classList.toggle('hidden', visibleEntries.length > 0);
    queueEmpty.querySelector('b').textContent = entries.length ? 'No matching visits' : 'No visits ready';
    queueEmpty.querySelector('p').textContent = entries.length
      ? 'Try another patient name, Patient ID or token.'
      : 'Patients appear here when a doctor starts or completes a visit.';
    document.getElementById('nurseWorkspaceQueue').innerHTML = visibleEntries.map((item) => {
      const patient = patientById(item.patientId);
      const name = patient?.name || item.patientName || 'Patient unavailable';
      const selected = activeNurseQueueTokenId === item.id;
      const status = item.status === 'COMPLETED' ? 'Doctor complete' : 'With doctor';
      const statusClass = item.status === 'COMPLETED' ? 'doctor-queue-done' : 'doctor-queue-progress';
      const priority = item.priority === 'EMERGENCY' ? 'Emergency' : item.priority === 'URGENT' ? 'Urgent' : 'Routine';
      return `<button type="button" class="doctor-queue-item ${selected ? 'active' : ''}" data-nurse-select-token="${escapeHtml(item.id)}" aria-pressed="${selected}">
        <span class="doctor-queue-avatar">${escapeHtml(initials(name))}<small>${escapeHtml(`${item.priority === 'EMERGENCY' ? 'E' : item.priority === 'URGENT' ? 'U' : 'T'}${item.tokenNumber}`)}</small></span>
        <span class="doctor-queue-person"><b>${escapeHtml(name)}</b><small>${escapeHtml(patient?.code || '')} · ${escapeHtml(formatTime(item.time || ''))}</small><small class="nurse-queue-priority ${item.priority === 'EMERGENCY' ? 'emergency' : item.priority === 'URGENT' ? 'urgent' : ''}">${escapeHtml(priority)} priority</small></span>
        <span class="doctor-queue-status ${statusClass}">${escapeHtml(status)}</span>
      </button>`;
    }).join('');

    const placeholder = document.getElementById('nurseWorkspacePlaceholder');
    const patientHost = document.getElementById('nurseWorkspacePatient');
    if (!activeEntry) {
      placeholder.classList.remove('hidden');
      patientHost.classList.add('hidden');
      patientHost.replaceChildren();
      return;
    }
    const patient = patientById(activeEntry.patientId);
    if (!patient) {
      placeholder.classList.remove('hidden');
      patientHost.classList.add('hidden');
      patientHost.replaceChildren();
      return;
    }

    placeholder.classList.add('hidden');
    patientHost.classList.remove('hidden');
    if (nursePrescriptionLoading) {
      patientHost.innerHTML = '<div class="patient-profile-loading" role="status">Loading this visit’s prescription…</div>';
      return;
    }
    if (nursePrescriptionError) {
      patientHost.innerHTML = `<div class="patient-profile-loading" role="alert">${escapeHtml(nursePrescriptionError)}</div>`;
      return;
    }

    const encounter = getPatientRecords(patient.id).find((record) => record.id === activeEntry.encounterId);
    const latestVersion = [...(encounter?.prescriptionVersions || [])]
      .sort((left, right) => Number(right.revision || 0) - Number(left.revision || 0))[0];
    if (!encounter || (!latestVersion && !(encounter.prescriptionItems || []).length)) {
      patientHost.innerHTML = `<section class="doctor-record-card nurse-prescription-summary"><h2>${escapeHtml(patient.name)}</h2><p>${escapeHtml(patient.code || '')} · ${escapeHtml(activeEntry.doctor || 'Assigned doctor')} · ${escapeHtml(formatDate(encounter?.visitDate || activeEntry.queueDate))}</p><div class="empty-state"><span>✚</span><b>No prescription for this visit</b><p>The doctor’s current-visit prescription will appear here after it is saved.</p></div></section>`;
      return;
    }

    const medications = latestVersion
      ? latestVersion.medications || []
      : (encounter.prescriptionItems || []).map((item) => ({
        ...item,
        name: item.medicineName || item.medicine?.name || 'Medicine',
        section: 'TABLET',
      }));
    const givenCount = medications.filter((item) => {
      const progress = getNurseMedicationProgress(item);
      return progress.remaining !== null && progress.remaining <= 0;
    }).length;
    const pendingCount = medications.length - givenCount;
    patientHost.innerHTML = `
      <section class="doctor-record-card nurse-prescription-summary">
        <div class="nurse-patient-banner">
          ${patientAvatarMarkup(patient, 'nurse-patient-avatar')}
          <div class="nurse-patient-identity"><p class="eyebrow">CURRENT VISIT · ${escapeHtml(activeEntry.status === 'COMPLETED' ? 'DOCTOR COMPLETE' : 'IN CONSULTATION')}</p><h2>${escapeHtml(patient.name)}</h2><p>${escapeHtml(patient.code || '')} · Token ${escapeHtml(`${activeEntry.priority === 'EMERGENCY' ? 'E' : activeEntry.priority === 'URGENT' ? 'U' : 'T'}${activeEntry.tokenNumber}`)} · ${escapeHtml(formatDate(encounter.visitDate))}</p></div>
          <span class="status-pill nurse-visit-type">${escapeHtml(activeEntry.encounterType || 'OPD')}</span>
        </div>
        <div class="nurse-patient-meta"><span><small>Assigned doctor</small><b>${escapeHtml(activeEntry.doctor || encounter.doctorName || 'Not recorded')}</b></span><span><small>Priority</small><b class="${activeEntry.priority === 'EMERGENCY' ? 'nurse-priority-emergency' : ''}">${escapeHtml(activeEntry.priority || 'NORMAL')}</b></span><span><small>Patient</small><b>${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Not recorded')}</b></span></div>
        ${patient.allergies || patient.notes ? `<div class="nurse-allergy-alert"><b>Allergy alert</b><span>${recordText(patient.allergies || patient.notes)}</span></div>` : ''}
        <div class="nurse-prescription-summary-bar"><div><small>PRESCRIPTION</small><b>${escapeHtml(latestVersion?.diagnosisName || encounter.diagnosis || 'Current visit')}</b><span>By ${escapeHtml(latestVersion?.doctorName || encounter.doctorName || activeEntry.doctor || 'Doctor not recorded')}${latestVersion ? ` · Version ${escapeHtml(latestVersion.revision || 1)}` : ''}</span></div><div class="nurse-medication-progress"><span><b>${medications.length}</b> items</span><span><b>${givenCount}</b> completed</span><span><b>${pendingCount}</b> to review</span></div></div>
        ${latestVersion?.doctorNotes ? `<p class="nurse-prescription-doctor">${recordText(latestVersion.doctorNotes)}</p>` : ''}
        ${medications.length ? `<div class="nurse-prescription-items">${medications.map((item) => {
          const progress = getNurseMedicationProgress(item);
          const { order, dispensed, administered, remaining } = progress;
          const medicine = data.medicines.find((entry) => entry.id === item.medicineId);
          const stock = medicine ? Number(medicine.quantity || 0) : null;
          const expired = Boolean(medicine?.expiry && medicine.expiry < dateKey(today));
          const linkedInventoryUnavailable = Boolean(item.medicineId) && (!medicine || medicine.active === false);
          const canGive = canAdministerMedication()
            && Boolean(item.id)
            && (!isApiConnected() || Boolean(order?.id && order.status !== 'CANCELLED'))
            && (!item.medicineId || (!linkedInventoryUnavailable && !expired && stock > 0))
            && (remaining === null || remaining > 0);
          return `<article class="nurse-prescription-item ${remaining !== null && remaining <= 0 ? 'is-complete' : ''}">
            <div class="nurse-prescription-heading"><div><span class="nurse-prescription-section">${escapeHtml(item.section || 'MEDICATION')}</span><h3>${escapeHtml(item.name || item.medicineName || item.medicine?.name || 'Medicine')}</h3><p>${escapeHtml([item.genericName, item.brand].filter(Boolean).join(' · ') || 'Medicine details')}</p></div><span class="nurse-prescription-given ${administered ? 'has-given' : ''}">${administered ? `Administered ${administered}${remaining !== null ? ` · ${remaining} remaining` : ''}` : 'Awaiting'}</span></div>
            <div class="nurse-medication-details">${[['Dose', item.dosage], ['Frequency', item.frequency], ['Route', item.route], ['Duration', item.durationDays ? `${item.durationDays} days` : '']].filter(([, value]) => value).map(([label, value]) => `<span><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`).join('')}</div>
            ${item.instructions || item.foodTiming ? `<p><b>Instructions:</b> ${recordText([item.instructions, item.foodTiming].filter(Boolean).join(' · '))}</p>` : ''}
            <div class="nurse-stock-line"><span>${item.quantity !== null && item.quantity !== undefined ? `Prescribed quantity: ${escapeHtml(item.quantity)}` : 'Quantity not specified'}</span>${stock !== null ? `<span class="${stock <= 5 ? 'low-stock' : ''}">Available stock: <b>${escapeHtml(stock)}</b></span>` : ''}</div>
            ${dispensed ? `<p class="nurse-prescription-note">Pharmacy dispensed: ${dispensed} unit${dispensed === 1 ? '' : 's'}; this is separate from nurse administration.</p>` : ''}
            ${(order?.administrations || item.administrations || []).length ? `<div class="nurse-prescription-history">${(order?.administrations || item.administrations).map((entry) => `<span>${escapeHtml(formatDate(String(entry.administeredAt || entry.createdAt || '').slice(0, 10)))} · ${escapeHtml(entry.status)}${Number(entry.quantity || 0) ? ` · ${escapeHtml(entry.quantity)} given` : ''}${entry.reason ? ` · ${escapeHtml(entry.reason)}` : ''}</span>`).join('')}</div>` : ''}
            ${!item.medicineId ? '<p class="nurse-prescription-note">No linked clinic inventory item; nursing outcomes can be recorded, but no stock will be deducted.</p>' : ''}
            ${canGive ? `<button type="button" class="button button-primary button-small" data-nurse-record-administration="${escapeHtml(order?.id || item.id)}" data-medication-id="${escapeHtml(item.id)}" data-patient-id="${escapeHtml(patient.id)}" data-queue-token-id="${escapeHtml(activeEntry.id)}" data-prescribed-quantity="${escapeHtml(remaining ?? '')}" data-medicine-name="${escapeHtml(item.name || item.medicineName || 'Medicine')}">Record administration</button>` : !canAdministerMedication() ? '' : remaining !== null && remaining <= 0 ? '<p class="nurse-prescription-note">The prescribed quantity has been completed.</p>' : order?.status === 'CANCELLED' ? '<p class="nurse-prescription-note">This order was superseded by a newer prescription.</p>' : expired ? '<p class="nurse-prescription-note">This medicine is expired and cannot be administered.</p>' : linkedInventoryUnavailable ? '<p class="nurse-prescription-note">The linked clinic medicine is inactive or unavailable.</p>' : stock === 0 ? '<p class="nurse-prescription-note">No stock is available for this medicine.</p>' : isApiConnected() && !order ? '<p class="nurse-prescription-note">The nursing order is not synced yet. Refresh this visit to retry.</p>' : ''}
          </article>`;
        }).join('')}</div>` : '<div class="empty-state"><span>✚</span><b>No medicines or injections in this prescription</b><p>Non-medication advice is available on the doctor’s prescription.</p></div>'}
        ${latestVersion?.followUpInstructions ? `<div class="nurse-prescription-follow-up"><b>Follow-up / advice</b><p>${recordText(latestVersion.followUpInstructions)}</p></div>` : ''}
        ${isApiConnected() && activeEntry.encounterId ? `<div class="nurse-prescription-follow-up"><b>Visit billing</b><p>Preview and generate one invoice from completed nursing administrations and billable orders.</p><button type="button" class="button button-primary button-small" data-preview-visit-bill="${escapeHtml(activeEntry.encounterId)}">Generate patient bill</button></div>` : ''}
      </section>`;
  }

  document.getElementById('nurseQueueSearch').addEventListener('input', renderNurseWorkspace);

  function updateMedicationAdministrationFields() {
    const form = document.getElementById('medicationAdministrationForm');
    const status = form.elements.namedItem('status').value;
    const requiresQuantity = ['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(status);
    const requiresReason = ['HELD', 'MISSED', 'REFUSED'].includes(status);
    const quantity = form.elements.namedItem('quantity');
    const reason = form.elements.namedItem('reason');
    document.getElementById('medicationAdministrationQuantityField').classList.toggle('hidden', !requiresQuantity);
    document.getElementById('medicationAdministrationReasonField').classList.toggle('hidden', !requiresReason);
    quantity.required = requiresQuantity;
    quantity.disabled = !requiresQuantity;
    reason.required = requiresReason;
  }

  function openMedicationAdministration(button) {
    if (!canAdministerMedication()) {
      showToast('Your account does not have permission to record medication administration.');
      return;
    }
    const form = document.getElementById('medicationAdministrationForm');
    form.reset();
    form.elements.namedItem('orderId').value = button.dataset.nurseRecordAdministration;
    form.elements.namedItem('medicationId').value = button.dataset.medicationId;
    form.elements.namedItem('patientId').value = button.dataset.patientId;
    form.elements.namedItem('queueTokenId').value = button.dataset.queueTokenId;
    form.elements.namedItem('quantity').value = '1';
    form.elements.namedItem('quantity').max = button.dataset.prescribedQuantity || '10000';
    document.getElementById('medicationAdministrationContext').textContent =
      `${button.dataset.medicineName || 'Medication'} · one confirmed administration or outcome`;
    updateMedicationAdministrationFields();
    openModal('medicationAdministrationModal');
  }

  async function saveMedicationAdministration(event) {
    event.preventDefault();
    if (!canAdministerMedication()) {
      showToast('Your account does not have permission to record medication administration.');
      return;
    }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const status = String(fields.get('status') || '');
    const quantity = ['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(status)
      ? Number(fields.get('quantity'))
      : 0;
    const reason = String(fields.get('reason') || '').trim();
    if (['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(status)
      && (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(form.elements.namedItem('quantity').max || 10000))) {
      showToast('Enter the actual whole-number quantity administered within the remaining prescribed amount.');
      return;
    }
    if (['HELD', 'MISSED', 'REFUSED'].includes(status) && reason.length < 3) {
      showToast('Enter a reason for holding or not giving this medication.');
      return;
    }

    const orderId = String(fields.get('orderId') || '');
    const medicationId = String(fields.get('medicationId') || '');
    const patientId = String(fields.get('patientId') || '');
    const queueTokenId = String(fields.get('queueTokenId') || '');
    const payload = {
      status,
      quantity,
      ...(reason ? { reason } : {}),
      notes: String(fields.get('notes') || '').trim(),
      idempotencyKey: window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : makeId('admin-record'),
    };
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      if (isApiConnected()) {
        await apiRequest(`/nursing/orders/${encodeURIComponent(orderId)}/administrations`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        closeModal(document.getElementById('medicationAdministrationModal'));
        await openNurseQueuePatient(queueTokenId);
      } else {
        const medication = data.patientRecords
          .filter((record) => record.patientId === patientId)
          .flatMap((record) => record.prescriptionVersions || [])
          .flatMap((version) => version.medications || [])
          .find((item) => item.id === medicationId);
        if (!medication) throw new Error('The prescription medicine was not found. Refresh the visit and retry.');
        const fulfilled = getPrescriptionMedicationFulfilledQuantity(medication);
        if (quantity > 0 && medication.quantity != null && quantity > Number(medication.quantity) - fulfilled) {
          throw new Error(`Only ${Math.max(0, Number(medication.quantity) - fulfilled)} prescribed units remain.`);
        }
        let stockMovement = null;
        const medicine = medication.medicineId
          ? data.medicines.find((entry) => entry.id === medication.medicineId)
          : null;
        if (quantity > 0 && medicine) {
          if (medicine.expiry && medicine.expiry < dateKey(today)) {
            throw new Error(`${medicine.name} is expired and cannot be administered.`);
          }
          if (Number(medicine.quantity) < quantity) throw new Error(`Insufficient stock for ${medicine.name}.`);
          const quantityBefore = Number(medicine.quantity);
          medicine.quantity = quantityBefore - quantity;
          stockMovement = {
            id: makeId('movement'),
            kind: 'medicine',
            itemId: medicine.id,
            type: 'DISPENSED',
            quantityDelta: -quantity,
            quantityBefore,
            quantityAfter: medicine.quantity,
            reason: `Nurse administration for encounter ${activeNurseQueueTokenId}`,
            createdAt: new Date().toISOString(),
            recordedBy: getStoredApiUser()?.email || 'Demo clinic staff',
          };
          data.inventoryMovements.push(stockMovement);
        }
        medication.administrations = medication.administrations || [];
        medication.administrations.push({
          id: makeId('administration'),
          status,
          quantity,
          reason,
          notes: String(fields.get('notes') || '').trim(),
          stockMovementId: stockMovement?.id || null,
          createdAt: new Date().toISOString(),
        });
        save();
        closeModal(document.getElementById('medicationAdministrationModal'));
        renderNurseWorkspace();
        renderMedicines();
        renderReports();
      }
      showToast(status === 'ADMINISTERED' || status === 'PARTIALLY_ADMINISTERED'
        ? 'Nursing administration recorded; linked stock was updated.'
        : 'Medication outcome recorded.');
    } catch (error) {
      console.error('Unable to record medication administration.', error);
      showToast(error.message || 'Unable to record medication administration.');
    } finally {
      submitButton.disabled = false;
    }
  }

  document.getElementById('medicationAdministrationForm')
    .addEventListener('submit', saveMedicationAdministration);
  document.getElementById('medicationAdministrationForm').elements.namedItem('status')
    .addEventListener('change', updateMedicationAdministrationFields);

  async function openNurseQueuePatient(queueTokenId) {
    const entry = getNurseQueueEntries().find((item) => item.id === queueTokenId);
    if (!entry) return;
    activeNurseQueueTokenId = entry.id;
    nurseEncounterOrders = [];
    nursePrescriptionLoading = isApiConnected();
    nursePrescriptionError = '';
    renderNurseWorkspace();
    if (!isApiConnected()) return;
    try {
      const records = await apiRequest(`/patients/${encodeURIComponent(entry.patientId)}/records`);
      if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid clinical history.');
      data.patientRecords = data.patientRecords.filter((record) => record.patientId !== entry.patientId)
        .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId: entry.patientId })));
      if (entry.encounterId) {
        try {
          const orders = await apiRequest(`/nursing/encounters/${encodeURIComponent(entry.encounterId)}/sync`, {
            method: 'POST',
            body: '{}',
          });
          nurseEncounterOrders = Array.isArray(orders) ? orders : [];
        } catch (error) {
          if (!String(error?.message || '').includes('prescription')) {
            throw error;
          }
          const orders = await apiRequest(`/nursing/encounters/${encodeURIComponent(entry.encounterId)}`);
          nurseEncounterOrders = Array.isArray(orders) ? orders : [];
        }
      }
    } catch (error) {
      console.error('Unable to load nurse prescription.', error);
      nursePrescriptionError = error.message || 'Unable to load this visit’s prescription.';
      showToast(nursePrescriptionError);
    } finally {
      nursePrescriptionLoading = false;
      renderNurseWorkspace();
    }
  }

  async function openDoctorQueuePatient(queueTokenId) {
    const entry = getDoctorQueueEntries().find((item) => item.id === queueTokenId);
    if (!entry) return;
    activeDoctorQueueTokenId = entry.id;
    activeDoctorWorkspaceTab = 'overview';
    activeDoctorPatientHistory = null;
    activeDoctorVitals = [];
    if (!isApiConnected()) {
      activeDoctorPatientHistory = data.patientHistoryRecords.find((history) => history.patientId === entry.patientId) || null;
      activeDoctorVitals = data.patientVitals
        .filter((record) => record.patientId === entry.patientId)
        .map(normalizePatientVitalsRecord);
      renderDoctorWorkspace();
      return;
    }
    renderDoctorWorkspace();
    try {
      const [patientResult, records, history, vitals, externalRecords, intake] = await Promise.all([
        apiRequest(`/patients/${encodeURIComponent(entry.patientId)}`),
        apiRequest(`/patients/${encodeURIComponent(entry.patientId)}/records`),
        apiRequest(`/patients/${encodeURIComponent(entry.patientId)}/history`),
        apiRequest(`/patients/${encodeURIComponent(entry.patientId)}/vitals`),
        apiRequest(`/patients/${encodeURIComponent(entry.patientId)}/external-records`),
        apiRequest(`/nursing/queue/${encodeURIComponent(entry.id)}/intake`),
      ]);
      if (!Array.isArray(records) || !Array.isArray(vitals)) {
        throw new Error('The clinic API returned an invalid doctor patient record.');
      }
      if (!Array.isArray(externalRecords)) {
        throw new Error('The clinic API returned an invalid outside-provider history.');
      }
      if (!history || !Array.isArray(history.medicalConditions) || !Array.isArray(history.familyHistoryMembers)) {
        throw new Error('The clinic API returned an invalid doctor patient history.');
      }
      const patient = normalizeApiPatient(patientResult);
      data.patients = data.patients.map((item) => item.id === patient.id ? { ...item, ...patient } : item);
      data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patient.id)
        .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId: patient.id })));
      data.externalMedicalRecords = data.externalMedicalRecords.filter((record) => record.patientId !== patient.id)
        .concat(externalRecords.map((record) => normalizeApiExternalMedicalRecord({ ...record, patientId: patient.id })));
      data.patientIntakes = data.patientIntakes.filter((record) => record.queueTokenId !== entry.id);
      if (intake) data.patientIntakes.push({ ...intake, patientId: patient.id, queueTokenId: entry.id });
      activeDoctorPatientHistory = history;
      activeDoctorVitals = vitals.map(normalizePatientVitalsRecord);
      renderDoctorWorkspace();
    } catch (error) {
      console.error('Unable to load doctor patient chart.', error);
      showToast(error.message || 'Unable to load doctor patient chart.');
    }
  }

  async function openCheckInModal(patientId = '', appointmentId = '') {
    if (!canManagePatientData()) {
      showToast('Your account does not have permission to check in patients.');
      return;
    }
    const form = document.getElementById('checkInForm');
    form.reset();
    const patientSelect = document.getElementById('checkInPatient');
    form.elements.namedItem('department').value = 'General medicine';
    patientSelect.innerHTML = '<option value="">Select patient</option>' + data.patients
      .filter((patient) => patient.status !== 'Inactive')
      .map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(`${patient.code} · ${patient.name} · ${patient.phone}`)}</option>`)
      .join('');
    document.getElementById('checkInPatientSearch').value = '';
    const appointment = appointmentId
      ? data.appointments.find((item) => item.id === appointmentId)
      : null;
    form.elements.namedItem('appointmentId').value = appointment?.id || '';
    form.elements.namedItem('patientId').value = patientId || appointment?.patientId || '';
    form.elements.namedItem('reason').value = appointment?.reason || '';
    form.elements.namedItem('encounterType').value = 'OPD';
    form.elements.namedItem('priority').value = 'NORMAL';
    form.elements.namedItem('department').value = appointment?.department || 'General medicine';
    document.getElementById('checkInPatientSearch').value = patientId || appointment?.patientId
      ? (() => {
        const patient = patientById(patientId || appointment?.patientId);
        return patient ? `${patient.code} · ${patient.name} · ${patient.phone}` : '';
      })()
      : '';

    const doctorSelect = document.getElementById('checkInDoctor');
    if (isApiConnected()) {
      doctorSelect.innerHTML = '<option value="">Loading doctors...</option>';
      try {
        const doctors = await apiRequest('/appointments/doctors');
        doctorSelect.innerHTML = '<option value="">Select doctor</option>' + doctors
          .map((doctor) => `<option value="${escapeHtml(doctor.id)}">${escapeHtml(doctor.email)}</option>`)
          .join('');
        if (!doctors.length) doctorSelect.innerHTML = '<option value="">No active doctors configured</option>';
        doctorSelect.value = appointment?.doctorId || '';
      } catch (error) {
        doctorSelect.innerHTML = '<option value="">Unable to load doctors</option>';
        showToast(error.message || 'Unable to load doctors.');
        return;
      }
    } else {
      const doctors = [...new Set(data.appointments.map((item) => item.doctor).filter(Boolean))];
      const fallbackDoctor = data.settings.practitioner || '';
      if (fallbackDoctor && !doctors.includes(fallbackDoctor)) doctors.unshift(fallbackDoctor);
      doctorSelect.innerHTML = '<option value="">Select doctor</option>' + doctors
        .map((doctor) => `<option value="${escapeHtml(doctor)}">${escapeHtml(doctor)}</option>`)
        .join('');
      doctorSelect.value = appointment?.doctor || fallbackDoctor;
    }
    updateCheckInVitalsPreview();
    openModal('checkInModal');
  }

  function filterCheckInPatients() {
    const form = document.getElementById('checkInForm');
    const search = document.getElementById('checkInPatientSearch').value.trim().toLowerCase();
    const selectedBefore = form.elements.namedItem('patientId').value;
    const patients = data.patients.filter((patient) => patient.status !== 'Inactive')
      .filter((patient) => !search
        || `${patient.code} ${patient.id} ${patient.name} ${patient.phone}`.toLowerCase().includes(search));
    const select = form.elements.namedItem('patientId');
    select.innerHTML = '<option value="">Select patient</option>' + patients
      .map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(`${patient.code} · ${patient.name} · ${patient.phone}`)}</option>`)
      .join('');
    select.value = patients.some((patient) => patient.id === selectedBefore) ? selectedBefore : '';
    updateCheckInVitalsPreview();
  }

  async function updateQueueEntry(queueTokenId, status) {
    const queueEntry = (data.queueTokens || []).find((item) => item.id === queueTokenId);
    if (!queueEntry) {
      showToast('Queue entry not found. Refresh the queue and retry.');
      return;
    }
    if (isApiConnected()) {
      await apiRequest(`/appointments/queue/${encodeURIComponent(queueTokenId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await refreshLiveData();
      await refreshDoctorDashboard();
    } else {
      queueEntry.status = status;
      const appointment = data.appointments.find((item) => item.id === queueEntry.appointmentId);
      if (appointment) {
        appointment.status = status === 'IN_CONSULTATION'
          ? 'In progress'
          : status === 'COMPLETED'
            ? 'Completed'
            : status === 'CANCELLED'
              ? 'Cancelled'
              : status === 'NO_SHOW'
                ? 'No-show'
              : appointment.status;
      }
      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
        const encounter = data.patientRecords.find((item) => item.id === queueEntry.encounterId);
        if (encounter) encounter.status = 'CLOSED';
      }
      save();
      renderAll();
    }
  }

  async function startQueueConsultation(queueTokenId) {
    const queueEntry = (data.queueTokens || []).find((item) => item.id === queueTokenId);
    if (!queueEntry?.encounterId) {
      showToast('Visit ID is unavailable. Refresh the queue and retry.');
      return;
    }
    activeDoctorQueueTokenId = queueEntry.id;
    showView('doctor');
    await updateQueueEntry(queueTokenId, 'IN_CONSULTATION');
    renderDoctorWorkspace();
    openConsultationPrescriptionEditor(queueEntry.patientId, '', null, queueEntry.encounterId);
  }

  function medicineStatus(medicine) {
    if (medicine.expiry && medicine.expiry < dateKey(today)) return 'Expired';
    if (Number(medicine.quantity) <= Number(medicine.reorder)) return 'Low stock';
    if (medicine.expiry && medicine.expiry <= shiftDate(45)) return 'Expiring soon';
    return 'In stock';
  }
  function renderMedicines() {
    const doctorReadOnly = WORKSPACE_MODE === 'doctor';
    const pharmacyView = document.getElementById('pharmacy');
    pharmacyView.classList.toggle('doctor-medicines-view', doctorReadOnly);
    document.getElementById('addMedicineButton').classList.toggle('hidden', doctorReadOnly);
    pharmacyView.querySelector('.pharmacy-inventory .page-heading .eyebrow').textContent = doctorReadOnly ? 'DOCTOR MEDICINES' : 'PHARMACY INVENTORY';
    pharmacyView.querySelector('.pharmacy-inventory .page-heading h1').textContent = doctorReadOnly ? 'Medicines' : 'Inventory & Stock';
    pharmacyView.querySelector('.pharmacy-inventory .page-heading .muted').textContent = doctorReadOnly
      ? 'Read-only clinic medicine list for use during patient consultations.'
      : 'Add medicines, track quantities, prices and expiry dates.';
    pharmacyView.querySelector('.pharmacy-inventory .table-toolbar h2').textContent = doctorReadOnly ? 'Clinic medicines' : 'Medicine inventory';
    pharmacyView.querySelector('.pharmacy-inventory .table-toolbar p').textContent = doctorReadOnly
      ? 'Check medicine names, batches, expiry dates and available quantities.'
      : 'Use stock controls when medicines arrive or are dispensed.';
    pharmacyView.querySelector('.pharmacy-inventory .stats-grid .stat-card:nth-child(3)').classList.toggle('hidden', doctorReadOnly);
    const query = document.getElementById('medicineSearch').value.trim().toLowerCase();
    const filter = document.getElementById('medicineStockFilter').value;
    const sorted = [...data.medicines].sort((a, b) => a.name.localeCompare(b.name));
    const rows = sorted.filter((medicine) => {
      const matchesText = `${medicine.name} ${medicine.category} ${medicine.batch}`.toLowerCase().includes(query);
      const status = medicineStatus(medicine);
      const matchesFilter = !filter || (filter === 'low' && status === 'Low stock') || (filter === 'expired' && (status === 'Expired' || status === 'Expiring soon'));
      return matchesText && matchesFilter;
    });
    document.getElementById('medicineCount').textContent = data.medicines.length;
    document.getElementById('medicineLowCount').textContent = data.medicines.filter((item) => Number(item.quantity) <= Number(item.reorder)).length;
    document.getElementById('inventoryValue').textContent = money(data.medicines.reduce((sum, item) => sum + Number(item.quantity) * Number(item.cost), 0));
    document.getElementById('medicinesEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('medicinesTable').innerHTML = rows.map((medicine) => {
      const status = medicineStatus(medicine);
      const className = status === 'In stock' ? '' : status === 'Low stock' ? 'low' : 'expired';
      const actions = doctorReadOnly ? '' : `<span class="row-actions"><button class="action-button" data-stock-medicine="${escapeHtml(medicine.id)}" data-stock-delta="1">＋ Stock</button><button class="action-button" data-edit-medicine="${escapeHtml(medicine.id)}">Edit</button><button class="action-button" data-medicine-history="${escapeHtml(medicine.id)}">History</button></span>`;
      return `<tr><td><span class="patient-cell"><span class="medicine-icon">✚</span><span><b>${escapeHtml(medicine.name)}</b><small>${escapeHtml([medicine.brand, medicine.productSize, medicine.category || 'Uncategorized'].filter(Boolean).join(' · '))}</small></span></span></td><td>${escapeHtml(medicine.category || '—')}</td><td>${escapeHtml(medicine.batch || '—')}<br><small>${escapeHtml(formatDate(medicine.expiry))}</small></td><td><b>${Number(medicine.quantity)}</b> units</td><td>${doctorReadOnly ? '—' : `${Number(medicine.reorder)} units`}</td><td>${doctorReadOnly ? '—' : money(medicine.price)}</td><td><span class="status-pill ${className}">${escapeHtml(status)}</span></td><td>${actions}</td></tr>`;
    }).join('');
  }

  function setPharmacyTab(tab) {
    const activeTab = WORKSPACE_MODE === 'doctor' ? 'inventory' : tab;
    const tabPanels = {
      dashboard: 'pharmacyDashboard',
      pos: 'pharmacyPos',
      sales: 'pharmacySales',
      orders: 'pharmacyOrders',
      purchases: 'pharmacyPurchases',
      inventory: 'pharmacyInventory',
      profit: 'pharmacyProfit',
      reports: 'pharmacyReports',
    };
    if (!tabPanels[activeTab]) return;
    document.querySelectorAll('#pharmacy [data-pharmacy-tab]').forEach((button) => {
      const selected = button.dataset.pharmacyTab === activeTab;
      button.classList.toggle('active', selected);
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(selected));
    });
    Object.entries(tabPanels).forEach(([key, panelId]) => {
      document.getElementById(panelId).classList.toggle('hidden', key !== activeTab);
    });
    if (activeTab === 'inventory') renderMedicines();
    if (activeTab === 'dashboard') renderPharmacyDashboard();
    if (activeTab === 'sales') renderPharmacySales();
    if (activeTab === 'profit') renderPharmacyProfit();
    if (activeTab === 'orders') renderPharmacyOrders();
    if (activeTab === 'purchases') renderPharmacyPurchases();
    if (activeTab === 'pos') renderPharmacyPos();
  }

  function resolvePharmacyPosPatient(query) {
    const value = String(query || '').trim().toLowerCase();
    if (!value) return null;
    return data.patients.find((patient) =>
      [patient.name, patient.code, patient.phone, `${patient.name} · ${patient.code}`]
        .some((candidate) => String(candidate || '').trim().toLowerCase() === value)
    ) || null;
  }

  function billedEncounterMedicineQuantity(patientId, encounterId, medicineId) {
    return (data.invoices || [])
      .filter((invoice) => invoice.patientId === patientId && invoice.encounterId === encounterId)
      .flatMap((invoice) => invoice.items || [])
      .filter((item) => item.medicineId === medicineId)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function getPrescriptionMedicationFulfilledQuantity(item) {
    const dispensed = (item.dispenses || []).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const records = item.administrations?.length
      ? item.administrations
      : (item.nursingOrders || []).flatMap((order) => order.administrations || []);
    const administered = records
      .filter((entry) => ['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(entry.status))
      .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const billed = (data.invoices || [])
      .flatMap((invoice) => invoice.items || [])
      .filter((line) => line.prescriptionMedicationId === item.id)
      .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    return dispensed + administered + billed;
  }

  function getNurseMedicationProgress(item) {
    const order = nurseEncounterOrders.find((entry) => entry.prescriptionMedicationId === item.id);
    const records = order?.administrations?.length
      ? order.administrations
      : item.administrations?.length
        ? item.administrations
        : (item.nursingOrders || []).flatMap((entry) => entry.administrations || []);
    const administered = records
      .filter((entry) => ['ADMINISTERED', 'PARTIALLY_ADMINISTERED'].includes(entry.status))
      .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const dispensed = (item.dispenses || []).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const billed = (data.invoices || [])
      .flatMap((invoice) => invoice.items || [])
      .filter((line) => line.prescriptionMedicationId === item.id)
      .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    const quantity = item.quantity === null || item.quantity === undefined
      ? null
      : Number(item.quantity);
    return {
      order,
      administered,
      dispensed,
      remaining: quantity === null ? null : Math.max(0, quantity - administered - dispensed - billed),
    };
  }

  function buildPharmacyPosItems(row) {
    const sourceItems = row.legacyItems.length
      ? row.legacyItems.map((item) => ({ ...item, name: item.medicineName || item.medicine?.name || 'Medicine' }))
      : row.medications;
    const skipped = [];
    const items = sourceItems.map((item) => {
      const name = item.brand || item.name || item.medicineName || 'Medicine';
      const medicine = data.medicines.find((entry) => entry.id === item.medicineId)
        || data.medicines.find((entry) => String(entry.name || '').trim().toLowerCase() === String(name).trim().toLowerCase());
      const clinicService = !medicine && row.version
        ? data.clinicServices.find((service) =>
          service.active !== false &&
          String(service.name || '').trim().toLowerCase() === String(item.name || item.medicineName || '').trim().toLowerCase())
        : null;
      if ((!medicine || medicine.active === false) && !clinicService) {
        skipped.push(`${name} needs active inventory or a configured service price`);
        return null;
      }
      if (medicine?.expiry && medicine.expiry < dateKey(today)) {
        skipped.push(`${medicine.name} is expired`);
        return null;
      }
      const prescribed = Math.max(1, Number(item.quantity) || 1);
      const alreadyBilled = row.version
        ? Math.max(
          getPrescriptionMedicationFulfilledQuantity(item),
          medicine ? billedEncounterMedicineQuantity(row.patientId, row.record.id, medicine.id) : 0,
        )
        : Number(item.billedQuantity || 0);
      const remaining = Math.max(0, prescribed - alreadyBilled);
      const available = clinicService
        ? remaining
        : Math.max(0, Number(medicine.quantity) || 0);
      const quantity = Math.min(remaining, available);
      if (quantity < 1) {
        skipped.push(available < 1 ? `${medicine?.name || name} is out of stock` : `${medicine?.name || name} is already fully billed or administered`);
        return null;
      }
      if (quantity < remaining) skipped.push(`${medicine?.name || name} quantity limited to ${quantity} available units`);
      return {
        ...(medicine ? { medicineId: medicine.id } : {}),
        ...(clinicService ? { customServiceId: clinicService.id } : {}),
        name: medicine?.name || item.name || item.medicineName || 'Medicine',
        batch: medicine?.batch || '',
        expiry: medicine?.expiry || '',
        quantity,
        maxQuantity: Math.min(remaining, available),
        price: Number(medicine?.price ?? clinicService?.price) || 0,
        ...(item.id && !row.version ? {
          prescriptionItemId: item.id,
          prescriptionDosage: item.dosage || '',
          prescriptionFrequency: item.frequency || '',
          prescriptionDurationDays: item.durationDays || '',
          prescriptionInstructions: item.instructions || '',
        } : {}),
        ...(item.id && row.version ? { prescriptionMedicationId: item.id } : {}),
      };
    }).filter(Boolean);
    return { items, skipped };
  }

  function openPharmacyPosForPrescription(row) {
    const { items, skipped } = buildPharmacyPosItems(row);
    pharmacyPosPrescription = row;
    pharmacyPosPatientId = row.patientId;
    pharmacyPosCart = items;
    pharmacyPosPayment = 'Cash';
    pharmacyPosDiscount = 0;
    showView('pharmacy');
    setPharmacyTab('pos');
    renderPharmacyPos(skipped);
  }

  function renderPharmacyPos(skipped = []) {
    const patientSearch = document.getElementById('pharmacyPosPatientSearch');
    if (!patientSearch) return;
    const patient = patientById(pharmacyPosPatientId);
    const patientOptions = document.getElementById('pharmacyPosPatientOptions');
    patientOptions.innerHTML = data.patients.map((item) =>
      `<option value="${escapeHtml(`${item.name} · ${item.code}`)}">${escapeHtml(item.phone || '')}</option>`
    ).join('');
    if (patient && document.activeElement !== patientSearch) {
      patientSearch.value = `${patient.name} · ${patient.code}`;
    }

    const patientSummary = document.getElementById('pharmacyPosPatientSummary');
    patientSummary.classList.toggle('hidden', !patient);
    patientSummary.textContent = patient ? `${patient.name} · ${patient.code} · ${patient.phone || 'No mobile recorded'}` : '';
    const rxNote = document.getElementById('pharmacyPosPrescriptionNote');
    const rxParts = [];
    if (pharmacyPosPrescription) {
      rxParts.push(`Loaded ${pharmacyPosCart.length} item(s) from Rx (${formatDate(pharmacyPosPrescription.date)})`);
      if (skipped.length) rxParts.push(skipped.join(' · '));
    } else {
      rxParts.push(patient ? 'Patient selected. Add medicines or load the latest prescription.' : 'Select a registered patient to create an invoice.');
    }
    rxNote.textContent = rxParts.join(' · ');
    rxNote.classList.remove('hidden');

    document.getElementById('pharmacyPosInvoiceDate').textContent =
      `New sale · ${formatDate(dateKey(today))}`;
    document.getElementById('pharmacyPosClinicTag').textContent = data.settings.clinicName || 'CSK CLINIC';
    document.getElementById('pharmacyPosEmpty').classList.toggle('hidden', pharmacyPosCart.length > 0);
    document.getElementById('pharmacyPosItemsTable').innerHTML = pharmacyPosCart.map((item, index) => `<tr>
      <td><b>${escapeHtml(item.name)}</b><small>${escapeHtml([item.prescriptionDosage, item.prescriptionFrequency].filter(Boolean).join(' · ') || `${item.maxQuantity} units available`)}</small></td>
      <td>${escapeHtml(item.batch || '—')}<small>${escapeHtml(item.expiry ? formatDate(item.expiry) : '—')}</small></td>
      <td><div class="pharmacy-pos-quantity"><button type="button" aria-label="Decrease ${escapeHtml(item.name)} quantity" data-pos-qty-step="${index}" data-step="-1">−</button><input type="number" min="1" max="${item.maxQuantity}" value="${item.quantity}" aria-label="${escapeHtml(item.name)} quantity" data-pos-quantity="${index}" /><button type="button" aria-label="Increase ${escapeHtml(item.name)} quantity" data-pos-qty-step="${index}" data-step="1">+</button></div></td>
      <td>${money(item.price)}</td><td><b>${money(item.price * item.quantity)}</b></td>
      <td><button type="button" class="remove-line" aria-label="Remove ${escapeHtml(item.name)}" data-pos-remove-item="${index}">×</button></td>
    </tr>`).join('');
    document.getElementById('pharmacyPosItemCount').textContent =
      `${pharmacyPosCart.length} line${pharmacyPosCart.length === 1 ? '' : 's'} · ${pharmacyPosCart.reduce((sum, item) => sum + item.quantity, 0)} units`;
    document.getElementById('pharmacyPosDiscount').value = String(pharmacyPosDiscount);
    document.querySelectorAll('[data-pos-payment]').forEach((button) => {
      const selected = button.dataset.posPayment === pharmacyPosPayment;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updatePharmacyPosTotals();
  }

  function updatePharmacyPosTotals() {
    const subtotal = pharmacyPosCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountInput = document.getElementById('pharmacyPosDiscount');
    pharmacyPosDiscount = Math.min(subtotal, Math.max(0, Number(discountInput.value) || 0));
    if (Number(discountInput.value) !== pharmacyPosDiscount) discountInput.value = String(pharmacyPosDiscount);
    const total = Math.max(0, subtotal - pharmacyPosDiscount);
    document.getElementById('pharmacyPosSubtotal').textContent = money(subtotal);
    document.getElementById('pharmacyPosGrandTotal').textContent = money(total);
    const collectButton = document.getElementById('pharmacyPosCollect');
    collectButton.textContent = `Collect ${money(total)} & Print Bill`;
    collectButton.disabled = !pharmacyPosPatientId || !pharmacyPosCart.length || !canCreateInvoices();
  }

  function renderPharmacyPosMedicineSuggestions() {
    const input = document.getElementById('pharmacyPosMedicineSearch');
    const host = document.getElementById('pharmacyPosMedicineSuggestions');
    const query = input.value.trim().toLowerCase();
    const matches = data.medicines.filter((medicine) =>
      medicine.active !== false
      && Number(medicine.quantity) > 0
      && (!medicine.expiry || medicine.expiry >= dateKey(today))
      && (!query || `${medicine.name} ${medicine.brand || ''} ${medicine.category || ''}`.toLowerCase().includes(query))
    ).slice(0, 8);
    host.innerHTML = matches.map((medicine) => `<button type="button" data-pos-add-medicine="${escapeHtml(medicine.id)}">
      <span>${escapeHtml(medicine.name)}<small>${escapeHtml(medicine.category || 'Medicine')} · ${Number(medicine.quantity)} in stock</small></span><b>${money(medicine.price)}</b>
    </button>`).join('');
    host.classList.toggle('hidden', !matches.length);
  }

  function addPharmacyPosMedicine(medicineId) {
    const medicine = data.medicines.find((item) => item.id === medicineId && item.active !== false);
    if (!medicine || Number(medicine.quantity) < 1) {
      showToast('This medicine is not currently available in stock.');
      return;
    }
    const existing = pharmacyPosCart.find((item) => item.medicineId === medicine.id);
    if (existing) existing.quantity = Math.min(existing.maxQuantity, existing.quantity + 1);
    else pharmacyPosCart.push({
      medicineId: medicine.id,
      name: medicine.name,
      batch: medicine.batch || '',
      expiry: medicine.expiry || '',
      quantity: 1,
      maxQuantity: Number(medicine.quantity),
      price: Number(medicine.price) || 0,
    });
    document.getElementById('pharmacyPosMedicineSearch').value = '';
    document.getElementById('pharmacyPosMedicineSuggestions').classList.add('hidden');
    renderPharmacyPos();
  }

  function loadLatestPharmacyPrescription() {
    const patientSearch = document.getElementById('pharmacyPosPatientSearch');
    const patient = patientById(pharmacyPosPatientId) || resolvePharmacyPosPatient(patientSearch.value);
    if (!patient) {
      showToast('Select a registered patient before loading a prescription.');
      return;
    }
    pharmacyPosPatientId = patient.id;
    const row = getPrescriptionListRows().find((item) =>
      item.patientId === patient.id && prescriptionRowMedicines(item).length > 0
    );
    if (!row) {
      pharmacyPosPrescription = null;
      pharmacyPosCart = [];
      renderPharmacyPos();
      showToast('No medicine prescription was found for this patient.');
      return;
    }
    openPharmacyPosForPrescription(row);
  }

  function collectPharmacyPosBill() {
    if (!canCreateInvoices()) {
      showToast('Your account does not have permission to create invoices.');
      return;
    }
    const patient = patientById(pharmacyPosPatientId);
    if (!patient) {
      showToast('Select a registered patient before creating an invoice.');
      return;
    }
    if (!pharmacyPosCart.length) {
      showToast('Add at least one in-stock medicine to the bill.');
      return;
    }
    const items = pharmacyPosCart.map((item) => ({
      ...(item.medicineId ? { medicineId: item.medicineId } : {}),
      ...(item.customServiceId ? { serviceId: item.customServiceId } : {}),
      quantity: item.quantity,
      price: item.price,
      ...(item.prescriptionMedicationId ? { prescriptionMedicationId: item.prescriptionMedicationId } : {}),
      ...(item.prescriptionItemId ? {
        prescriptionItemId: item.prescriptionItemId,
        prescriptionDosage: item.prescriptionDosage,
        prescriptionFrequency: item.prescriptionFrequency,
        prescriptionDurationDays: item.prescriptionDurationDays,
        prescriptionInstructions: item.prescriptionInstructions,
      } : {}),
    }));
    const total = Math.max(0, pharmacyPosCart.reduce((sum, item) => sum + item.price * item.quantity, 0) - pharmacyPosDiscount);
    const encounterId = pharmacyPosPrescription?.record.id || '';
    const form = document.getElementById('invoiceForm');
    openInvoiceModal(patient.id, items, encounterId, false);
    form.elements.namedItem('discount').value = String(pharmacyPosDiscount);
    form.elements.namedItem('paid').value = String(total);
    form.elements.namedItem('paymentMethod').value = pharmacyPosPayment;
    form.elements.namedItem('notes').value = pharmacyPosPrescription
      ? `Prescription ${pharmacyPosPrescription.version ? `revision ${pharmacyPosPrescription.version.revision}` : 'items'} · ${formatDate(pharmacyPosPrescription.date)}`
      : 'Pharmacy point-of-sale invoice';
    calculateInvoice();
    form.requestSubmit();
  }

  function clearPharmacyPosCheckout() {
    pharmacyPosPrescription = null;
    pharmacyPosPatientId = '';
    pharmacyPosCart = [];
    pharmacyPosPayment = 'Cash';
    pharmacyPosDiscount = 0;
    document.getElementById('pharmacyPosPatientSearch').value = '';
    document.getElementById('pharmacyPosMedicineSearch').value = '';
    document.getElementById('pharmacyPosMedicineSuggestions').classList.add('hidden');
  }

  function canManagePharmacyOrders() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'PHARMACIST'].includes(getStoredApiUser()?.role);
  }

  function renderPharmacyOrders() {
    const orders = [...(data.pharmacyOrders || [])].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    const canManage = canManagePharmacyOrders();
    document.querySelector('[data-new-pharmacy-order]').classList.toggle('hidden', !canManage);
    document.getElementById('pharmacyOrdersEmpty').classList.toggle('hidden', orders.length > 0);
    document.getElementById('pharmacyOrdersTable').innerHTML = orders.map((order) => {
      const patient = patientById(order.patientId);
      const status = String(order.status || 'RECEIVED');
      const nextStatus = status === 'RECEIVED' ? 'CONFIRMED' : status === 'CONFIRMED' ? 'READY' : status === 'READY' ? 'COMPLETED' : '';
      const actionLabel = nextStatus === 'CONFIRMED' ? 'Confirm' : nextStatus === 'READY' ? 'Mark ready' : 'Complete';
      const actions = canManage && nextStatus
        ? `<button type="button" class="action-button" data-update-pharmacy-order="${escapeHtml(order.id)}" data-order-status="${nextStatus}">${actionLabel}</button><button type="button" class="action-button danger" data-update-pharmacy-order="${escapeHtml(order.id)}" data-order-status="CANCELLED">Cancel</button>`
        : '—';
      return `<tr><td><b>${escapeHtml(order.orderNumber || 'Order')}</b><small class="table-secondary">${escapeHtml(formatDate(String(order.createdAt || '').slice(0, 10)))}</small></td><td>${escapeHtml(patient?.name || 'Patient unavailable')}</td><td>${escapeHtml(order.channel || 'OTHER')}</td><td>${(order.items || []).map((line) => `${escapeHtml(line.medicine?.name || line.medicineName || 'Medicine')} × ${Number(line.quantity)}`).join('<br>')}</td><td>${money(order.total || 0)}</td><td><span class="status-pill ${status === 'CANCELLED' ? 'cancelled' : status === 'COMPLETED' ? '' : 'pending'}">${escapeHtml(status.replaceAll('_', ' ').toLowerCase())}</span></td><td><span class="row-actions">${actions}</span></td></tr>`;
    }).join('');
  }

  function renderPharmacyPurchases() {
    const suppliers = [...(data.suppliers || [])].sort((left, right) => String(left.name).localeCompare(String(right.name)));
    const orders = [...(data.purchaseOrders || [])].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    const canManage = canManagePharmacyOrders();
    document.querySelector('[data-new-supplier]').classList.toggle('hidden', !canManage);
    document.querySelector('[data-new-purchase-order]').classList.toggle('hidden', !canManage);
    document.getElementById('suppliersEmpty').classList.toggle('hidden', suppliers.length > 0);
    document.getElementById('purchaseOrdersEmpty').classList.toggle('hidden', orders.length > 0);
    document.getElementById('suppliersTable').innerHTML = suppliers.map((supplier) => {
      const orderCount = Number(supplier.orderCount ?? orders.filter((order) => order.supplierId === supplier.id).length);
      return `<tr><td><b>${escapeHtml(supplier.name)}</b><small class="table-secondary">${escapeHtml(supplier.taxId || '')}</small></td><td>${escapeHtml(supplier.contactName || '—')}</td><td>${escapeHtml(supplier.phone || '—')}</td><td>${orderCount}</td><td>${supplier.active ? 'Active' : 'Inactive'}</td><td><button type="button" class="action-button" data-toggle-supplier="${escapeHtml(supplier.id)}" data-active="${supplier.active ? 'true' : 'false'}">${supplier.active ? 'Deactivate' : 'Activate'}</button></td></tr>`;
    }).join('');
    document.getElementById('purchaseOrdersTable').innerHTML = orders.map((order) => {
      const status = String(order.status || 'ORDERED');
      const isOpen = status === 'ORDERED' || status === 'PARTIALLY_RECEIVED';
      const orderedTotal = (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || Number(item.orderedQuantity) * Number(item.unitCost)), 0);
      const canCancel = status === 'ORDERED' && !(order.items || []).some((item) => Number(item.receivedQuantity) > 0);
      const actions = canManage
        ? `${isOpen ? `<button type="button" class="action-button" data-open-receive-order="${escapeHtml(order.id)}">Receive</button>` : ''}${canCancel ? `<button type="button" class="action-button danger" data-cancel-purchase-order="${escapeHtml(order.id)}">Cancel</button>` : ''}`
        : '—';
      return `<tr><td><b>${escapeHtml(order.orderNumber || 'Purchase order')}</b></td><td>${escapeHtml(order.supplier?.name || suppliers.find((supplier) => supplier.id === order.supplierId)?.name || 'Supplier unavailable')}</td><td>${escapeHtml(formatDate(String(order.createdAt || '').slice(0, 10)))}</td><td>${(order.items || []).length}</td><td>${money(orderedTotal)}</td><td><span class="status-pill ${status === 'RECEIVED' ? '' : status === 'CANCELLED' ? 'cancelled' : 'pending'}">${escapeHtml(status.replaceAll('_', ' ').toLowerCase())}</span></td><td><span class="row-actions">${actions}</span></td></tr>`;
    }).join('');
    const openOrders = orders.filter((order) => ['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status));
    const outstanding = openOrders.reduce((total, order) => total + (order.items || []).reduce((sum, item) => sum + (Number(item.orderedQuantity) - Number(item.receivedQuantity)) * Number(item.unitCost), 0), 0);
    const pendingLines = openOrders.reduce((count, order) => count + (order.items || []).filter((item) => Number(item.receivedQuantity) < Number(item.orderedQuantity)).length, 0);
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const receivedThisMonth = orders.reduce((total, order) => total + (order.receipts || []).reduce((receiptTotal, receipt) => (
      String(receipt.receivedAt || '').slice(0, 7) === monthKey
        ? receiptTotal + (receipt.items || []).reduce((lineTotal, line) => lineTotal + Number(line.quantity) * Number(line.unitCost), 0)
        : receiptTotal
    ), 0), 0);
    document.getElementById('purchaseOpenCount').textContent = String(openOrders.length);
    document.getElementById('purchasePendingLines').textContent = String(pendingLines);
    document.getElementById('purchaseOutstandingValue').textContent = money(outstanding);
    document.getElementById('purchaseMonthValue').textContent = money(receivedThisMonth);
  }

  function medicineSelectOptions() {
    return ['<option value="">Select medicine</option>', ...data.medicines
      .filter((medicine) => medicine.active !== false)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((medicine) => `<option value="${escapeHtml(medicine.id)}">${escapeHtml(medicine.name)} · ${Number(medicine.quantity)} in stock</option>`)]
      .join('');
  }

  function addProcurementLine(containerId, costField) {
    const container = document.getElementById(containerId);
    container.insertAdjacentHTML('beforeend', `<div class="invoice-line purchase-order-line"><select class="purchase-line-medicine" aria-label="Medicine" required>${medicineSelectOptions()}</select><input class="purchase-line-quantity" type="number" min="1" step="1" value="1" aria-label="Quantity" required /><input class="purchase-line-cost" type="number" min="0" max="9999999999.99" step="0.01" value="0" aria-label="Unit cost" required data-cost-field="${costField}" /><button type="button" class="remove-line" data-remove-procurement-line aria-label="Remove medicine">×</button></div>`);
    const line = container.lastElementChild;
    line.querySelector('.purchase-line-medicine').addEventListener('change', (event) => {
      const medicine = data.medicines.find((item) => item.id === event.currentTarget.value);
      line.querySelector('.purchase-line-cost').value = String(medicine?.[costField] || 0);
      updateProcurementTotal(containerId, containerId === 'purchaseOrderLines' ? 'purchaseOrderTotal' : 'pharmacyOrderTotal', containerId === 'purchaseOrderLines' ? 'Order total' : 'Order estimate');
    });
    line.querySelectorAll('.purchase-line-quantity,.purchase-line-cost').forEach((input) => {
      input.addEventListener('input', () => updateProcurementTotal(
        containerId,
        containerId === 'purchaseOrderLines' ? 'purchaseOrderTotal' : 'pharmacyOrderTotal',
        containerId === 'purchaseOrderLines' ? 'Order total' : 'Order estimate',
      ));
    });
  }

  function updateProcurementTotal(linesId, totalId, costName) {
    const total = [...document.querySelectorAll(`#${linesId} .purchase-order-line`)].reduce((sum, line) => (
      sum + Number(line.querySelector('.purchase-line-quantity').value || 0) * Number(line.querySelector('.purchase-line-cost').value || 0)
    ), 0);
    document.getElementById(totalId).textContent = `${costName}: ${money(total)}`;
  }

  function openPurchaseOrderForm() {
    const activeSuppliers = (data.suppliers || []).filter((supplier) => supplier.active !== false);
    if (!activeSuppliers.length) {
      showToast('Add a supplier before creating a purchase order.');
      openModal('supplierModal');
      return;
    }
    const form = document.getElementById('purchaseOrderForm');
    form.reset();
    form.elements.namedItem('supplierId').innerHTML = activeSuppliers.map((supplier) => (
      `<option value="${escapeHtml(supplier.id)}">${escapeHtml(supplier.name)}</option>`
    )).join('');
    document.getElementById('purchaseOrderLines').innerHTML = '';
    addProcurementLine('purchaseOrderLines', 'cost');
    updateProcurementTotal('purchaseOrderLines', 'purchaseOrderTotal', 'Order total');
    openModal('purchaseOrderModal');
  }

  function openPharmacyOrderForm() {
    const patients = data.patients.filter((patient) => patient.status !== 'Archived');
    if (!patients.length) {
      showToast('Register a patient before recording a pharmacy order.');
      return;
    }
    const form = document.getElementById('pharmacyOrderForm');
    form.reset();
    form.elements.namedItem('patientId').innerHTML = patients.map((patient) => (
      `<option value="${escapeHtml(patient.id)}">${escapeHtml(patient.name)} · ${escapeHtml(patient.code || patient.phone || '')}</option>`
    )).join('');
    document.getElementById('pharmacyOrderLines').innerHTML = '';
    addProcurementLine('pharmacyOrderLines', 'price');
    updateProcurementTotal('pharmacyOrderLines', 'pharmacyOrderTotal', 'Order estimate');
    openModal('pharmacyOrderModal');
  }

  function formString(fields, name) {
    return String(fields.get(name) || '').trim();
  }

  function purchaseOrderLinePayload(containerId, costField) {
    const items = [...document.querySelectorAll(`#${containerId} .purchase-order-line`)].map((line) => ({
      medicineId: line.querySelector('.purchase-line-medicine').value,
      quantity: Number(line.querySelector('.purchase-line-quantity').value),
      [costField === 'cost' ? 'unitCost' : 'unitPrice']: Number(line.querySelector('.purchase-line-cost').value),
    }));
    if (!items.length || items.some((line) => !line.medicineId || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line[costField === 'cost' ? 'unitCost' : 'unitPrice']) || line[costField === 'cost' ? 'unitCost' : 'unitPrice'] < 0)) {
      throw new Error('Add at least one medicine and enter a valid quantity and price for each line.');
    }
    if (new Set(items.map((line) => line.medicineId)).size !== items.length) {
      throw new Error('Choose each medicine only once; combine duplicate quantities on one line.');
    }
    return items;
  }

  async function saveSupplierForm(form) {
    const fields = new FormData(form);
    const supplier = {
      name: formString(fields, 'name'),
      contactName: formString(fields, 'contactName'),
      phone: formString(fields, 'phone'),
      email: formString(fields, 'email'),
      address: formString(fields, 'address'),
      taxId: formString(fields, 'taxId'),
    };
    if (isApiConnected()) {
      await apiRequest('/procurement/suppliers', { method: 'POST', body: JSON.stringify(supplier) });
      await refreshLiveData();
    } else {
      data.suppliers.push({ id: makeId('supplier'), ...supplier, active: true, orderCount: 0, createdAt: new Date().toISOString() });
      save();
      renderPharmacyPurchases();
    }
    closeModal(document.getElementById('supplierModal'));
    showToast('Supplier saved.');
  }

  async function savePurchaseOrderForm(form) {
    const fields = new FormData(form);
    const items = purchaseOrderLinePayload('purchaseOrderLines', 'cost');
    const payload = {
      supplierId: formString(fields, 'supplierId'),
      expectedAt: formString(fields, 'expectedAt') || undefined,
      notes: formString(fields, 'notes') || undefined,
      items,
    };
    if (isApiConnected()) {
      await apiRequest('/procurement/purchase-orders', { method: 'POST', body: JSON.stringify(payload) });
      await refreshLiveData();
    } else {
      const supplier = data.suppliers.find((item) => item.id === payload.supplierId);
      if (!supplier || supplier.active === false) throw new Error('Select an active supplier.');
      const number = (data.purchaseOrders || []).length + 1;
      data.purchaseOrders.push({
        id: makeId('purchase-order'),
        orderNumber: `PO-${String(number).padStart(6, '0')}`,
        supplierId: supplier.id,
        supplier,
        status: 'ORDERED',
        expectedAt: payload.expectedAt || '',
        notes: payload.notes || '',
        createdAt: new Date().toISOString(),
        items: items.map((line) => {
          const medicine = data.medicines.find((entry) => entry.id === line.medicineId);
          return {
            id: makeId('purchase-line'),
            medicineId: line.medicineId,
            medicine: medicine ? { id: medicine.id, name: medicine.name } : null,
            orderedQuantity: line.quantity,
            receivedQuantity: 0,
            unitCost: line.unitCost,
            lineTotal: line.quantity * line.unitCost,
          };
        }),
        receipts: [],
      });
      supplier.orderCount = Number(supplier.orderCount || 0) + 1;
      save();
      renderPharmacyPurchases();
    }
    closeModal(document.getElementById('purchaseOrderModal'));
    showToast('Purchase order created.');
  }

  async function receivePurchaseOrderForm(form) {
    const fields = new FormData(form);
    const orderId = formString(fields, 'purchaseOrderId');
    const items = [...form.querySelectorAll('[data-receipt-item]')].map((input) => ({
      purchaseOrderItemId: input.dataset.receiptItem,
      quantity: Number(input.value || 0),
    })).filter((line) => line.quantity > 0);
    if (!items.length || items.some((line) => !Number.isInteger(line.quantity))) {
      throw new Error('Enter a whole-number quantity greater than zero for at least one line.');
    }
    const payload = {
      idempotencyKey: formString(fields, 'idempotencyKey'),
      supplierDocumentNumber: formString(fields, 'supplierDocumentNumber') || undefined,
      notes: formString(fields, 'notes') || undefined,
      items,
    };
    if (isApiConnected()) {
      await apiRequest(`/procurement/purchase-orders/${encodeURIComponent(orderId)}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshLiveData();
    } else {
      const order = data.purchaseOrders.find((entry) => entry.id === orderId);
      if (!order || !['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)) throw new Error('This purchase order is no longer open.');
      const receiptItems = [];
      items.forEach((line) => {
        const purchaseLine = order.items.find((entry) => entry.id === line.purchaseOrderItemId);
        if (!purchaseLine) throw new Error('A purchase-order line could not be found.');
        const remaining = Number(purchaseLine.orderedQuantity) - Number(purchaseLine.receivedQuantity);
        if (line.quantity > remaining) throw new Error(`Receipt quantity cannot exceed the remaining ${remaining} units.`);
        const medicine = data.medicines.find((entry) => entry.id === purchaseLine.medicineId);
        if (!medicine) throw new Error('The linked medicine is no longer available.');
        const before = Number(medicine.quantity || 0);
        medicine.quantity = before + line.quantity;
        medicine.cost = Number(purchaseLine.unitCost);
        purchaseLine.receivedQuantity += line.quantity;
        data.inventoryMovements.push({
          kind: 'medicine',
          itemId: medicine.id,
          type: 'RECEIVED',
          quantityDelta: line.quantity,
          quantityBefore: before,
          quantityAfter: medicine.quantity,
          reason: `Purchase order ${order.orderNumber}`,
          supplier: order.supplier?.name || '',
          createdAt: new Date().toISOString(),
        });
        receiptItems.push({ quantity: line.quantity, unitCost: Number(purchaseLine.unitCost) });
      });
      const complete = order.items.every((line) => Number(line.receivedQuantity) >= Number(line.orderedQuantity));
      order.status = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      order.receipts.push({
        id: makeId('receipt'),
        receivedAt: new Date().toISOString(),
        supplierDocumentNumber: payload.supplierDocumentNumber || '',
        notes: payload.notes || '',
        items: receiptItems,
      });
      save();
      renderMedicines();
      renderPharmacyPurchases();
      renderPharmacyDashboard();
    }
    closeModal(document.getElementById('purchaseReceiptModal'));
    showToast('Goods receipt recorded and stock updated.');
  }

  async function savePharmacyOrderForm(form) {
    const fields = new FormData(form);
    const items = purchaseOrderLinePayload('pharmacyOrderLines', 'price').map(({ medicineId, quantity }) => ({ medicineId, quantity }));
    const payload = {
      patientId: formString(fields, 'patientId'),
      channel: formString(fields, 'channel') || 'OTHER',
      notes: formString(fields, 'notes') || undefined,
      items,
    };
    if (isApiConnected()) {
      await apiRequest('/pharmacy/orders', { method: 'POST', body: JSON.stringify(payload) });
      await refreshLiveData();
    } else {
      const patient = patientById(payload.patientId);
      if (!patient || patient.status === 'Archived') throw new Error('Choose an active registered patient.');
      const lines = items.map((line) => {
        const medicine = data.medicines.find((entry) => entry.id === line.medicineId && entry.active !== false);
        if (!medicine) throw new Error('Choose an active medicine.');
        if (line.quantity > Number(medicine.quantity)) throw new Error(`Only ${medicine.quantity} units of ${medicine.name} are currently in stock.`);
        return { id: makeId('pharmacy-order-line'), medicineId: medicine.id, medicineName: medicine.name, medicine: { id: medicine.id, name: medicine.name }, quantity: line.quantity, unitPrice: Number(medicine.price), lineTotal: line.quantity * Number(medicine.price) };
      });
      const count = (data.pharmacyOrders || []).length + 1;
      data.pharmacyOrders.push({
        id: makeId('pharmacy-order'),
        orderNumber: `PH-${String(count).padStart(6, '0')}`,
        patientId: patient.id,
        channel: payload.channel,
        status: 'RECEIVED',
        notes: payload.notes || '',
        total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
        createdAt: new Date().toISOString(),
        items: lines,
      });
      save();
      renderPharmacyOrders();
    }
    closeModal(document.getElementById('pharmacyOrderModal'));
    showToast('Pharmacy order recorded. Create its invoice separately in clinic billing.');
  }

  async function changePharmacyOrderStatus(id, status) {
    const order = data.pharmacyOrders.find((item) => item.id === id);
    if (!order) throw new Error('Pharmacy order not found. Refresh and retry.');
    if (isApiConnected()) {
      await apiRequest(`/pharmacy/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await refreshLiveData();
    } else {
      const allowed = {
        RECEIVED: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['READY', 'CANCELLED'],
        READY: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };
      if (!allowed[order.status]?.includes(status)) throw new Error(`Cannot change a ${order.status.toLowerCase()} order to ${status.toLowerCase()}.`);
      order.status = status;
      save();
      renderPharmacyOrders();
    }
    showToast(`Order ${order.orderNumber} ${status === 'CANCELLED' ? 'cancelled' : `marked ${status.toLowerCase()}`}.`);
  }

  function openPurchaseReceipt(orderId) {
    const order = data.purchaseOrders.find((item) => item.id === orderId);
    if (!order) {
      showToast('Purchase order not found. Refresh and retry.');
      return;
    }
    const form = document.getElementById('purchaseReceiptForm');
    form.reset();
    form.elements.namedItem('purchaseOrderId').value = order.id;
    form.elements.namedItem('idempotencyKey').value = makeUuid();
    const lines = (order.items || []).filter((item) => Number(item.receivedQuantity) < Number(item.orderedQuantity));
    document.getElementById('purchaseReceiptLines').innerHTML = lines.map((item) => {
      const remaining = Number(item.orderedQuantity) - Number(item.receivedQuantity);
      return `<label class="purchase-receipt-row"><span><b>${escapeHtml(item.medicine?.name || data.medicines.find((medicine) => medicine.id === item.medicineId)?.name || 'Medicine')}</b><small>Remaining ${remaining} · ordered ${Number(item.orderedQuantity)}</small></span><input type="number" min="0" max="${remaining}" step="1" value="${remaining}" data-receipt-item="${escapeHtml(item.id)}" aria-label="Quantity received" /></label>`;
    }).join('');
    openModal('purchaseReceiptModal');
  }

  function pharmacyInvoiceDate(invoice) {
    return paymentDateKey(invoice.date || invoice.createdAt);
  }

  function pharmacyInvoiceIsInCurrentMonth(invoice) {
    const date = pharmacyInvoiceDate(invoice);
    return date.startsWith(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  }

  function getPharmacyMedicineSales(invoices = data.invoices) {
    const productsByName = new Map(data.medicines.map((medicine) => [String(medicine.name).trim().toLowerCase(), medicine]));
    const sales = [];
    invoices.filter((invoice) => !isInvoiceVoided(invoice)).forEach((invoice) => {
      (invoice.items || []).forEach((item) => {
        const medicine = (item.medicineId && data.medicines.find((entry) => entry.id === item.medicineId))
          || productsByName.get(String(item.name || '').trim().toLowerCase());
        if (!medicine) return;
        const quantity = Number(item.quantity || 1);
        const revenue = Number(item.amount ?? (quantity * Number(item.price || medicine.price || 0)));
        sales.push({
          invoice,
          medicine,
          quantity: Number.isFinite(quantity) ? quantity : 0,
          revenue: Number.isFinite(revenue) ? revenue : 0,
          cost: Number(medicine.cost || 0) * (Number.isFinite(quantity) ? quantity : 0),
        });
      });
    });
    return sales;
  }

  function renderPharmacySales() {
    const salesByInvoice = new Map();
    getPharmacyMedicineSales().forEach((sale) => {
      const current = salesByInvoice.get(sale.invoice) || { quantity: 0, revenue: 0 };
      current.quantity += sale.quantity;
      current.revenue += sale.revenue;
      salesByInvoice.set(sale.invoice, current);
    });
    const invoices = [...salesByInvoice.keys()].sort((left, right) => pharmacyInvoiceDate(right).localeCompare(pharmacyInvoiceDate(left)));
    const total = [...salesByInvoice.values()].reduce((sum, sale) => sum + sale.revenue, 0);
    const paid = invoices.reduce((sum, invoice) => {
      const sale = salesByInvoice.get(invoice);
      const invoiceTotal = Number(invoice.total || 0);
      return sum + (invoiceTotal > 0 ? Number(invoice.paid || 0) * sale.revenue / invoiceTotal : 0);
    }, 0);
    document.getElementById('pharmacySalesCount').textContent = String(invoices.length);
    document.getElementById('pharmacySalesTotal').textContent = money(total);
    document.getElementById('pharmacySalesPaid').textContent = money(paid);
    const markup = invoices.map((invoice) => {
      const patient = patientById(invoice.patientId);
      const sale = salesByInvoice.get(invoice);
      const date = pharmacyInvoiceDate(invoice);
      const payMethod = invoice.payments?.[0]?.method || invoice.paymentMethod || '—';
      const allocatedPaid = Number(invoice.total || 0) > 0 ? Number(invoice.paid || 0) * sale.revenue / Number(invoice.total) : 0;
      return `<div class="pharmacy-sales-row"><span>${escapeHtml(invoice.number || 'Invoice')}</span><span>${escapeHtml(patient?.name || 'Walk-in')}</span><span>${escapeHtml(date ? formatDate(date) : '—')}</span><b>${money(sale.revenue)}</b></div><div class="pharmacy-sales-row pharmacy-sales-details"><span>${sale.quantity} medicine unit${sale.quantity === 1 ? '' : 's'}</span><span>${escapeHtml(payMethod)}</span><span>${escapeHtml(invoiceStatus(invoice))}</span><span>Paid ${money(allocatedPaid)}</span></div>`;
    }).join('');
    document.getElementById('pharmacySalesList').innerHTML = invoices.length
      ? `<div class="pharmacy-sales-row header"><span>Invoice</span><span>Patient</span><span>Date</span><span>Total</span></div>${markup}`
      : '<div class="pharmacy-list-empty">No medicine sales have been recorded in clinic invoices.</div>';
  }

  function renderPharmacyProfit() {
    const monthlySales = getPharmacyMedicineSales(data.invoices.filter(pharmacyInvoiceIsInCurrentMonth));
    const revenue = monthlySales.reduce((sum, sale) => sum + sale.revenue, 0);
    const cost = monthlySales.reduce((sum, sale) => sum + sale.cost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : null;
    const scale = Math.max(revenue, cost, 1);
    document.getElementById('pharmacyProfitBars').innerHTML = `
      <div class="pharmacy-profit-bar-row"><span>Revenue</span><div class="pharmacy-profit-track"><i style="width:${Math.max(1, revenue / scale * 100)}%"></i></div><b>${money(revenue)}</b></div>
      <div class="pharmacy-profit-bar-row"><span>Product cost</span><div class="pharmacy-profit-track"><i class="cost" style="width:${Math.max(1, cost / scale * 100)}%"></i></div><b>${money(cost)}</b></div>
      <div class="pharmacy-profit-bar-row"><span>Gross profit</span><div class="pharmacy-profit-track"><i style="width:${Math.max(1, Math.max(profit, 0) / scale * 100)}%"></i></div><b>${money(profit)}</b></div>`;
    document.getElementById('pharmacyProfitSummary').innerHTML = `
      <div class="pharmacy-profit-summary">
        <div class="pharmacy-profit-summary-row"><span>Matched medicine sales</span><b>${money(revenue)}</b></div>
        <div class="pharmacy-profit-summary-row"><span>Recorded product cost</span><b>${money(cost)}</b></div>
        <div class="pharmacy-profit-summary-row"><span>Estimated gross profit</span><b>${money(profit)}</b></div>
        <div class="pharmacy-profit-summary-row"><span>Product margin</span><b>${margin === null ? '—' : `${margin.toFixed(1)}%`}</b></div>
      </div>`;
  }

  function printPharmacyReport(reportType) {
    const salesByInvoice = new Map();
    getPharmacyMedicineSales().forEach((sale) => {
      const current = salesByInvoice.get(sale.invoice) || { quantity: 0, revenue: 0, cost: 0 };
      current.quantity += sale.quantity;
      current.revenue += sale.revenue;
      current.cost += sale.cost;
      salesByInvoice.set(sale.invoice, current);
    });
    const sales = [...salesByInvoice.entries()]
      .sort(([left], [right]) => pharmacyInvoiceDate(right).localeCompare(pharmacyInvoiceDate(left)));
    const activeMedicines = data.medicines.filter((medicine) => medicine.active !== false);
    const report = { title: '', note: '', metrics: [], sections: [] };
    const makeTable = (title, headers, rows) => ({ title, headers, rows });
    const invoiceRows = sales.map(([invoice, sale]) => {
      const invoiceTotal = Number(invoice.total || 0);
      const allocatedPaid = invoiceTotal > 0 ? Number(invoice.paid || 0) * sale.revenue / invoiceTotal : 0;
      return [
        invoice.number || 'Invoice',
        patientById(invoice.patientId)?.name || 'Walk-in',
        pharmacyInvoiceDate(invoice) ? formatDate(pharmacyInvoiceDate(invoice)) : '—',
        String(sale.quantity),
        money(sale.revenue),
        money(allocatedPaid),
        invoiceStatus(invoice),
      ];
    });
    const expiryRows = activeMedicines
      .filter((medicine) => medicine.expiry && medicine.expiry <= shiftDate(90))
      .sort((left, right) => String(left.expiry).localeCompare(String(right.expiry)))
      .map((medicine) => [
        medicine.name,
        medicine.batch || '—',
        formatDate(medicine.expiry),
        `${Number(medicine.quantity)} units`,
        medicine.expiry < dateKey(today) ? 'Expired' : 'Expiring within 90 days',
      ]);
    const stockRows = activeMedicines.map((medicine) => [
      medicine.name,
      medicine.category || '—',
      medicine.batch || '—',
      `${Number(medicine.quantity)} units`,
      `${Number(medicine.reorder)} units`,
      money(Number(medicine.quantity || 0) * Number(medicine.cost || 0)),
      medicine.expiry ? formatDate(medicine.expiry) : 'Not recorded',
    ]);
    const revenue = sales.reduce((sum, [, sale]) => sum + sale.revenue, 0);
    const cost = sales.reduce((sum, [, sale]) => sum + sale.cost, 0);
    const inventoryCost = activeMedicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0) * Number(medicine.cost || 0), 0);
    const inventoryMrp = activeMedicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0) * Number(medicine.price || 0), 0);
    const purchaseOrders = data.purchaseOrders || [];
    const pharmacyOrders = data.pharmacyOrders || [];
    const purchaseRows = purchaseOrders.map((order) => [
      order.orderNumber || 'Purchase order',
      order.supplier?.name || data.suppliers.find((supplier) => supplier.id === order.supplierId)?.name || 'Supplier',
      formatDate(String(order.createdAt || '').slice(0, 10)),
      money((order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || Number(item.orderedQuantity) * Number(item.unitCost)), 0)),
      String(order.status || 'ORDERED').replaceAll('_', ' ').toLowerCase(),
    ]);
    const pharmacyOrderRows = pharmacyOrders.map((order) => [
      order.orderNumber || 'Pharmacy order',
      patientById(order.patientId)?.name || 'Patient unavailable',
      String(order.channel || 'OTHER'),
      formatDate(String(order.createdAt || '').slice(0, 10)),
      money(order.total || 0),
      String(order.status || 'RECEIVED').replaceAll('_', ' ').toLowerCase(),
    ]);
    const receivedPurchaseValue = purchaseOrders.reduce((total, order) => total + (order.receipts || []).reduce((receiptTotal, receipt) => (
      receiptTotal + (receipt.items || []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0)
    ), 0), 0);
    const openPurchaseOrderCount = purchaseOrders.filter((order) => ['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)).length;
    const activePharmacyOrderCount = pharmacyOrders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).length;

    if (reportType === 'overall') {
      const lowStockCount = activeMedicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.reorder)).length;
      report.title = 'Overall Pharmacy Report';
      report.note = 'Sales are based on medicine invoice lines matched to inventory. Paid amounts and product margins are estimates. Goods receipts update stock; supplier payment balances are not tracked. External orders are tracked separately and do not deduct stock until invoiced.';
      report.metrics = [
        ['Medicine sales', money(revenue)],
        ['Medicine invoices', String(sales.length)],
        ['Estimated gross profit', money(revenue - cost)],
        ['Goods received', money(receivedPurchaseValue)],
        ['Open purchase orders', String(openPurchaseOrderCount)],
        ['External pharmacy orders', String(pharmacyOrders.length)],
        ['Orders awaiting fulfillment', String(activePharmacyOrderCount)],
        ['Inventory value at cost', money(inventoryCost)],
        ['Inventory value at MRP', money(inventoryMrp)],
        ['Low-stock products', String(lowStockCount)],
        ['Expired / expiring products', String(expiryRows.length)],
      ];
      report.sections = [
        makeTable('Medicine sales register', ['Invoice', 'Patient', 'Date', 'Units', 'Sales', 'Allocated paid', 'Status'], invoiceRows),
        makeTable('Purchase-order register', ['Order', 'Supplier', 'Created', 'Order value', 'Status'], purchaseRows),
        makeTable('External pharmacy-order register', ['Order', 'Patient', 'Channel', 'Date', 'Estimate', 'Status'], pharmacyOrderRows),
        makeTable('Current medicine stock', ['Medicine', 'Category', 'Batch', 'Quantity', 'Reorder at', 'Stock cost', 'Expiry'], stockRows),
        makeTable('Expired or expiring medicine batches', ['Medicine', 'Batch', 'Expiry', 'Quantity', 'Status'], expiryRows),
      ];
    } else if (reportType === 'sales') {
      const allocatedPaid = sales.reduce((paid, [invoice, sale]) => {
        const total = Number(invoice.total || 0);
        return paid + (total > 0 ? Number(invoice.paid || 0) * sale.revenue / total : 0);
      }, 0);
      report.title = 'Sales Register';
      report.note = 'Sales include medicine invoice lines matched to inventory. Paid amounts are allocated proportionally by medicine sales value.';
      report.metrics = [['Medicine sales', money(revenue)], ['Medicine invoices', String(sales.length)], ['Allocated paid', money(allocatedPaid)]];
      report.sections = [makeTable('Medicine sales register', ['Invoice', 'Patient', 'Date', 'Units', 'Sales', 'Allocated paid', 'Status'], invoiceRows)];
    } else if (reportType === 'profit') {
      const products = new Map();
      getPharmacyMedicineSales().forEach((sale) => {
        const key = sale.medicine.id || sale.medicine.name;
        const current = products.get(key) || { name: sale.medicine.name, quantity: 0, revenue: 0, cost: 0 };
        current.quantity += sale.quantity;
        current.revenue += sale.revenue;
        current.cost += sale.cost;
        products.set(key, current);
      });
      const productRows = [...products.values()].sort((left, right) => right.revenue - left.revenue).map((product) => {
        const profit = product.revenue - product.cost;
        return [
          product.name,
          String(product.quantity),
          money(product.revenue),
          money(product.cost),
          money(profit),
          product.revenue > 0 ? `${(profit / product.revenue * 100).toFixed(1)}%` : '—',
        ];
      });
      report.title = 'Profit & Loss';
      report.note = 'Estimated gross profit uses recorded inventory purchase costs. Clinic service charges and medicine sales without a recorded product cost are excluded.';
      report.metrics = [['Medicine sales', money(revenue)], ['Recorded product cost', money(cost)], ['Estimated gross profit', money(revenue - cost)]];
      report.sections = [makeTable('Product profitability', ['Medicine', 'Units', 'Sales', 'Product cost', 'Gross profit', 'Margin'], productRows)];
    } else if (reportType === 'stock') {
      report.title = 'Stock Statement';
      report.note = 'Stock value at cost and MRP is calculated from active medicine inventory and current quantities.';
      report.metrics = [['Active products', String(activeMedicines.length)], ['Inventory value at cost', money(inventoryCost)], ['Inventory value at MRP', money(inventoryMrp)]];
      report.sections = [makeTable('Current medicine stock', ['Medicine', 'Category', 'Batch', 'Quantity', 'Reorder at', 'Stock cost', 'Expiry'], stockRows)];
    } else if (reportType === 'expiry') {
      report.title = 'Expiry Report';
      report.note = 'Lists active medicines that are expired or due to expire within the next 90 days.';
      report.metrics = [['Expired / expiring products', String(expiryRows.length)]];
      report.sections = [makeTable('Expired or expiring medicine batches', ['Medicine', 'Batch', 'Expiry', 'Quantity', 'Status'], expiryRows)];
    } else if (reportType === 'purchases' || reportType === 'suppliers') {
      const purchaseReport = reportType === 'purchases';
      report.title = purchaseReport ? 'Purchase Register' : 'Supplier Ledger';
      if (purchaseReport) {
        const purchaseRows = (data.purchaseOrders || []).map((order) => [
          order.orderNumber || 'Purchase order',
          order.supplier?.name || data.suppliers.find((supplier) => supplier.id === order.supplierId)?.name || 'Supplier',
          formatDate(String(order.createdAt || '').slice(0, 10)),
          (order.items || []).reduce((sum, item) => sum + Number(item.orderedQuantity || 0), 0).toString(),
          (order.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0).toString(),
          money((order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || Number(item.orderedQuantity) * Number(item.unitCost)), 0)),
          String(order.status || 'ORDERED').replaceAll('_', ' ').toLowerCase(),
        ]);
        const receiptRows = (data.purchaseOrders || []).flatMap((order) => (order.receipts || []).map((receipt) => [
          order.orderNumber || 'Purchase order',
          receipt.supplierDocumentNumber || '—',
          formatDate(String(receipt.receivedAt || '').slice(0, 10)),
          String((receipt.items || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0)),
          money((receipt.items || []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0)),
        ]));
        report.note = 'Purchase orders and physical goods receipts. Supplier payment or accounts-payable balances are not tracked here.';
        report.metrics = [
          ['Purchase orders', String((data.purchaseOrders || []).length)],
          ['Goods receipts', String(receiptRows.length)],
        ];
        report.sections = [
          makeTable('Purchase orders', ['Order', 'Supplier', 'Created', 'Ordered units', 'Received units', 'Order value', 'Status'], purchaseRows),
          makeTable('Goods receipt register', ['Order', 'Supplier document', 'Received', 'Units', 'Receipt value'], receiptRows),
        ];
      } else {
        const supplierRows = (data.suppliers || []).map((supplier) => {
          const orders = (data.purchaseOrders || []).filter((order) => order.supplierId === supplier.id);
          const orderedValue = orders.reduce((total, order) => total + (order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0), 0);
          const receivedValue = orders.reduce((total, order) => total + (order.receipts || []).reduce((receiptTotal, receipt) => receiptTotal + (receipt.items || []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0), 0), 0);
          return [supplier.name, supplier.contactName || '—', supplier.phone || '—', String(orders.length), money(orderedValue), money(receivedValue), supplier.active ? 'Active' : 'Inactive'];
        });
        report.note = 'Supplier directory and procurement history only. This is not a supplier balance or accounts-payable ledger.';
        report.metrics = [['Suppliers', String((data.suppliers || []).length)], ['Purchase orders', String((data.purchaseOrders || []).length)]];
        report.sections = [makeTable('Supplier directory and purchase history', ['Supplier', 'Contact', 'Phone', 'Orders', 'Ordered value', 'Received value', 'Status'], supplierRows)];
      }
    } else if (reportType === 'gst') {
      const taxRows = sales.map(([invoice, sale]) => {
        const subtotal = Number(invoice.subtotal || 0);
        const medicineShare = subtotal > 0 ? sale.revenue / subtotal : 0;
        const taxableValue = subtotal > 0
          ? Math.max(0, subtotal - Number(invoice.discount || 0)) * medicineShare
          : sale.revenue;
        return [
          invoice.number || 'Invoice',
          pharmacyInvoiceDate(invoice) ? formatDate(pharmacyInvoiceDate(invoice)) : '—',
          `${Number(invoice.taxRate || 0)}%`,
          money(taxableValue),
          money(Number(invoice.taxAmount || 0) * medicineShare),
        ];
      });
      const taxTotal = sales.reduce((sum, [invoice, sale]) => {
        const subtotal = Number(invoice.subtotal || 0);
        return sum + (subtotal > 0 ? Number(invoice.taxAmount || 0) * sale.revenue / subtotal : 0);
      }, 0);
      report.title = 'GST Summary';
      report.note = 'Invoice-level tax is allocated to matched medicine sales by their share of invoice subtotal. Product-specific GST rates are not stored.';
      report.metrics = [['Allocated medicine tax', money(taxTotal)], ['Medicine invoices', String(sales.length)]];
      report.sections = [makeTable('Medicine tax summary', ['Invoice', 'Date', 'Invoice tax rate', 'Allocated taxable value', 'Allocated tax'], taxRows)];
    } else if (reportType === 'customers') {
      const customers = new Map();
      getPharmacyMedicineSales().forEach((sale) => {
        const key = sale.invoice.patientId || `walk-in:${sale.invoice.id}`;
        const current = customers.get(key) || {
          name: patientById(sale.invoice.patientId)?.name || 'Walk-in',
          invoices: new Set(),
          products: new Set(),
          quantity: 0,
          revenue: 0,
        };
        current.invoices.add(sale.invoice.number || 'Invoice');
        current.products.add(sale.medicine.name);
        current.quantity += sale.quantity;
        current.revenue += sale.revenue;
        customers.set(key, current);
      });
      const customerRows = [...customers.values()].sort((left, right) => right.revenue - left.revenue).map((customer) => [
        customer.name,
        String(customer.invoices.size),
        String(customer.quantity),
        [...customer.products].join(', '),
        money(customer.revenue),
      ]);
      report.title = 'Customer Report';
      report.note = 'Patient purchases include only medicine invoice lines matched to current pharmacy inventory.';
      report.metrics = [['Customers with medicine purchases', String(customers.size)], ['Medicine sales', money(revenue)]];
      report.sections = [makeTable('Medicine purchase history', ['Patient', 'Invoices', 'Units', 'Medicines', 'Total purchases'], customerRows)];
    } else {
      showToast('This pharmacy report is not available.');
      return;
    }

    const metrics = report.metrics.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    const sections = report.sections.map(({ title, headers, rows }) => `
      <section class="print-report-section"><h3>${escapeHtml(title)}</h3>
        <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.length
            ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${headers.length}">No records to display.</td></tr>`}</tbody>
        </table>
      </section>`).join('');
    const root = document.getElementById('printRoot');
    root.innerHTML = `<article class="print-report">
      <header><h1>${escapeHtml(data.settings.clinicName || 'CSK Clinic')}</h1><h2>${escapeHtml(report.title)}</h2>
        <p>Generated ${escapeHtml(formatDate(dateKey(today)))}</p></header>
      <p class="print-report-note">${escapeHtml(report.note)}</p>
      ${metrics ? `<dl>${metrics}</dl>` : ''}
      ${sections}
    </article>`;
    root.insertAdjacentHTML('beforeend', '<div class="print-toolbar"><span>Print preview</span><button type="button" data-close-print-preview>Close preview</button><button type="button" class="button button-primary" data-print-document>Print report</button></div>');
  }

  function renderPharmacyDashboard() {
    if (WORKSPACE_MODE === 'doctor') return;
    const activeMedicines = data.medicines.filter((medicine) => medicine.active !== false);
    const lowStock = activeMedicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.reorder))
      .sort((left, right) => Number(left.quantity) - Number(right.quantity));
    const expiryAttention = activeMedicines.filter((medicine) => medicine.expiry && medicine.expiry <= shiftDate(90))
      .sort((left, right) => String(left.expiry).localeCompare(String(right.expiry)));
    const expiring = expiryAttention.filter((medicine) => medicine.expiry >= dateKey(today));
    const outOfStock = activeMedicines.filter((medicine) => Number(medicine.quantity) <= 0);
    const stockCost = activeMedicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0) * Number(medicine.cost || 0), 0);
    const stockMrp = activeMedicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0) * Number(medicine.price || 0), 0);
    const validInvoices = data.invoices.filter((invoice) => !isInvoiceVoided(invoice));
    const todayInvoices = validInvoices.filter((invoice) => pharmacyInvoiceDate(invoice) === dateKey(today));
    const monthInvoices = validInvoices.filter(pharmacyInvoiceIsInCurrentMonth);
    const monthProductSales = getPharmacyMedicineSales(monthInvoices);
    const productRevenue = monthProductSales.reduce((sum, sale) => sum + sale.revenue, 0);
    const productCost = monthProductSales.reduce((sum, sale) => sum + sale.cost, 0);
    const productProfit = productRevenue - productCost;
    const productMargin = productRevenue > 0 ? (productProfit / productRevenue) * 100 : null;
    const todayProductSales = getPharmacyMedicineSales(todayInvoices);
    const todayRevenue = todayProductSales.reduce((sum, sale) => sum + sale.revenue, 0);
    const todaySalesInvoiceCount = new Set(todayProductSales.map((sale) => sale.invoice)).size;

    document.getElementById('pharmacyTodaySales').textContent = money(todayRevenue);
    document.getElementById('pharmacyTodayInvoices').textContent = `${todaySalesInvoiceCount} invoice${todaySalesInvoiceCount === 1 ? '' : 's'} today`;
    document.getElementById('pharmacyMonthRevenue').textContent = money(productRevenue);
    document.getElementById('pharmacyGrossProfit').textContent = money(productProfit);
    document.getElementById('pharmacyGrossMargin').textContent = `Product margin ${productMargin === null ? '—' : `${productMargin.toFixed(1)}%`}`;
    document.getElementById('pharmacyStockValue').textContent = money(stockCost);
    document.getElementById('pharmacyStockMrp').textContent = `MRP ${money(stockMrp)}`;
    document.getElementById('pharmacyTotalMedicines').textContent = String(activeMedicines.length);
    document.getElementById('pharmacyInventoryValue').textContent = money(stockCost);
    document.getElementById('pharmacyLowStock').textContent = String(lowStock.length);
    document.getElementById('pharmacyExpiringSoon').textContent = String(expiring.length);
    document.getElementById('pharmacyOutOfStock').textContent = String(outOfStock.length);

    const months = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 7 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const invoices = validInvoices.filter((invoice) => pharmacyInvoiceDate(invoice).startsWith(key));
      const productSales = getPharmacyMedicineSales(invoices);
      const purchases = (data.purchaseOrders || []).reduce((total, order) => total + (order.receipts || []).reduce((receiptTotal, receipt) => (
        String(receipt.receivedAt || '').slice(0, 7) === key
          ? receiptTotal + (receipt.items || []).reduce((lineTotal, line) => lineTotal + Number(line.quantity || 0) * Number(line.unitCost || 0), 0)
          : receiptTotal
      ), 0), 0);
      return {
        label: date.toLocaleDateString('en-IN', { month: 'short' }),
        sales: productSales.reduce((sum, sale) => sum + sale.revenue, 0),
        purchases,
      };
    });
    const maxSales = Math.max(...months.flatMap((month) => [month.sales, month.purchases]), 1);
    document.getElementById('pharmacySalesChart').innerHTML = months.map((month) => `
      <div class="pharmacy-chart-column" title="${escapeHtml(month.label)} sales ${escapeHtml(money(month.sales))}; goods received ${escapeHtml(money(month.purchases))}">
        <div class="pharmacy-chart-bars"><i class="pharmacy-chart-bar" style="height:${Math.max(2, month.sales / maxSales * 100)}%"></i><i class="pharmacy-chart-bar purchase" style="height:${Math.max(2, month.purchases / maxSales * 100)}%"></i></div>
        <span class="pharmacy-chart-month">${escapeHtml(month.label)}</span>
      </div>`).join('');

    const categoryTotals = new Map();
    monthProductSales.forEach((sale) => {
      const category = sale.medicine.category || 'Uncategorised';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + sale.revenue);
    });
    if (!categoryTotals.size && productRevenue > 0) categoryTotals.set('Uncategorised', productRevenue);
    const categories = [...categoryTotals.entries()].sort((left, right) => right[1] - left[1]);
    const colors = ['#087f79', '#8b5cf6', '#e69a27', '#477be0', '#cf5260'];
    const categoryTotal = categories.reduce((sum, [, value]) => sum + value, 0);
    let categoryOffset = 0;
    const donutParts = categories.map(([, value], index) => {
      const start = categoryOffset;
      categoryOffset += categoryTotal ? value / categoryTotal * 100 : 0;
      return `${colors[index % colors.length]} ${start}% ${categoryOffset}%`;
    });
    document.getElementById('pharmacyCategoryChart').innerHTML = `
      <div class="pharmacy-donut" style="--pharmacy-donut:${donutParts.length ? donutParts.join(',') : '#e8eef2 0 100%'}"><div class="pharmacy-donut-center"><b>${money(categoryTotal)}</b><small>total</small></div></div>
      <div class="pharmacy-category-legend">${categories.length ? categories.slice(0, 5).map(([category, value], index) => `<div class="pharmacy-category-row" style="--category-color:${colors[index % colors.length]}"><i></i><span>${escapeHtml(category)}</span><b>${categoryTotal ? Math.round(value / categoryTotal * 100) : 0}%</b></div>`).join('') : '<div class="pharmacy-list-empty">No category sales recorded.</div>'}</div>`;

    const topProducts = new Map();
    monthProductSales.forEach((sale) => {
      const current = topProducts.get(sale.medicine.id) || { name: sale.medicine.name, quantity: 0, revenue: 0 };
      current.quantity += sale.quantity;
      current.revenue += sale.revenue;
      topProducts.set(sale.medicine.id, current);
    });
    const topProductsList = [...topProducts.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 4);
    document.getElementById('pharmacyTopSelling').innerHTML = topProductsList.length
      ? topProductsList.map((item, index) => `<div class="pharmacy-list-row"><small>${index + 1}</small><span>${escapeHtml(item.name)}<small>${item.quantity} unit${item.quantity === 1 ? '' : 's'}</small></span><b>${money(item.revenue)}</b></div>`).join('')
      : '<div class="pharmacy-list-empty">No medicine sales this month.</div>';
    document.getElementById('pharmacyLowStockList').innerHTML = lowStock.length
      ? lowStock.slice(0, 4).map((medicine) => `<div class="pharmacy-list-row"><span>${escapeHtml(medicine.name)}</span><small>${Number(medicine.quantity)} / ${Number(medicine.reorder)}</small></div>`).join('')
      : '<div class="pharmacy-list-empty">All medicine stock is above reorder level.</div>';
    document.getElementById('pharmacyExpiringList').innerHTML = expiryAttention.length
      ? expiryAttention.slice(0, 4).map((medicine) => `<div class="pharmacy-list-row"><span>${escapeHtml(medicine.name)}</span><small>${escapeHtml(medicine.expiry < dateKey(today) ? 'Expired' : formatDate(medicine.expiry))}</small></div>`).join('')
      : '<div class="pharmacy-list-empty">No expired or near-expiry medicine found.</div>';

    const recentDate = shiftDate(-90);
    const recentProductSales = getPharmacyMedicineSales(validInvoices);
    const latestSaleByMedicine = new Map();
    recentProductSales.forEach((sale) => {
      const date = pharmacyInvoiceDate(sale.invoice);
      if (!date || date < recentDate) return;
      const previous = latestSaleByMedicine.get(sale.medicine.id);
      if (!previous || date > previous.date) latestSaleByMedicine.set(sale.medicine.id, { date, medicine: sale.medicine });
    });
    const slowMoving = activeMedicines.filter((medicine) => Number(medicine.quantity) > 0)
      .map((medicine) => ({ medicine, sale: latestSaleByMedicine.get(medicine.id) }))
      .filter(({ sale }) => sale && sale.date < shiftDate(-30))
      .slice(0, 4);
    document.getElementById('pharmacySlowMoving').innerHTML = slowMoving.length
      ? slowMoving.map(({ medicine, sale }) => `<div class="pharmacy-list-row"><span>${escapeHtml(medicine.name)}</span><small>Last sale ${escapeHtml(formatDate(sale.date))}</small></div>`).join('')
      : '<div class="pharmacy-list-empty">No slow-moving products identified from recorded medicine sales.</div>';

    const salesByInvoice = new Map();
    getPharmacyMedicineSales(validInvoices).forEach((sale) => {
      salesByInvoice.set(sale.invoice, (salesByInvoice.get(sale.invoice) || 0) + sale.revenue);
    });
    const recentInvoices = [...salesByInvoice.keys()].sort((left, right) => pharmacyInvoiceDate(right).localeCompare(pharmacyInvoiceDate(left))).slice(0, 5);
    document.getElementById('pharmacyRecentSales').innerHTML = recentInvoices.length
      ? recentInvoices.map((invoice) => {
        const patient = patientById(invoice.patientId);
        return `<div class="pharmacy-list-row"><span>${escapeHtml(invoice.number || 'Invoice')} · ${escapeHtml(patient?.name || 'Walk-in')}</span><small>${escapeHtml(pharmacyInvoiceDate(invoice) ? formatDate(pharmacyInvoiceDate(invoice)) : '—')}</small><b>${money(salesByInvoice.get(invoice))}</b></div>`;
      }).join('')
      : '<div class="pharmacy-list-empty">No sales recorded.</div>';
    renderPharmacySales();
  }

  function renderConsumables() {
    const query = (document.getElementById('consumableSearch')?.value || '').trim().toLowerCase();
    const category = document.getElementById('consumableCategoryFilter')?.value || '';
    const stockFilter = document.getElementById('consumableStockFilter')?.value || '';
    const rows = data.consumables.filter((item) => {
      if (!`${item.name} ${item.category} ${item.brand} ${item.supplier}`.toLowerCase().includes(query)) return false;
      if (category && item.category !== category) return false;
      const expired = item.expiry && item.expiry < dateKey(today);
      const low = Number(item.quantity) <= Number(item.reorder);
      if (stockFilter === 'low' && !low) return false;
      if (stockFilter === 'expired' && !expired) return false;
      if (stockFilter === 'available' && (expired || Number(item.quantity) <= 0)) return false;
      return true;
    });
    const role = getStoredApiUser()?.role || '';
    const canManage = !isApiConnected() || ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'PHARMACIST'].includes(role);
    const canAdjust = !isApiConnected() || canManage || role === 'NURSE';
    document.getElementById('openConsumableModal').classList.toggle('hidden', !canManage);
    document.getElementById('consumableCount').textContent = data.consumables.length;
    document.getElementById('consumableLowCount').textContent = data.consumables.filter((item) => Number(item.quantity) <= Number(item.reorder)).length;
    document.getElementById('consumableValue').textContent = money(data.consumables.reduce((sum, item) => sum + Number(item.quantity) * Number(item.cost), 0));
    document.getElementById('consumablesEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('consumablesTable').innerHTML = rows.map((item) => {
      const expired = item.expiry && item.expiry < dateKey(today);
      const low = Number(item.quantity) <= Number(item.reorder);
      const status = expired ? 'Expired' : low ? 'Low stock' : 'In stock';
      return `<tr><td><b>${escapeHtml(item.name)}</b><small class="table-secondary">${escapeHtml(item.brand || 'No brand')} · ${escapeHtml(item.unit || 'unit')}</small></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.batch || '—')}<br><small>${escapeHtml(formatDate(item.expiry))}</small></td><td><b>${Number(item.quantity)}</b></td><td>${Number(item.reorder)}</td><td><span class="status-pill ${low || expired ? 'low' : ''}">${status}</span><span class="row-actions">${canAdjust ? `<button class="action-button" data-stock-consumable="${escapeHtml(item.id)}">＋ Stock</button><button class="action-button" data-use-consumable="${escapeHtml(item.id)}">Use</button>` : ''}${canManage ? `<button class="action-button" data-edit-consumable="${escapeHtml(item.id)}">Edit</button>` : ''}<button class="action-button" data-consumable-history="${escapeHtml(item.id)}">History</button></span></td></tr>`;
    }).join('');
    const categories = [...new Set([
      ...data.consumableCategories,
      ...data.consumables.map((item) => item.category).filter(Boolean),
    ])].sort((a, b) => a.localeCompare(b));
    document.getElementById('consumableCategories').innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}"></option>`).join('');
    const categoryFilter = document.getElementById('consumableCategoryFilter');
    if (categoryFilter) {
      const selected = categoryFilter.value;
      categoryFilter.innerHTML = `<option value="">All categories</option>${categories.map((entry) => `<option value="${escapeHtml(entry)}">${escapeHtml(entry)}</option>`).join('')}`;
      categoryFilter.value = categories.includes(selected) ? selected : '';
    }
  }

  async function openInventoryHistory(kind, id, name) {
    const root = document.getElementById('inventoryHistoryTable');
    root.innerHTML = '';
    document.getElementById('inventoryHistoryTitle').textContent = `${name} · Stock history`;
    document.getElementById('inventoryHistoryEmpty').classList.add('hidden');
    openModal('inventoryHistoryModal');
    try {
      const movements = isApiConnected()
        ? await apiListAll(`/${kind === 'medicine' ? 'medicines' : 'consumables'}/${encodeURIComponent(id)}/stock-movements`)
        : data.inventoryMovements.filter((movement) => movement.kind === kind && movement.itemId === id);
      root.innerHTML = movements.map((movement) => {
        const type = String(movement.type || '').replace(/_/g, ' ').toLowerCase();
        const createdAt = movement.createdAt || new Date().toISOString();
        return `<tr><td>${escapeHtml(formatDate(String(createdAt).slice(0, 10)))}<br><small>${escapeHtml(new Date(createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }))}</small></td><td>${escapeHtml(type || 'stock changed')}</td><td>${Number(movement.quantityDelta) > 0 ? '+' : ''}${Number(movement.quantityDelta || 0)}</td><td>${Number(movement.quantityBefore || 0)} → ${Number(movement.quantityAfter || 0)}</td><td>${escapeHtml(movement.user?.email || movement.recordedBy || 'Clinic staff')}</td><td>${escapeHtml(movement.reason || movement.supplier || '—')}</td></tr>`;
      }).join('');
      document.getElementById('inventoryHistoryEmpty').classList.toggle('hidden', movements.length > 0);
    } catch (error) {
      console.error('Unable to load inventory movement history.', error);
      root.innerHTML = '';
      document.getElementById('inventoryHistoryEmpty').classList.remove('hidden');
      showToast(error.message || 'Unable to load stock history.');
    }
  }

  function invoiceStatus(invoice) {
    if (isInvoiceVoided(invoice)) return 'Voided';
    const total = Number(invoice.total) || 0;
    const paid = Number(invoice.paid) || 0;
    if (total > 0 && paid >= total) return 'Paid';
    if (paid > 0) return 'Part paid';
    return 'Unpaid';
  }
  function isInvoiceVoided(invoice) {
    return Boolean(invoice?.voidedAt || invoice?.status === 'VOIDED');
  }
  function canVoidInvoices() {
    return !isApiConnected()
      || ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN'].includes(getStoredApiUser()?.role);
  }
  function renderInvoices() {
    const query = document.getElementById('invoiceSearch').value.trim().toLowerCase();
    const rows = [...data.invoices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).filter((invoice) => {
      const patient = patientById(invoice.patientId);
      return `${invoice.number} ${patient?.name || ''} ${patient?.code || ''}`.toLowerCase().includes(query);
    });
    const collected = collectedOnDate(dateKey(today));
    const due = data.invoices.reduce((sum, invoice) => sum + (isInvoiceVoided(invoice)
      ? 0
      : Math.max(0, Number(invoice.total) - Number(invoice.paid))), 0);
    document.getElementById('billingCollected').textContent = money(collected);
    document.getElementById('billingOutstanding').textContent = money(due);
    document.getElementById('billingInvoiceCount').textContent = data.invoices.filter((invoice) => !isInvoiceVoided(invoice)).length;
    document.getElementById('invoicesEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('invoicesTable').innerHTML = rows.map((invoice) => {
      const patient = patientById(invoice.patientId);
      const balance = isInvoiceVoided(invoice) ? 0 : Math.max(0, Number(invoice.total) - Number(invoice.paid));
      const status = invoiceStatus(invoice);
      const voided = isInvoiceVoided(invoice);
      const canVoid = !voided && Number(invoice.paid) === 0 && balance > 0 && canVoidInvoices();
      return `<tr><td>${escapeHtml(invoice.number)}</td><td>${escapeHtml(patient?.name || 'Patient record unavailable')}${patient?.code ? `<small>Patient ID: ${escapeHtml(patient.code)}</small>` : ''}</td><td>${escapeHtml(formatDate(invoice.date))}</td><td>${money(invoice.total)}</td><td>${money(invoice.paid)}</td><td>${money(balance)}</td><td><span class="status-pill ${status === 'Paid' || voided ? '' : 'pending'}">${status}</span>${voided && invoice.voidReason ? `<small class="table-secondary">Reason: ${escapeHtml(invoice.voidReason)}</small>` : ''}</td><td><span class="row-actions"><button class="action-button" data-print-invoice="${escapeHtml(invoice.id)}">Invoice</button>${!voided ? `<button class="action-button" data-print-receipt="${escapeHtml(invoice.id)}">Receipt</button>` : ''}${!voided && balance > 0 ? `<button class="action-button" data-pay-invoice="${escapeHtml(invoice.id)}">Receive payment</button>` : ''}${canVoid ? `<button class="action-button danger" data-void-invoice="${escapeHtml(invoice.id)}">Void</button>` : ''}</span></td></tr>`;
    }).join('');
  }

  function canManageClinicServices() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN'].includes(getStoredApiUser()?.role);
  }

  function canDispensePrescriptionMedication() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'PHARMACIST'].includes(getStoredApiUser()?.role);
  }

  function canAdministerMedication() {
    if (!isApiConnected()) return true;
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'NURSE'].includes(getStoredApiUser()?.role);
  }

  async function confirmPrescriptionDispense(medicationId, medicineName, maximumQuantity, requestedPatientId = '', administrationMode = false) {
    const patientId = requestedPatientId || activePatientProfileId;
    if (!patientId || !canDispensePrescriptionMedication()) {
      showToast('You do not have permission to dispense this prescription.');
      return;
    }
    const suggestedQuantity = maximumQuantity > 0 ? maximumQuantity : 1;
    const isNurse = administrationMode || (isApiConnected() && getStoredApiUser()?.role === 'NURSE');
    const action = isNurse ? 'given to the patient' : 'dispensed';
    const entered = window.prompt(`Enter the quantity of ${medicineName} being ${action}:`, String(suggestedQuantity));
    if (entered === null) return;
    const quantity = Number(entered);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      showToast('Enter a whole-number quantity between 1 and 10,000.');
      return;
    }
    if (maximumQuantity > 0 && quantity > maximumQuantity) {
      showToast(`Only ${maximumQuantity} prescribed units remain.`);
      return;
    }
    if (!window.confirm(`Confirm that ${quantity} unit(s) of ${medicineName} are being ${action} now? This will deduct stock.`)) return;

    if (isApiConnected()) {
      const dispense = await apiRequest(`/prescription-medications/${encodeURIComponent(medicationId)}/dispense`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      const medicine = data.medicines.find((entry) => entry.id === dispense.medicineId);
      if (medicine && Number.isFinite(Number(dispense.stockQuantity))) {
        medicine.quantity = Number(dispense.stockQuantity);
      }
      const medication = getPatientRecords(patientId)
        .flatMap((record) => (record.prescriptionVersions || []).flatMap((version) => version.medications || []))
        .find((entry) => entry.id === medicationId);
      if (medication) medication.dispenses = [...(medication.dispenses || []), dispense];
    } else {
      const record = getPatientRecords(patientId).find((entry) =>
        (entry.prescriptionVersions || []).some((version) =>
          (version.medications || []).some((medication) => medication.id === medicationId)));
      const medication = record?.prescriptionVersions
        ?.flatMap((version) => version.medications || [])
        .find((entry) => entry.id === medicationId);
      const medicine = data.medicines.find((entry) => entry.id === medication?.medicineId);
      if (!medication || !medicine) throw new Error('Prescription or linked inventory medicine not found.');
      if (Number(medicine.quantity) < quantity) throw new Error(`Insufficient stock for ${medicine.name}.`);
      const quantityBefore = Number(medicine.quantity);
      medicine.quantity = quantityBefore - quantity;
      medication.dispenses = medication.dispenses || [];
      medication.dispenses.push({
        id: makeId('dispense'),
        quantity,
        createdAt: new Date().toISOString(),
        dispensedBy: { email: getStoredApiUser()?.email || 'Demo clinic staff' },
      });
      data.inventoryMovements.push({
        id: makeId('movement'),
        kind: 'medicine',
        itemId: medicine.id,
        type: 'DISPENSED',
        quantityDelta: -quantity,
        quantityBefore,
        quantityAfter: medicine.quantity,
        reason: `Confirmed prescription dispensing: ${medication.name}`,
        createdAt: new Date().toISOString(),
        recordedBy: getStoredApiUser()?.email || 'Demo clinic staff',
      });
      save();
    }
    const patient = patientById(patientId);
    if (patient && activePatientProfileId === patientId) renderPatientProfile(patient);
    renderMedicines();
    renderReports();
    renderNurseWorkspace();
    showToast(isNurse ? 'Medicine marked as given and stock updated.' : 'Medicine dispensing recorded and stock updated.');
  }

  function renderClinicServices() {
    const panel = document.getElementById('clinicServicesPanel');
    if (!panel) return;
    panel.classList.toggle('hidden', !canCreateInvoices());
    const addButton = document.getElementById('addClinicService');
    if (addButton) addButton.classList.toggle('hidden', !canManageClinicServices());
    const services = [...(data.clinicServices || [])].sort((left, right) =>
      Number(right.active) - Number(left.active) || left.name.localeCompare(right.name));
    document.getElementById('clinicServicesTable').innerHTML = services.map((service) => `
      <tr>
        <td>${escapeHtml(service.name)}</td>
        <td>${escapeHtml(service.code)}</td>
        <td>${money(service.price)}</td>
        <td><span class="status-pill ${service.active ? '' : 'cancelled'}">${service.active ? 'Active' : 'Inactive'}</span></td>
        <td>${canManageClinicServices() ? `<span class="row-actions"><button class="action-button" data-edit-clinic-service="${escapeHtml(service.id)}">Edit</button><button class="action-button" data-toggle-clinic-service="${escapeHtml(service.id)}" data-active="${service.active ? 'false' : 'true'}">${service.active ? 'Deactivate' : 'Activate'}</button></span>` : '—'}</td>
      </tr>
    `).join('');
  }

  function getReportPeriodData() {
    const from = document.getElementById('reportFrom')?.value || '';
    const to = document.getElementById('reportTo')?.value || '';
    const inPeriod = (date) => {
      const value = String(date || '').slice(0, 10);
      if (!value) return !from && !to;
      return (!from || value >= from) && (!to || value <= to);
    };
    const patients = data.patients.filter((patient) => inPeriod(String(patient.createdAt || '').slice(0, 10)));
    const appointments = data.appointments.filter((appointment) => !from && !to || inPeriod(appointment.date));
    const visits = data.patientRecords.filter((record) => !from && !to || inPeriod(record.visitDate));
    const invoices = data.invoices.filter((invoice) => !isInvoiceVoided(invoice) && (!from && !to || inPeriod(invoice.date)));
    const paymentRecords = data.invoices.flatMap((invoice) => {
      const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
      const records = payments.length
        ? payments.map((payment) => ({
            invoice,
            date: paymentDateKey(payment.date || payment.paidAt || invoice.date),
            amount: Number(payment.amount || 0),
            method: payment.method || invoice.paymentMethod || 'Other',
            reference: payment.reference || payment.receiptNumber || '',
          }))
        : Number(invoice.paid || 0) > 0
          ? [{
              invoice,
              date: paymentDateKey(invoice.date),
              amount: Number(invoice.paid),
              method: invoice.paymentMethod || 'Other',
              reference: '',
            }]
          : [];
      return records.filter((payment) => inPeriod(payment.date));
    });
    const total = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const invoicePaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paid || 0), 0);
    const paid = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
    const due = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total || 0) - Number(invoice.paid || 0)), 0);
    const collectionRate = total > 0 ? Math.round(invoicePaid / total * 100) : 0;
    return { from, to, inPeriod, patients, appointments, visits, invoices, paymentRecords, total, invoicePaid, paid, due, collectionRate };
  }

  function getReportTrendRows(from, to) {
    const reportDates = [
      ...data.patients.map((patient) => String(patient.createdAt || '').slice(0, 10)),
      ...data.appointments.map((appointment) => String(appointment.date || '').slice(0, 10)),
      ...data.patientRecords.map((record) => String(record.visitDate || '').slice(0, 10)),
    ].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && (!to || date <= to) && (!from || date >= from)).sort();
    const end = new Date(`${to || dateKey(today)}T00:00:00`);
    const start = from
      ? new Date(`${from}T00:00:00`)
      : reportDates.length
        ? new Date(`${reportDates[0]}T00:00:00`)
        : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    const dayNumber = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const dayCount = Math.floor((dayNumber(end) - dayNumber(start)) / 86400000) + 1;
    if (!Number.isFinite(dayCount) || dayCount <= 0) return { rows: [], granularity: 'day' };
    const granularity = dayCount <= 45 ? 'day' : dayCount <= 180 ? 'week' : 'month';
    const buckets = new Map();
    const dailyCounts = new Map();
    const addDailyCount = (date, field) => {
      const key = String(date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < dateKey(start) || key > dateKey(end)) return;
      const counts = dailyCounts.get(key) || { patients: 0, visits: 0, appointments: 0 };
      counts[field] += 1;
      dailyCounts.set(key, counts);
    };
    data.patients.forEach((patient) => addDailyCount(patient.createdAt, 'patients'));
    data.patientRecords.forEach((record) => addDailyCount(record.visitDate, 'visits'));
    data.appointments.forEach((appointment) => addDailyCount(appointment.date, 'appointments'));
    for (let offset = 0; offset < dayCount; offset += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      const key = dateKey(date);
      const bucketDate = granularity === 'month'
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : granularity === 'week'
          ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))
          : date;
      const bucketKey = dateKey(bucketDate);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          key: bucketKey,
          start: bucketDate,
          end: date,
          patients: 0,
          visits: 0,
          appointments: 0,
        });
      }
      const bucket = buckets.get(bucketKey);
      bucket.end = date;
      const counts = dailyCounts.get(key) || { patients: 0, visits: 0, appointments: 0 };
      bucket.patients += counts.patients;
      bucket.visits += counts.visits;
      bucket.appointments += counts.appointments;
    }
    const rows = [...buckets.values()].map((bucket) => ({
      ...bucket,
      label: granularity === 'month'
        ? bucket.start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        : granularity === 'week'
          ? `${formatDate(dateKey(bucket.start))} — ${formatDate(dateKey(bucket.end))}`
          : bucket.start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    }));
    return { rows, granularity };
  }

  function getReportInventoryRows() {
    const lowMedicines = data.medicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.reorder));
    const lowConsumables = data.consumables.filter((item) => Number(item.quantity) <= Number(item.reorder));
    const expiredMedicines = data.medicines.filter((medicine) => medicine.expiry && medicine.expiry < dateKey(today));
    const expiredConsumables = data.consumables.filter((item) => item.expiry && item.expiry < dateKey(today));
    return [
      ...lowMedicines.map((item) => ({
        type: 'Medicine', name: item.name, category: item.category || 'Uncategorized',
        stock: item.quantity, unit: 'units', minimum: item.reorder, expiry: item.expiry,
        alert: item.expiry && item.expiry < dateKey(today) ? 'Expired / low stock' : 'Low stock',
      })),
      ...expiredMedicines.filter((item) => !lowMedicines.some((low) => low.id === item.id)).map((item) => ({
        type: 'Medicine', name: item.name, category: item.category || 'Uncategorized',
        stock: item.quantity, unit: 'units', minimum: item.reorder, expiry: item.expiry, alert: 'Expired',
      })),
      ...lowConsumables.map((item) => ({
        type: 'Supply', name: item.name, category: item.category || 'Uncategorized',
        stock: item.quantity, unit: item.unit || 'units', minimum: item.reorder, expiry: item.expiry,
        alert: item.expiry && item.expiry < dateKey(today) ? 'Expired / low stock' : 'Low stock',
      })),
      ...expiredConsumables.filter((item) => !lowConsumables.some((low) => low.id === item.id)).map((item) => ({
        type: 'Supply', name: item.name, category: item.category || 'Uncategorized',
        stock: item.quantity, unit: item.unit || 'units', minimum: item.reorder, expiry: item.expiry, alert: 'Expired',
      })),
    ];
  }

  function getReportActivityRows(report) {
    const patientLabel = (patientId) => {
      const patient = patientById(patientId);
      return patient ? `${patient.name}${patient.code ? ` · ${patient.code}` : ''}` : 'Patient';
    };
    return [
      ...report.patients.map((patient) => ({ date: String(patient.createdAt || '').slice(0, 10), activity: 'Patient registered', detail: patient.name, value: patient.code })),
      ...report.appointments.map((appointment) => ({ date: appointment.date, activity: 'Appointment', detail: patientLabel(appointment.patientId), value: `${appointment.status} · ${appointment.time || ''}` })),
      ...report.visits.map((visit) => ({ date: visit.visitDate, activity: 'Clinic visit', detail: patientLabel(visit.patientId), value: `${visit.doctorName || 'Doctor not recorded'} · ${visit.diagnosis || visit.encounterType || 'Visit'}` })),
      ...report.invoices.map((invoice) => ({ date: invoice.date, activity: 'Invoice', detail: patientLabel(invoice.patientId), value: `${invoice.number} · ${money(invoice.total)} · ${invoiceStatus(invoice)}` })),
      ...report.paymentRecords.map((payment) => ({ date: payment.date, activity: 'Payment received', detail: patientLabel(payment.invoice.patientId), value: `${payment.invoice.number} · ${payment.method} · ${money(payment.amount)}` })),
    ].filter((event) => event.date).sort((left, right) => String(right.date).localeCompare(String(left.date)));
  }

  function renderReports() {
    const report = getReportPeriodData();
    const { from, to, patients, appointments, visits, invoices, paymentRecords, total, paid, due, collectionRate } = report;
    const type = document.getElementById('reportTypeFilter')?.value || 'all';
    document.getElementById('reportPeriodLabel').textContent = from || to
      ? `${from ? formatDate(from) : 'Start'} — ${to ? formatDate(to) : 'Latest'}`
      : 'All clinic records';
    document.getElementById('reportPatients').textContent = patients.length.toLocaleString('en-IN');
    document.getElementById('reportAppointments').textContent = appointments.length.toLocaleString('en-IN');
    document.getElementById('reportVisits').textContent = visits.length.toLocaleString('en-IN');
    document.getElementById('reportInvoices').textContent = invoices.length.toLocaleString('en-IN');
    document.getElementById('reportPaidTotal').textContent = money(paid);
    document.getElementById('reportDueTotal').textContent = money(due);
    document.getElementById('reportInvoiceTotal').textContent = money(total);
    document.getElementById('reportCollectedSummary').textContent = money(paid);
    document.getElementById('reportOutstandingSummary').textContent = money(due);
    document.getElementById('reportCollectionRate').textContent = `${collectionRate}%`;
    document.getElementById('reportCollectionBar').style.width = `${collectionRate}%`;
    document.getElementById('reportBillingStatus').textContent = invoices.length ? `${invoices.length} invoices` : 'No invoices';
    const completedAppointments = appointments.filter((appointment) => appointment.status === 'Completed').length;
    const cancelledAppointments = appointments.filter((appointment) => appointment.status === 'Cancelled').length;
    const alertCount = getReportInventoryRows().length;
    document.getElementById('reportFindingPatients').textContent = `${patients.length} registrations`;
    document.getElementById('reportFindingPatientsDetail').textContent = `${patients.filter((patient) => String(patient.createdAt || '').slice(0, 10) === dateKey(today)).length} registered today`;
    document.getElementById('reportFindingVisits').textContent = `${visits.length} clinic visits`;
    document.getElementById('reportFindingVisitsDetail').textContent = `${completedAppointments} completed · ${cancelledAppointments} cancelled appointments`;
    document.getElementById('reportFindingFinance').textContent = `${collectionRate}% of invoice value paid`;
    document.getElementById('reportFindingFinanceDetail').textContent = `${money(paid)} received in period · ${money(due)} due`;
    document.getElementById('reportFindingAlerts').textContent = `${alertCount} alerts`;
    document.getElementById('reportFindingAlertsDetail').textContent = alertCount ? 'Review low stock or expiry items' : 'No low-stock or expiry alerts';
    document.getElementById('reportHealthBadge').textContent = collectionRate >= 80 && alertCount === 0 ? 'Healthy' : collectionRate >= 50 ? 'Needs review' : 'Attention required';
    document.getElementById('reportHealthBadge').className = `report-section-badge ${collectionRate < 50 || alertCount > 0 ? 'warning' : ''}`;
    document.getElementById('reportAnalysisText').innerHTML = [
      `<p><b>Patient growth:</b> ${patients.length} patient registrations were recorded in this period${visits.length ? `, alongside ${visits.length} clinical encounters` : ''}.</p>`,
      `<p><b>Billing position:</b> ${money(total)} was invoiced in this period and ${money(paid)} was received in this period. Current balance on these invoices is ${money(due)}; ${collectionRate}% of their value has been paid to date.</p>`,
      `<p><b>Operational position:</b> ${completedAppointments} appointments were completed and ${cancelledAppointments} cancelled. ${alertCount ? `${alertCount} medicine or supply items require stock or expiry review.` : 'No medicine or supply expiry/low-stock alert is currently detected.'}</p>`,
    ].join('');

    const appointmentStatuses = ['Scheduled', 'Completed', 'Checked-in', 'In progress', 'Cancelled', 'No show'];
    document.getElementById('reportAppointmentBreakdown').innerHTML = appointmentStatuses.map((status) => {
      const count = appointments.filter((appointment) => (appointment.status || 'Scheduled') === status).length;
      const percentage = appointments.length ? Math.round(count / appointments.length * 100) : 0;
      return `<div class="report-status-row"><span>${escapeHtml(status)}</span><div><i style="width:${percentage}%"></i></div><b>${count}</b></div>`;
    }).join('');

    const paidCount = invoices.filter((invoice) => Number(invoice.paid) >= Number(invoice.total) && Number(invoice.total) > 0).length;
    const partialCount = invoices.filter((invoice) => Number(invoice.paid) > 0 && Number(invoice.paid) < Number(invoice.total)).length;
    const unpaidCount = invoices.filter((invoice) => Number(invoice.paid) <= 0).length;
    document.getElementById('reportInvoiceBreakdown').innerHTML = [
      ['Paid', paidCount, 'paid'], ['Partially paid', partialCount, 'partial'], ['Unpaid', unpaidCount, 'pending']
    ].map(([label, count, className]) => `<div class="report-status-row ${className}"><span>${escapeHtml(label)}</span><div><i style="width:${invoices.length ? count / invoices.length * 100 : 0}%"></i></div><b>${count}</b></div>`).join('');

    const genderGroups = ['Female', 'Male', 'Other', 'Unspecified'];
    document.getElementById('reportPatientDemographics').innerHTML = genderGroups.map((gender) => {
      const count = patients.filter((patient) => String(patient.gender || 'Unspecified') === gender).length;
      const percentage = patients.length ? Math.round(count / patients.length * 100) : 0;
      return `<div class="report-detail-row"><span>${escapeHtml(gender)}</span><div class="report-detail-bar"><i style="width:${percentage}%"></i></div><b>${count}</b><small>${percentage}%</small></div>`;
    }).join('');

    const doctorNames = [...new Set([
      ...appointments.map((appointment) => appointment.doctor).filter(Boolean),
      ...visits.map((visit) => visit.doctorName).filter(Boolean),
    ])].sort((left, right) => left.localeCompare(right));
    document.getElementById('reportDoctorWorkload').innerHTML = doctorNames.length
      ? doctorNames.map((doctor) => {
          const appointmentCount = appointments.filter((appointment) => appointment.doctor === doctor).length;
          const visitCount = visits.filter((visit) => visit.doctorName === doctor).length;
          const maximum = Math.max(1, ...doctorNames.map((name) => appointments.filter((item) => item.doctor === name).length + visits.filter((item) => item.doctorName === name).length));
          const workload = appointmentCount + visitCount;
          return `<div class="report-detail-row"><span>${escapeHtml(doctor)}</span><div class="report-detail-bar"><i style="width:${workload / maximum * 100}%"></i></div><b>${workload}</b><small>${appointmentCount} appt · ${visitCount} visits</small></div>`;
        }).join('')
      : '<div class="report-empty-detail">No doctor activity recorded in this period.</div>';

    const paymentMethods = {};
    let paymentTotal = 0;
    paymentRecords.forEach((payment) => {
      const method = payment.method || 'Other';
      paymentMethods[method] = (paymentMethods[method] || 0) + payment.amount;
      paymentTotal += payment.amount;
    });
    const methodEntries = Object.entries(paymentMethods);
    document.getElementById('reportPaymentMethods').innerHTML = methodEntries.length
      ? methodEntries.sort((left, right) => right[1] - left[1]).map(([method, amount]) => `<div class="report-detail-row"><span>${escapeHtml(method)}</span><div class="report-detail-bar"><i style="width:${paymentTotal ? amount / paymentTotal * 100 : 0}%"></i></div><b>${money(amount)}</b><small>${paymentTotal ? Math.round(amount / paymentTotal * 100) : 0}%</small></div>`).join('')
      : '<div class="report-empty-detail">No payment transactions in this period.</div>';

    const trend = getReportTrendRows(from, to);
    const trendRows = trend.rows;
    const trendDescription = trend.granularity === 'day' ? 'Daily activity for the selected period'
      : trend.granularity === 'week' ? 'Weekly activity for the selected period'
        : 'Monthly activity for the selected period';
    document.getElementById('reportTrendCaption').textContent = trendDescription;
    const trendMaximum = Math.max(1, ...trendRows.flatMap((row) => [row.patients, row.visits, row.appointments]));
    document.getElementById('reportActivityTrend').innerHTML = trendRows.length
      ? trendRows.map((row) => `<div class="report-trend-day" title="${escapeHtml(`${row.label}: ${row.patients} patients, ${row.visits} visits, ${row.appointments} appointments`)}"><div class="report-trend-bars"><i class="patients" style="height:${row.patients / trendMaximum * 100}%"></i><i class="visits" style="height:${row.visits / trendMaximum * 100}%"></i><i class="appointments" style="height:${row.appointments / trendMaximum * 100}%"></i></div><b>${escapeHtml(row.label)}</b><small>P ${row.patients} · V ${row.visits} · A ${row.appointments}</small></div>`).join('')
      : '<div class="report-empty-detail">No activity recorded in this period.</div>';

    const lowMedicines = data.medicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.reorder));
    const lowConsumables = data.consumables.filter((item) => Number(item.quantity) <= Number(item.reorder));
    document.getElementById('reportMedicineUnits').textContent = data.medicines.reduce((sum, medicine) => sum + Number(medicine.quantity || 0), 0).toLocaleString('en-IN');
    document.getElementById('reportConsumableUnits').textContent = data.consumables.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString('en-IN');
    document.getElementById('reportLowMedicineCount').textContent = lowMedicines.length;
    document.getElementById('reportLowConsumableCount').textContent = lowConsumables.length;
    const inventoryRows = getReportInventoryRows();
    document.getElementById('reportStockAlertCount').textContent = `${inventoryRows.length} alerts`;
    const alerts = inventoryRows.map((item) => ({
      name: item.name,
      type: `${item.alert.includes('Expired') ? 'Expired' : 'Low'} ${item.type.toLowerCase()}`,
      detail: [
        item.expiry && item.expiry < dateKey(today) ? `Expired ${formatDate(item.expiry)}` : '',
        Number(item.stock) <= Number(item.minimum) ? `${item.stock} ${item.unit} remaining` : '',
      ].filter(Boolean).join(' · '),
    }));
    document.getElementById('reportInventoryAlerts').innerHTML = alerts.length
      ? alerts.slice(0, 8).map((alert) => `<div><span>${escapeHtml(alert.type)}</span><b>${escapeHtml(alert.name)}</b><small>${escapeHtml(alert.detail)}</small></div>`).join('')
      : '<div class="report-empty-alert"><b>Inventory is within configured levels</b><small>No low-stock or expired items detected.</small></div>';

    document.getElementById('reportInvoiceRegister').innerHTML = invoices.length
      ? invoices.slice().sort((left, right) => String(right.date).localeCompare(String(left.date))).map((invoice) => {
          const balance = isInvoiceVoided(invoice) ? 0 : Math.max(0, Number(invoice.total) - Number(invoice.paid));
          const patient = patientById(invoice.patientId);
          return `<tr><td><b>${escapeHtml(invoice.number)}</b></td><td>${escapeHtml(formatDate(invoice.date))}</td><td>${escapeHtml(patient?.name || 'Patient unavailable')}${patient?.code ? `<small>Patient ID: ${escapeHtml(patient.code)}</small>` : ''}</td><td>${money(invoice.total)}</td><td>${money(invoice.paid)}</td><td>${money(balance)}</td><td><span class="status-pill ${balance === 0 ? '' : 'pending'}">${escapeHtml(invoiceStatus(invoice))}</span></td></tr>`;
        }).join('')
      : '<tr><td colspan="7"><div class="empty-state"><b>No invoices in this period</b><p>Change the reporting period or create a billing record.</p></div></td></tr>';

    document.getElementById('reportInventoryRegister').innerHTML = inventoryRows.length
      ? inventoryRows.map((item) => `<tr><td>${escapeHtml(item.type)}</td><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.category)}</td><td>${Number(item.stock)}</td><td>${Number(item.minimum)}</td><td>${item.expiry ? escapeHtml(formatDate(item.expiry)) : 'Not recorded'}</td><td><span class="status-pill low">${escapeHtml(item.alert)}</span></td></tr>`).join('')
      : '<tr><td colspan="7"><div class="empty-state"><b>No inventory alerts</b><p>All tracked medicines and supplies are above configured levels.</p></div></td></tr>';

    const activity = getReportActivityRows(report).slice(0, 12);
    document.getElementById('reportActivityTable').innerHTML = activity.length
      ? activity.map((event) => `<tr><td>${escapeHtml(formatDate(event.date))}</td><td>${escapeHtml(event.activity)}</td><td>${escapeHtml(event.detail)}</td><td>${escapeHtml(event.value)}</td></tr>`).join('')
      : '<tr><td colspan="4"><div class="empty-state"><b>No activity found</b><p>Adjust the reporting period or add clinic records.</p></div></td></tr>';

    document.querySelectorAll('[data-report-section]').forEach((section) => {
      const sectionType = section.dataset.reportSection;
      section.classList.toggle('hidden', type !== 'all' && sectionType !== type && sectionType !== 'all');
    });
  }

  function exportClinicReport() {
    const report = getReportPeriodData();
    const { from, to } = report;
    const inventoryRows = getReportInventoryRows();
    const activityRows = getReportActivityRows(report);
    const rows = [[
      'Section', 'Date', 'Type', 'Reference', 'Patient', 'Details',
      'Amount', 'Paid to date', 'Outstanding', 'Status',
    ]];
    const addRow = (section, date = '', type = '', reference = '', patient = '', detail = '', amount = '', paidToDate = '', outstanding = '', status = '') => {
      rows.push([section, date, type, reference, patient, detail, amount, paidToDate, outstanding, status]);
    };
    addRow('Summary', '', 'Patients registered', '', '', report.patients.length);
    addRow('Summary', '', 'Appointments', '', '', report.appointments.length);
    addRow('Summary', '', 'Clinic visits', '', '', report.visits.length);
    addRow('Summary', '', 'Invoices issued', '', '', report.invoices.length);
    addRow('Summary', '', 'Invoice value', '', '', '', report.total);
    addRow('Summary', '', 'Payments received in period', '', '', '', report.paid);
    addRow('Summary', '', 'Balance on period invoices', '', '', '', '', '', report.due);
    addRow('Summary', '', 'Collection rate on period invoices', '', '', `${report.collectionRate}%`);
    report.patients.forEach((patient) => addRow('Patient registration', String(patient.createdAt || '').slice(0, 10), 'Patient', patient.code, patient.name));
    report.appointments.forEach((appointment) => addRow(
      'Appointment',
      appointment.date,
      appointment.status || 'Scheduled',
      appointment.id,
      patientById(appointment.patientId)?.name || 'Patient',
      `${appointment.doctor || 'Doctor not recorded'} · ${appointment.time || ''}`,
      '',
      '',
      '',
      appointment.status || 'Scheduled',
    ));
    report.visits.forEach((visit) => addRow(
      'Clinic visit',
      visit.visitDate,
      visit.encounterType || 'Visit',
      visit.id,
      patientById(visit.patientId)?.name || 'Patient',
      `${visit.doctorName || 'Doctor not recorded'} · ${visit.diagnosis || ''}`,
    ));
    report.invoices.forEach((invoice) => addRow(
      'Invoice',
      invoice.date,
      'Invoice issued',
      invoice.number,
      patientById(invoice.patientId)?.name || 'Patient',
      'Current paid-to-date amount and balance',
      Number(invoice.total || 0),
      Number(invoice.paid || 0),
      Math.max(0, Number(invoice.total || 0) - Number(invoice.paid || 0)),
      invoiceStatus(invoice),
    ));
    report.paymentRecords.forEach((payment) => addRow(
      'Payment',
      payment.date,
      payment.method,
      payment.reference || payment.invoice.number,
      patientById(payment.invoice.patientId)?.name || 'Patient',
      `Receipt for invoice ${payment.invoice.number}`,
      payment.amount,
    ));
    const paymentMethods = {};
    report.paymentRecords.forEach((payment) => {
      const method = payment.method || 'Other';
      paymentMethods[method] = (paymentMethods[method] || 0) + payment.amount;
    });
    Object.entries(paymentMethods).forEach(([method, amount]) => addRow('Payment method summary', '', method, '', '', 'Received in selected period', amount));
    ['Scheduled', 'Completed', 'Checked-in', 'In progress', 'Cancelled', 'No show'].forEach((status) => {
      const count = report.appointments.filter((appointment) => (appointment.status || 'Scheduled') === status).length;
      addRow('Appointment status summary', '', status, '', '', 'Appointments', count);
    });
    ['Female', 'Male', 'Other', 'Unspecified'].forEach((gender) => {
      const count = report.patients.filter((patient) => String(patient.gender || 'Unspecified') === gender).length;
      addRow('Patient demographics', '', gender, '', '', 'Registered patients', count);
    });
    inventoryRows.forEach((item) => addRow(
      'Inventory alert',
      item.expiry || '',
      item.type,
      '',
      '',
      `${item.name} · ${item.category}`,
      item.stock,
      '',
      '',
      item.alert,
    ));
    activityRows.forEach((event) => addRow('Activity register', event.date, event.activity, '', event.detail, event.value));
    const csv = rows.map((row) => row.map((value) => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `csk-clinic-report-${from || 'all'}-${to || 'latest'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Clinic report exported.');
  }

  function getGlobalSearchMatches(query) {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const matches = [];
    data.patients.filter((patient) => [patient.name, patient.code, patient.phone, patient.email].some((value) => String(value || '').toLowerCase().includes(term)))
      .forEach((patient) => matches.push({
        section: 'patients',
        searchId: 'patientSearch',
        query: patient.name,
        type: 'Patient',
        title: patient.name,
        detail: `${patient.code || 'No ID'} · ${patient.phone || 'No phone'}`,
      }));
    data.appointments.filter((appointment) => {
      const name = patientById(appointment.patientId)?.name || '';
      return `${name} ${appointment.doctor} ${appointment.department} ${appointment.reason}`.toLowerCase().includes(term);
    }).forEach((appointment) => {
      const name = patientById(appointment.patientId)?.name || 'Unknown patient';
      matches.push({
        section: 'appointments',
        searchId: 'appointmentSearch',
        query: name,
        type: 'Appointment',
        title: name,
        detail: `${formatDate(appointment.date)} · ${formatTime(appointment.time)} · ${appointment.doctor}`,
      });
    });
    data.invoices.filter((invoice) => {
      const name = patientById(invoice.patientId)?.name || '';
      return `${invoice.number} ${name}`.toLowerCase().includes(term);
    }).forEach((invoice) => {
      matches.push({
        section: 'billing',
        searchId: 'invoiceSearch',
        query: invoice.number,
        type: 'Invoice',
        title: invoice.number,
        detail: `${patientById(invoice.patientId)?.name || 'Unknown patient'} · ${money(invoice.total)}`,
      });
    });
    data.medicines.filter((medicine) => `${medicine.name} ${medicine.category} ${medicine.batch}`.toLowerCase().includes(term))
      .forEach((medicine) => matches.push({
        section: 'pharmacy',
        searchId: 'medicineSearch',
        query: medicine.name,
        type: 'Medicine',
        title: medicine.name,
        detail: `${medicine.category || 'Medicine'} · ${Number(medicine.quantity)} in stock`,
      }));
    return matches.slice(0, 8);
  }

  function renderGlobalSearchResults(query) {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('globalSearchResults');
    const term = query.trim();
    if (!term) {
      results.replaceChildren();
      results.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      return;
    }

    const matches = getGlobalSearchMatches(term);
    results.innerHTML = matches.length
      ? matches.map((match, index) => `<button type="button" class="global-search-result" role="option" aria-selected="${index === 0 ? 'true' : 'false'}" data-global-search-result data-section="${match.section}" data-search-id="${match.searchId}" data-query="${escapeHtml(match.query)}"><span><b>${escapeHtml(match.title)}</b><small>${escapeHtml(match.detail)}</small></span><i>${match.type}</i></button>`).join('')
      : '<div class="global-search-empty" role="status">No matching patients, appointments, invoices, or medicines.</div>';
    results.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
  }

  function closeGlobalSearchResults() {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('globalSearchResults');
    results.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
  }

  function selectGlobalSearchResult(result) {
    const section = result.dataset.section;
    const searchId = result.dataset.searchId;
    const field = document.getElementById(searchId);
    if (!field) return;
    showView(section);
    field.value = result.dataset.query || '';
    ({ patientSearch: renderPatients, appointmentSearch: renderAppointments, invoiceSearch: renderInvoices, medicineSearch: renderMedicines })[searchId]();
    document.getElementById('globalSearch').value = '';
    closeGlobalSearchResults();
  }

  function printClinicSummary() {
    const report = getReportPeriodData();
    const { from, to, patients, appointments, visits, invoices, paymentRecords, total, invoicePaid, paid, due, collectionRate } = report;
    const inventoryRows = getReportInventoryRows();
    const activityRows = getReportActivityRows(report);
    const appointmentStatuses = ['Scheduled', 'Completed', 'Checked-in', 'In progress', 'Cancelled', 'No show'];
    const genderGroups = ['Female', 'Male', 'Other', 'Unspecified'];
    const doctorNames = [...new Set([
      ...appointments.map((appointment) => appointment.doctor).filter(Boolean),
      ...visits.map((visit) => visit.doctorName).filter(Boolean),
    ])].sort((left, right) => left.localeCompare(right));
    const paymentMethods = {};
    paymentRecords.forEach((payment) => {
      const method = payment.method || 'Other';
      paymentMethods[method] = (paymentMethods[method] || 0) + payment.amount;
    });
    const table = (title, headers, rows) => `<section class="print-report-section"><h3>${escapeHtml(title)}</h3><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.length
      ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}">No records in this section.</td></tr>`}</tbody></table></section>`;
    const invoiceRows = invoices.slice().sort((left, right) => String(right.date).localeCompare(String(left.date))).map((invoice) => [
      invoice.number,
      formatDate(invoice.date),
      patientById(invoice.patientId)?.name || 'Patient unavailable',
      money(invoice.total),
      money(invoice.paid),
      money(Math.max(0, Number(invoice.total) - Number(invoice.paid))),
      invoiceStatus(invoice),
    ]);
    const paymentRows = paymentRecords.map((payment) => [
      formatDate(payment.date),
      payment.invoice.number,
      patientById(payment.invoice.patientId)?.name || 'Patient unavailable',
      payment.method,
      money(payment.amount),
    ]);
    const inventoryTableRows = inventoryRows.map((item) => [
      item.type,
      item.name,
      item.category,
      `${Number(item.stock)}`,
      `${Number(item.minimum)}`,
      item.expiry ? formatDate(item.expiry) : 'Not recorded',
      item.alert,
    ]);
    const activityTableRows = activityRows.map((event) => [
      formatDate(event.date),
      event.activity,
      event.detail,
      event.value,
    ]);
    const metrics = [
      ['Patients registered', patients.length.toLocaleString('en-IN')],
      ['Appointments', appointments.length.toLocaleString('en-IN')],
      ['Clinic visits', visits.length.toLocaleString('en-IN')],
      ['Invoices issued', invoices.length.toLocaleString('en-IN')],
      ['Invoice value for period', money(total)],
      ['Payments received in period', money(paid)],
      ['Paid to date on period invoices', money(invoicePaid)],
      ['Outstanding on period invoices', money(due)],
      ['Paid-to-date collection rate', `${collectionRate}%`],
      ['Current inventory alerts', inventoryRows.length.toLocaleString('en-IN')],
    ];
    const root = document.getElementById('printRoot');
    const periodLabel = from || to ? `${from ? formatDate(from) : 'Start'} — ${to ? formatDate(to) : 'Latest'}` : 'All clinic records';
    const appointmentRows = appointmentStatuses.map((status) => [
      status,
      String(appointments.filter((appointment) => (appointment.status || 'Scheduled') === status).length),
    ]);
    const demographicRows = genderGroups.map((gender) => [
      gender,
      String(patients.filter((patient) => String(patient.gender || 'Unspecified') === gender).length),
    ]);
    const doctorRows = doctorNames.map((doctor) => [
      doctor,
      String(appointments.filter((appointment) => appointment.doctor === doctor).length),
      String(visits.filter((visit) => visit.doctorName === doctor).length),
    ]);
    const methodRows = Object.entries(paymentMethods).sort((left, right) => right[1] - left[1]).map(([method, amount]) => [
      method,
      money(amount),
    ]);
    root.innerHTML = `<article class="print-report"><header><h1>${escapeHtml(data.settings.clinicName || 'CSK Clinic')}</h1><h2>Clinic activity report</h2><p>Reporting period: ${escapeHtml(periodLabel)}</p><p>Generated ${escapeHtml(formatDate(dateKey(today)))}</p></header><p class="print-report-note">Invoice value and invoice balances are based on invoice dates in this period. Payments received are based on payment dates in this period. Collection rate is paid-to-date value against invoices issued in this period.</p><dl>${metrics.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${table('Appointment status', ['Status', 'Appointments'], appointmentRows)}${table('Patient demographics', ['Gender', 'Patients'], demographicRows)}${table('Doctor workload', ['Practitioner', 'Appointments', 'Visits'], doctorRows)}${table('Payment methods received in period', ['Method', 'Amount'], methodRows)}${table('Invoice register', ['Invoice', 'Date', 'Patient', 'Total', 'Paid to date', 'Balance', 'Status'], invoiceRows)}${table('Payment register', ['Date', 'Invoice', 'Patient', 'Method', 'Amount'], paymentRows)}${table('Inventory alerts', ['Type', 'Item', 'Category', 'Stock', 'Minimum', 'Expiry', 'Alert'], inventoryTableRows)}${table('Clinic activity register', ['Date', 'Activity', 'Patient / detail', 'Value / status'], activityTableRows)}</article>`;
    root.insertAdjacentHTML('beforeend', '<div class="print-toolbar"><span>Print preview</span><button type="button" data-close-print-preview>Close preview</button><button type="button" class="button button-primary" data-print-document>Print report</button></div>');
  }
  function updatePatientOptions() {
    document.querySelectorAll('select[name="patientId"]').forEach((select) => {
      const selected = select.value;
      select.innerHTML = '<option value="">Select a patient</option>' + data.patients.filter((patient) => patient.status === 'Active').map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(patient.name)} · ${escapeHtml(patient.code)}</option>`).join('');
      if (data.patients.some((patient) => patient.id === selected && patient.status === 'Active')) select.value = selected;
    });
  }

  function bindAppointmentPatientSearch() {
    const search = document.getElementById('appointmentPatientSearch');
    const patientSelect = document.querySelector('#appointmentForm [name="patientId"]');
    const mobile = document.querySelector('#appointmentForm [name="patientMobile"]');
    if (!search || !patientSelect || !mobile) return;
    search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      const phoneTerm = patientPhoneKey(term);
      const match = data.patients.find((patient) => patient.status === 'Active' && (
        term && ([patient.name, patient.code, patient.phone].some((value) => String(value || '').toLowerCase().includes(term)) ||
          (phoneTerm && patientPhoneKey(patient.phone).includes(phoneTerm)))
      ));
      if (match) {
        patientSelect.value = match.id;
        mobile.value = match.phone || '';
        search.setAttribute('aria-label', `Matched ${match.name}`);
      } else {
        search.removeAttribute('aria-label');
      }
    });
    patientSelect.addEventListener('change', () => {
      const patient = data.patients.find((item) => item.id === patientSelect.value);
      if (patient) {
        mobile.value = patient.phone || '';
        search.value = `${patient.name} · ${patient.code}`;
      }
    });
  }
  function renderSettings() {
    const form = document.getElementById('settingsForm');
    Object.entries(data.settings).forEach(([name, value]) => {
      if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value || '';
    });
    renderVitalReferenceRanges();
  }

  const vitalReferenceMetrics = [
    { key: 'systolicMmHg', label: 'Systolic BP', unit: 'mmHg' },
    { key: 'diastolicMmHg', label: 'Diastolic BP', unit: 'mmHg' },
    { key: 'pulseBpm', label: 'Pulse rate', unit: 'BPM' },
    { key: 'temperatureC', label: 'Temperature', unit: '°C' },
    { key: 'respiratoryRateBpm', label: 'Respiratory rate', unit: 'breaths/min' },
    { key: 'spo2Percent', label: 'SpO2', unit: '%' },
    { key: 'heightCm', label: 'Height', unit: 'cm' },
    { key: 'weightKg', label: 'Weight', unit: 'kg' },
    { key: 'bmi', label: 'BMI', unit: 'kg/m²' },
    { key: 'cbgMgDl', label: 'CBG', unit: 'mg/dL' },
  ];

  function vitalReferenceRangeRowMarkup(range = {}) {
    const metric = vitalReferenceMetrics.find((item) => item.key === range.metric) || vitalReferenceMetrics[0];
    return `<tr data-vital-range-row>
      <td><select data-vital-range-metric aria-label="Vital metric">${vitalReferenceMetrics.map((item) => `<option value="${item.key}" ${metric.key === item.key ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select></td>
      <td><input data-vital-range-min-age type="number" min="0" max="130" step="0.1" value="${range.minAgeYears ?? ''}" aria-label="Minimum age in years" /></td>
      <td><input data-vital-range-max-age type="number" min="0" max="130" step="0.1" value="${range.maxAgeYears ?? ''}" aria-label="Maximum age in years" /></td>
      <td><input data-vital-range-low type="number" step="any" value="${range.low ?? ''}" aria-label="Low threshold" /></td>
      <td><input data-vital-range-high type="number" step="any" value="${range.high ?? ''}" aria-label="High threshold" /></td>
      <td data-vital-range-unit>${escapeHtml(metric.unit)}</td>
      <td><button class="action-button danger" type="button" data-remove-vital-range aria-label="Remove reference range">Remove</button></td>
    </tr>`;
  }

  function renderVitalReferenceRanges() {
    const panel = document.getElementById('vitalReferenceRangePanel');
    const body = document.getElementById('vitalReferenceRangesBody');
    if (!panel || !body) return;
    panel.classList.toggle('hidden', !canManageClinicSettings());
    const ranges = Array.isArray(data.settings.vitalReferenceRanges) ? data.settings.vitalReferenceRanges : [];
    body.innerHTML = ranges.length
      ? ranges.map(vitalReferenceRangeRowMarkup).join('')
      : '<tr><td colspan="7" class="vital-range-empty">No ranges configured. Readings will show “Not configured.”</td></tr>';
  }

  function readVitalReferenceRanges() {
    const body = document.getElementById('vitalReferenceRangesBody');
    const ranges = [];
    body.querySelectorAll('[data-vital-range-row]').forEach((row) => {
      const metric = row.querySelector('[data-vital-range-metric]').value;
      const values = {
        minAgeYears: row.querySelector('[data-vital-range-min-age]').value,
        maxAgeYears: row.querySelector('[data-vital-range-max-age]').value,
        low: row.querySelector('[data-vital-range-low]').value,
        high: row.querySelector('[data-vital-range-high]').value,
      };
      if (Object.values(values).every((value) => value === '')) return;
      if (Object.values(values).some((value) => value === '')) {
        throw new Error('Complete every age and threshold field for each reference range.');
      }
      const range = {
        metric,
        minAgeYears: Number(values.minAgeYears),
        maxAgeYears: Number(values.maxAgeYears),
        low: Number(values.low),
        high: Number(values.high),
      };
      if (
        !Object.values(range).slice(1).every(Number.isFinite)
        || range.minAgeYears < 0
        || range.maxAgeYears > 130
        || range.minAgeYears > range.maxAgeYears
        || range.low >= range.high
      ) {
        throw new Error('Check each reference range: ages must be 0–130 years and low must be below high.');
      }
      ranges.push(range);
    });
    const byMetric = new Map();
    ranges.forEach((range) => {
      const group = byMetric.get(range.metric) || [];
      group.push(range);
      byMetric.set(range.metric, group);
    });
    for (const [metric, group] of byMetric) {
      group.sort((left, right) => left.minAgeYears - right.minAgeYears);
      for (let index = 1; index < group.length; index += 1) {
        if (group[index].minAgeYears <= group[index - 1].maxAgeYears) {
          throw new Error(`Age ranges for ${metric} overlap.`);
        }
      }
    }
    return ranges;
  }
  function renderAll() {
    updateApiStatusText();
    const hasDoctorAccess = canAccessDoctorWorkspace();
    document.getElementById('doctorWorkspaceOption')?.classList.toggle('hidden', !hasDoctorAccess);
    document.getElementById('doctorMedicinesOption')?.classList.toggle('hidden', !hasDoctorAccess);
    if (WORKSPACE_MODE === 'doctor') {
      setWorkspaceAccessDenied(!hasDoctorAccess);
      if (hasDoctorAccess) {
        renderDoctorWorkspace();
        renderMedicines();
      }
      return;
    }
    if (WORKSPACE_MODE === 'front-office') {
      document.getElementById('doctorWorkspaceNav')?.classList.add('hidden');
    }
    toggleAppointmentApiFields();
    renderOverview();
    renderPatients();
    renderAppointments();
    if (WORKSPACE_MODE !== 'front-office') renderDoctorWorkspace();
    renderNurseWorkspace();
    renderConsumables();
    renderMedicines();
    renderInvoices();
    renderPharmacyDashboard();
    renderClinicServices();
    renderReports();
    renderPatientDrafts();
    updatePatientOptions();
    renderSettings();
  }

  function updateResponsiveTableLabels(table) {
    if (!table) return;
    const headers = [...table.querySelectorAll('thead tr:last-child th')].map((header) => header.textContent.trim());
    table.querySelectorAll('tbody tr').forEach((row) => {
      [...row.cells].forEach((cell, index) => {
        if (cell.hasAttribute('colspan')) return;
        const label = headers[index] || (cell.querySelector('button') ? 'Actions' : '');
        if (label) cell.dataset.label = label;
        else cell.removeAttribute('data-label');
      });
    });
  }

  const responsiveTableObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      updateResponsiveTableLabels(record.target.closest('.table-scroll table'));
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('.table-scroll table')) updateResponsiveTableLabels(node);
        node.querySelectorAll('.table-scroll table').forEach(updateResponsiveTableLabels);
      });
    });
  });
  document.querySelectorAll('.table-scroll table').forEach(updateResponsiveTableLabels);
  responsiveTableObserver.observe(document.body, { childList: true, subtree: true });

  function resetForm(form) {
    form.reset();
    const hiddenId = form.elements.namedItem('id');
    if (hiddenId) hiddenId.value = '';
  }
  async function openPatientEditor(id, draftId) {
    const form = document.getElementById('patientForm');
    resetForm(form);
    patientIdPreview = '';
    let patient = data.patients.find((item) => item.id === id);
    if (patient && isApiConnected()) {
      try {
        patient = normalizeApiPatient(await apiRequest(`/patients/${encodeURIComponent(id)}`));
      } catch (error) {
        console.error('Unable to load patient details for editing.', error);
        showToast(error.message || 'Unable to load patient details.');
        return;
      }
    }
    const draft = data.patientDrafts.find((item) => item.id === draftId);
    document.getElementById('patientModalTitle').textContent = patient ? 'Edit patient record' : 'Register patient';
    form.elements.namedItem('id').value = patient?.id || '';
    form.elements.namedItem('draftId').value = draft?.id || '';
    const values = patient || draft;
    if (values) Object.entries(values).forEach(([name, value]) => {
      if (name === 'id' || name === 'createdAt' || name === 'updatedAt' || name === 'status' || name === 'code') return;
      const field = form.elements.namedItem(name);
      if (field) field.value = value ?? '';
    });
    const fullName = String(values?.name || values?.fullName || '');
    const nameParts = fullName.trim().split(/\s+/);
    if (!values?.firstName) form.elements.namedItem('firstName').value = nameParts.shift() || '';
    if (!values?.lastName) form.elements.namedItem('lastName').value = nameParts.join(' ');
    document.getElementById('savePatientDraft').disabled = !!patient;
    document.getElementById('savePatientDraft').title = patient ? 'Drafts are for new patient registrations.' : '';
    document.getElementById('patientDuplicateWarning').classList.add('hidden');
    ['firstName', 'phone'].forEach((name) => {
      const field = form.elements.namedItem(name);
      delete field.dataset.touched;
      field.setCustomValidity('');
    });
    form.elements.namedItem('dob').max = dateKey(today);
    setPatientFormStep(0);
    document.getElementById('patientPhotoFile').value = '';
    updatePatientIdentityValidity(form);
    updatePatientRegistrationPreview();
    updatePatientDuplicateWarning();
    openModal('patientModal');
    if (!id && isApiConnected()) {
      try {
        const preview = await apiRequest('/patients/next-id');
        if (!form.elements.namedItem('id').value && !document.getElementById('patientModal').classList.contains('hidden')) {
          patientIdPreview = preview.patientCode;
          updatePatientRegistrationPreview();
        }
      } catch (error) {
        console.error('Unable to load the next patient ID preview.', error);
        showToast('Patient ID preview could not be loaded. It will be assigned automatically on save.');
      }
    }
  }

  async function savePatientDraft() {
    const form = document.getElementById('patientForm');
    const fields = new FormData(form);
    const payload = apiPatientDraftPayload(fields);
    const existingDraftId = String(fields.get('draftId') || '');
    try {
      if (isApiConnected()) {
        const draft = await apiRequest(existingDraftId
          ? `/patients/drafts/${encodeURIComponent(existingDraftId)}`
          : '/patients/drafts', {
          method: existingDraftId ? 'PATCH' : 'POST',
          body: JSON.stringify({ payload }),
        });
        const normalized = normalizeApiPatientDraft(draft);
        data.patientDrafts = data.patientDrafts.filter((item) => item.id !== normalized.id).concat(normalized);
        form.elements.namedItem('draftId').value = normalized.id;
      } else {
        const draft = {
          id: existingDraftId || makeId('patient-draft'),
          ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [
            ({ fullName: 'name', mobile: 'phone', dateOfBirth: 'dob', allergies: 'notes' })[key] || key,
            key === 'gender' ? String(value).replace(/_/g, ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase()) : value,
          ])),
          createdAt: data.patientDrafts.find((item) => item.id === existingDraftId)?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.patientDrafts = data.patientDrafts.filter((item) => item.id !== draft.id).concat(draft);
        form.elements.namedItem('draftId').value = draft.id;
        save();
      }
      renderPatients();
      renderPatientDrafts();
      closeModal(document.getElementById('patientModal'));
      showToast('Patient registration draft saved.');
    } catch (error) {
      console.error('Unable to save patient registration draft.', error);
      showToast(error.message || 'Unable to save patient draft.');
    }
  }

  async function deletePatientDraft(draftId) {
    const draft = data.patientDrafts.find((item) => item.id === draftId);
    if (!draft || !window.confirm(`Delete the registration draft for ${draft.name || 'this patient'}? This cannot be undone.`)) return;
    try {
      if (isApiConnected()) {
        await apiRequest(`/patients/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
      }
      data.patientDrafts = data.patientDrafts.filter((item) => item.id !== draftId);
      if (!isApiConnected()) save();
      renderPatients();
      renderPatientDrafts();
      showToast('Patient draft deleted.');
    } catch (error) {
      console.error('Unable to delete patient registration draft.', error);
      showToast(error.message || 'Unable to delete patient draft.');
    }
  }

  function openMedicineEditor(id) {
    const form = document.getElementById('medicineForm');
    resetForm(form);
    const medicine = data.medicines.find((item) => item.id === id);
    document.getElementById('medicineModalTitle').textContent = medicine ? 'Edit medicine' : 'Add medicine';
    if (medicine) Object.entries(medicine).forEach(([name, value]) => { if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value ?? ''; });
    openModal('medicineModal');
  }

  function openClinicServiceEditor(id = '') {
    if (!canManageClinicServices()) {
      showToast('Only clinic administrators can manage service charges.');
      return;
    }
    const form = document.getElementById('clinicServiceForm');
    resetForm(form);
    const service = data.clinicServices.find((item) => item.id === id);
    document.getElementById('clinicServiceModalTitle').textContent = service ? 'Edit clinic service' : 'Add clinic service';
    form.elements.namedItem('id').value = service?.id || '';
    form.elements.namedItem('code').value = service?.code || '';
    form.elements.namedItem('code').readOnly = Boolean(service);
    form.elements.namedItem('name').value = service?.name || '';
    form.elements.namedItem('price').value = service?.price ?? '';
    openModal('clinicServiceModal');
  }

  function addInvoiceLine(item = {}) {
    const row = document.createElement('div');
    row.className = 'invoice-line';
    const options = ['<option value="">Select medicine, supply or service</option>', '<option value="consultation">Consultation</option>', ...data.clinicServices.filter((service) => service.active !== false).map((service) => `<option value="service:${escapeHtml(service.id)}">${escapeHtml(service.name)} · ${money(service.price)}</option>`), ...data.medicines.filter((medicine) => medicine.active !== false).map((medicine) => `<option value="${escapeHtml(medicine.id)}">${escapeHtml(medicine.name)} · ${money(medicine.price)} · ${Number(medicine.quantity)} in stock</option>`), ...data.consumables.filter((supply) => supply.active !== false).map((supply) => `<option value="consumable:${escapeHtml(supply.id)}">${escapeHtml(supply.category)} · ${escapeHtml(supply.name)} · ${money(supply.price)} · ${Number(supply.quantity)} in stock</option>`)].join('');
    row.innerHTML = `<select class="line-product" aria-label="Invoice item">${options}</select><input class="line-qty" type="number" min="1" step="1" value="${Number(item.quantity) || 1}" aria-label="Quantity"><input class="line-price" type="number" min="0" step="0.01" value="${Number(item.price) || ''}" placeholder="Price" aria-label="Unit price"><span class="line-amount">${money(0)}</span><button type="button" class="remove-line" aria-label="Remove item">×</button>`;
    document.getElementById('invoiceLines').appendChild(row);
    if (item.prescriptionItemId) {
      row.dataset.prescriptionItemId = item.prescriptionItemId;
      row.dataset.prescriptionMedicineId = item.medicineId || '';
      row.dataset.prescriptionDosage = item.prescriptionDosage || '';
      row.dataset.prescriptionFrequency = item.prescriptionFrequency || '';
      row.dataset.prescriptionDurationDays = String(item.prescriptionDurationDays || '');
      row.dataset.prescriptionInstructions = item.prescriptionInstructions || '';
    }
    if (item.prescriptionMedicationId) {
      row.dataset.prescriptionMedicationId = item.prescriptionMedicationId;
      row.dataset.prescriptionMedicineId = item.medicineId || '';
    }
    if (item.medicineId) {
      row.querySelector('.line-product').value = item.medicineId;
      const medicine = data.medicines.find((entry) => entry.id === item.medicineId);
      if (medicine) row.querySelector('.line-qty').max = String(medicine.quantity);
    }
    if (item.serviceId) row.querySelector('.line-product').value = `service:${item.serviceId}`;
    if (item.name === 'Consultation') row.querySelector('.line-product').value = 'consultation';
    row.querySelector('.line-product').addEventListener('change', () => {
      const selectedMedicineId = row.querySelector('.line-product').value;
      const medicine = data.medicines.find((entry) => entry.id === selectedMedicineId);
      const serviceId = selectedMedicineId.startsWith('service:') ? selectedMedicineId.slice('service:'.length) : '';
      const service = data.clinicServices.find((entry) => entry.id === serviceId && entry.active !== false);
      const consumableChoice = selectedMedicineId.startsWith('consumable:') ? selectedMedicineId.slice('consumable:'.length) : '';
      const consumable = data.consumables.find((entry) => entry.id === consumableChoice);
      if (row.dataset.prescriptionItemId && selectedMedicineId !== row.dataset.prescriptionMedicineId) {
        delete row.dataset.prescriptionItemId;
      }
      if (row.dataset.prescriptionMedicationId && selectedMedicineId !== row.dataset.prescriptionMedicineId) {
        delete row.dataset.prescriptionMedicationId;
      }
      if (medicine) row.querySelector('.line-price').value = medicine.price;
      if (medicine) row.querySelector('.line-qty').max = String(medicine.quantity);
      if (consumable) row.querySelector('.line-price').value = consumable.price;
      if (consumable) row.querySelector('.line-qty').max = String(consumable.quantity);
      row.querySelector('.line-price').readOnly = Boolean(service);
      if (service) row.querySelector('.line-price').value = service.price;
      if (row.querySelector('.line-product').value === 'consultation') row.querySelector('.line-price').value = '500';
      if (!row.querySelector('.line-product').value) row.querySelector('.line-price').value = '';
      calculateInvoice();
    });
    row.querySelectorAll('.line-qty,.line-price').forEach((input) => input.addEventListener('input', calculateInvoice));
    row.querySelector('.remove-line').addEventListener('click', () => { row.remove(); calculateInvoice(); });
    calculateInvoice();
  }
  function currentInvoiceLines() {
    return [...document.querySelectorAll('.invoice-line')].map((row) => {
      const choice = row.querySelector('.line-product').value;
      const medicine = data.medicines.find((entry) => entry.id === choice);
      const consumable = choice.startsWith('consumable:')
        ? data.consumables.find((entry) => entry.id === choice.slice('consumable:'.length))
        : null;
      const service = choice.startsWith('service:')
        ? data.clinicServices.find((entry) => entry.id === choice.slice('service:'.length))
        : null;
      const name = medicine ? medicine.name : consumable ? consumable.name : service ? service.name : choice === 'consultation' ? 'Consultation' : '';
      const quantity = Math.max(0, Number(row.querySelector('.line-qty').value) || 0);
      const price = Math.max(0, Number(row.querySelector('.line-price').value) || 0);
      return {
        medicineId: medicine?.id || null,
        consumableId: consumable?.id || null,
        serviceId: service?.id || null,
        name,
        batch: medicine?.batch || '',
        expiry: medicine?.expiry || '',
        quantity,
        price,
        amount: quantity * price,
        ...(row.dataset.prescriptionItemId ? {
          prescriptionItemId: row.dataset.prescriptionItemId,
          prescriptionDosage: row.dataset.prescriptionDosage,
          prescriptionFrequency: row.dataset.prescriptionFrequency,
          prescriptionDurationDays: Number(row.dataset.prescriptionDurationDays),
          prescriptionInstructions: row.dataset.prescriptionInstructions,
        } : {}),
        ...(row.dataset.prescriptionMedicationId ? {
          prescriptionMedicationId: row.dataset.prescriptionMedicationId,
        } : {}),
      };
    }).filter((line) => line.name && line.quantity > 0);
  }
  function calculateInvoice() {
    let subtotal = 0;
    document.querySelectorAll('.invoice-line').forEach((row) => {
      const quantity = Math.max(0, Number(row.querySelector('.line-qty').value) || 0);
      const price = Math.max(0, Number(row.querySelector('.line-price').value) || 0);
      const amount = quantity * price;
      row.querySelector('.line-amount').textContent = money(amount);
      subtotal += amount;
    });
    const discount = Math.min(subtotal, Math.max(0, Number(document.querySelector('#invoiceForm [name="discount"]').value) || 0));
    const taxRate = Math.min(100, Math.max(0, Number(document.querySelector('#invoiceForm [name="taxRate"]').value) || 0));
    const tax = (subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + tax;
    const paid = Math.max(0, Number(document.querySelector('#invoiceForm [name="paid"]').value) || 0);
    document.getElementById('invoiceSubtotal').textContent = money(subtotal);
    document.getElementById('invoiceDiscount').textContent = `− ${money(discount)}`;
    document.getElementById('invoiceTax').textContent = money(tax);
    document.getElementById('invoiceTotal').textContent = money(total);
    document.getElementById('invoiceDue').textContent = money(Math.max(0, total - paid));
  }
  function openInvoiceModal(patientId = '', prescriptionItems = [], encounterId = '', shouldOpen = true) {
    const form = document.getElementById('invoiceForm');
    resetForm(form);
    const patientSelect = form.elements.namedItem('patientId');
    const prescriptionNotice = document.getElementById('prescriptionInvoiceNotice');
    form.elements.namedItem('encounterId').value = encounterId;
    patientSelect.disabled = false;
    prescriptionNotice.classList.add('hidden');
    if (patientId) {
      patientSelect.value = patientId;
      if (prescriptionItems.length) {
        patientSelect.disabled = true;
        prescriptionNotice.classList.remove('hidden');
      }
    }
    form.elements.namedItem('date').value = dateKey(today);
    form.elements.namedItem('paid').value = '0';
    form.elements.namedItem('template').value = 'professional';
    form.elements.namedItem('paymentMethod').value = 'Cash';
    document.getElementById('invoiceLines').replaceChildren();
    if (prescriptionItems.length) {
      prescriptionItems.forEach((item) => addInvoiceLine(item));
    } else {
      addInvoiceLine({ name: 'Consultation', quantity: 1, price: 500 });
    }
    if (shouldOpen) openModal('invoiceModal');
  }

  function openPrescriptionInvoice(patientId, encounterId) {
    const encounter = data.patientRecords.find((record) => record.id === encounterId && record.patientId === patientId);
    if (!encounter || !canCreateInvoices()) {
      showToast('You do not have permission to create an invoice for these prescription items.');
      return;
    }
    const items = (encounter.prescriptionItems || [])
      .map((item) => {
        const remaining = Math.max(0, Number(item.quantity) - Number(item.billedQuantity || 0));
        const medicine = data.medicines.find((entry) => entry.id === item.medicineId);
        const quantity = Math.min(remaining, Number(medicine?.quantity || 0));
        if (!medicine || quantity < 1) return null;
        return {
          medicineId: medicine.id,
          prescriptionItemId: item.id,
          prescriptionDosage: item.dosage,
          prescriptionFrequency: item.frequency,
          prescriptionDurationDays: item.durationDays,
          prescriptionInstructions: item.instructions || '',
          quantity,
          price: Number(medicine.price || 0),
        };
      })
      .filter(Boolean);
    if (!items.length) {
      showToast('No prescribed medicine units are currently available to bill.');
      return;
    }
    closeModal(document.getElementById('patientRecordsModal'));
    openInvoiceModal(patientId, items, encounterId);
  }
  function printBillingDocument(invoice, type = 'invoice', payment = null) {
    const patient = patientById(invoice.patientId);
    const settings = data.settings;
    const balance = isInvoiceVoided(invoice) ? 0 : Math.max(0, Number(invoice.total) - Number(invoice.paid));
    const normalizedPayments = invoice.payments.map((entry, index) => {
      const record = entry && typeof entry === 'object' ? entry : { amount: Number(entry) || 0 };
      return {
        ...record,
        date: record.date || invoice.createdAt,
        method: record.method || invoice.paymentMethod || 'Cash',
        reference: record.reference || '',
        receiptNumber: record.receiptNumber || `${invoice.number}-R${index + 1}`
      };
    });
    const receiptPayment = payment || normalizedPayments[normalizedPayments.length - 1] || null;
    const documentType = type === 'receipt' ? 'PAYMENT RECEIPT' : 'TAX INVOICE / BILL';
    const rows = invoice.items.map((item, index) => {
      const prescriptionDetails = [
        item.prescriptionDosage,
        item.prescriptionFrequency,
        item.prescriptionDurationDays ? `${item.prescriptionDurationDays} days` : '',
        item.prescriptionInstructions,
      ].filter(Boolean).map(escapeHtml).join(' · ');
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}${prescriptionDetails ? `<br><small>Directions: ${prescriptionDetails}</small>` : ''}${item.batch ? `<br><small>Batch: ${escapeHtml(item.batch)}</small>` : ''}${item.expiry ? `<br><small>Expiry: ${escapeHtml(formatDate(item.expiry))}</small>` : ''}</td><td>${Number(item.quantity)}</td><td>${money(item.price)}</td><td>${money(item.amount)}</td></tr>`;
    }).join('');
    const payments = normalizedPayments.map((record) => {
      return `<tr><td>${escapeHtml(formatDate(String(record.date || '').slice(0, 10)))}${String(record.date || '').includes('T') ? ` · ${escapeHtml(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(record.date)))}` : ''}</td><td>${escapeHtml(record.method || '—')}</td><td>${escapeHtml(record.reference || '—')}</td><td>${money(record.amount)}</td></tr>`;
    }).join('');
    const patientDetails = [
      patient?.code ? `Patient ID: ${patient.code}` : '',
      patient?.phone ? `Phone: ${patient.phone}` : '',
      patient?.email ? `Email: ${patient.email}` : '',
      patient?.dob ? `Date of birth: ${formatDate(patient.dob)}` : '',
      patient?.gender ? `Gender: ${patient.gender}` : '',
      patient?.bloodGroup ? `Blood group: ${patient.bloodGroup}` : '',
      patient?.address ? `Address: ${patient.address}` : ''
    ].filter(Boolean).map((detail) => `<p>${escapeHtml(detail)}</p>`).join('');
    const clinicMeta = [
      settings.practitioner ? `<p>${escapeHtml(settings.practitioner)}</p>` : '',
      settings.registration ? `<p>Medical registration: ${escapeHtml(settings.registration)}</p>` : '',
      settings.taxId ? `<p>Tax / GST: ${escapeHtml(settings.taxId)}</p>` : ''
    ].join('');
    const receiptNumber = receiptPayment?.receiptNumber || `${invoice.number}-R${invoice.payments.length || 1}`;
    const supportedTemplates = ['professional', 'detailed', 'thermal'];
    const printTemplate = type === 'receipt' ? 'thermal' : supportedTemplates.includes(invoice.template) ? invoice.template : 'professional';
    const root = document.getElementById('printRoot');
    root.innerHTML = `<article class="print-invoice template-${printTemplate}"><header class="print-head"><div class="print-clinic-brand"><img class="print-logo" src="assets/csk-clinic-logo.png" alt="CSK Clinic logo"><div><h1>${escapeHtml(settings.clinicName)}</h1><p>${escapeHtml(settings.address || 'Clinic address not set')}</p><p>${settings.phone ? `Phone: ${escapeHtml(settings.phone)}` : ''}${settings.email ? ` · Email: ${escapeHtml(settings.email)}` : ''}</p>${clinicMeta}</div></div><div class="print-title"><h2>${documentType}</h2><p><b>${escapeHtml(type === 'receipt' ? receiptNumber : invoice.number)}</b></p><p>Invoice date: ${escapeHtml(formatDate(invoice.date))}</p>${type === 'receipt' && receiptPayment ? `<p>Payment date: ${escapeHtml(formatDate(String(receiptPayment.date || '').slice(0, 10)))}</p>` : ''}</div></header><section class="print-meta"><div><b>${type === 'receipt' ? 'Received from' : 'Patient / billed to'}</b><p class="print-patient-name">${escapeHtml(patient?.name || 'Patient record unavailable')}</p>${patientDetails}</div><div><b>Invoice summary</b><p>Invoice: ${escapeHtml(invoice.number)}</p><p>Status: ${escapeHtml(invoiceStatus(invoice))}</p><p>Payment method: ${escapeHtml(receiptPayment?.method || invoice.paymentMethod || '—')}</p>${receiptPayment?.reference ? `<p>Reference: ${escapeHtml(receiptPayment.reference)}</p>` : ''}</div></section><table class="print-table"><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="print-totals"><div><span>Subtotal</span><b>${money(invoice.subtotal)}</b></div>${Number(invoice.discount) > 0 ? `<div><span>Discount</span><b>− ${money(invoice.discount)}</b></div>` : ''}${Number(invoice.taxAmount) > 0 ? `<div><span>Tax / GST (${Number(invoice.taxRate)}%)</span><b>${money(invoice.taxAmount)}</b></div>` : ''}<div class="grand"><span>Invoice total</span><b>${money(invoice.total)}</b></div>${type === 'receipt' && receiptPayment ? `<div class="grand"><span>Payment received</span><b>${money(receiptPayment.amount)}</b></div>` : `<div><span>Total paid</span><b>${money(invoice.paid)}</b></div>`}<div><span>Balance due</span><b>${money(balance)}</b></div></section><div class="print-words"><b>Amount in words:</b> ${escapeHtml(amountInWords(invoice.total))}</div><section class="print-payment-history"><h3>Payment history</h3>${payments ? `<table class="print-table"><thead><tr><th>Date & time</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${payments}</tbody></table>` : '<p>No payment has been recorded for this invoice.</p>'}</section>${invoice.notes ? `<p class="print-notes"><b>Notes:</b> ${escapeHtml(invoice.notes)}</p>` : ''}<div class="print-signature"><span>Authorized signatory</span></div><footer class="print-footer">${escapeHtml(settings.invoiceFooter || `Thank you for choosing ${settings.clinicName}. Please keep this document for your records.`)}</footer><div class="print-actions"><button onclick="window.print()">Print ${type === 'receipt' ? 'receipt' : 'invoice'}</button></div></article>`;
    root.insertAdjacentHTML(
      'beforeend',
      '<div class="print-toolbar"><span>Print preview</span><button type="button" data-close-print-preview>Close preview</button><button type="button" class="button button-primary" data-print-document>Print document</button></div>',
    );
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.global-search-wrap')) closeGlobalSearchResults();
    if (!event.target.closest('.rx-autocomplete-wrap')) {
      document.querySelectorAll('.rx-medicine-autocomplete:not(.hidden)').forEach((list) => {
        closePrescriptionMedicineSuggestions(list.closest('.rx-medication-row'));
      });
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    const row = input.closest('.rx-medication-row');
    if (!row) return;
    if (input.matches('.rx-tablet-medicine [name="name"]')) {
      const medicineId = row.querySelector('[name="medicineId"]');
      if (medicineId.value && input.value !== input.dataset.selectedName) {
        medicineId.value = '';
        delete input.dataset.selectedName;
        ['genericName', 'brand', 'manufacturer', 'strength'].forEach((field) => {
          const detail = row.querySelector(`[name="${field}"]`);
          detail.value = '';
          detail.readOnly = false;
        });
      }
      renderPrescriptionMedicineSuggestions(input);
      return;
    }
    if (row.querySelector('[name="frequencyMode"]')
      && input.matches('[name="frequencyCustom"], [name="durationDays"]')) {
      updateTabletFrequency(row);
      updateTabletPrescriptionQuantity(row);
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    const row = input.closest('.rx-medication-row');
    if (!row || !input.matches('[name="frequencyMode"], [name="frequencyFormat"], [name^="frequencyMorning"], [name^="frequencyAfternoon"], [name^="frequencyEvening"], [name^="frequencyNight"], [name="durationPreset"], [name="startFromPreset"]')) return;
    updateTabletCustomFields(row);
    updateTabletFrequency(row);
    updateTabletPrescriptionQuantity(row);
  });

  document.addEventListener('keydown', (event) => {
    const input = event.target;
    if (!input.matches('.rx-tablet-medicine [name="name"]')) return;
    const row = input.closest('.rx-medication-row');
    const list = row.querySelector('.rx-medicine-autocomplete');
    const options = [...list.querySelectorAll('[role="option"]')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.classList.contains('hidden')) renderPrescriptionMedicineSuggestions(input, true);
      const visibleOptions = [...list.querySelectorAll('[role="option"]')];
      if (!visibleOptions.length) return;
      const activeIndex = visibleOptions.findIndex((option) => option.getAttribute('aria-selected') === 'true');
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      let nextIndex;
      if (activeIndex < 0) nextIndex = direction === 1 ? 0 : visibleOptions.length - 1;
      else nextIndex = (activeIndex + direction + visibleOptions.length) % visibleOptions.length;
      visibleOptions.forEach((option, index) => option.setAttribute('aria-selected', String(index === nextIndex)));
      input.setAttribute('aria-activedescendant', visibleOptions[nextIndex].id);
      return;
    }
    if (event.key === 'Enter' && !list.classList.contains('hidden') && options.length) {
      event.preventDefault();
      const selected = options.find((option) => option.getAttribute('aria-selected') === 'true') || options[0];
      selected.click();
      return;
    }
    if (event.key === 'Escape' && !list.classList.contains('hidden')) {
      event.preventDefault();
      closePrescriptionMedicineSuggestions(row);
    }
  });

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('button,a');
    if (!target) return;
    if (target.matches('[data-header-popover-toggle]')) {
      const panelId = target.dataset.headerPopoverToggle;
      const shouldOpen = target.getAttribute('aria-expanded') !== 'true';
      closeHeaderPopovers();
      if (shouldOpen) {
        if (panelId === 'notificationsPanel') renderNotificationsPanel();
        document.getElementById(panelId).classList.remove('hidden');
        target.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    if (target.matches('[data-header-popover-action]')) {
      closeHeaderPopovers();
      showView(target.dataset.headerPopoverAction);
      return;
    }
    if (target.id === 'prescriptionExportCsv') {
      exportPrescriptionCsv();
      return;
    }
    if (target.matches('[data-prescription-action]')) {
      const row = prescriptionWorkspaceRows[Number(target.dataset.prescriptionRow)];
      if (!row) {
        showToast('Prescription could not be found. Refresh the list and retry.');
        return;
      }
      if (target.dataset.prescriptionAction === 'view') openPrescriptionDetails(row);
      if (target.dataset.prescriptionAction === 'edit') openPrescriptionRevision(row);
      if (target.dataset.prescriptionAction === 'print') printPrescriptionListRow(row);
      if (target.dataset.prescriptionAction === 'pdf') printPrescriptionListRow(row, true);
      if (target.dataset.prescriptionAction === 'bill') openPharmacyPosForPrescription(row);
      return;
    }
    if (target.id === 'pharmacyPosLoadPrescription') {
      loadLatestPharmacyPrescription();
      return;
    }
    if (target.matches('[data-pos-add-medicine]')) {
      addPharmacyPosMedicine(target.dataset.posAddMedicine);
      return;
    }
    if (target.matches('[data-pos-remove-item]')) {
      pharmacyPosCart.splice(Number(target.dataset.posRemoveItem), 1);
      renderPharmacyPos();
      return;
    }
    if (target.matches('[data-pos-qty-step]')) {
      const item = pharmacyPosCart[Number(target.dataset.posQtyStep)];
      if (!item) return;
      item.quantity = Math.max(1, Math.min(item.maxQuantity, item.quantity + Number(target.dataset.step)));
      renderPharmacyPos();
      return;
    }
    if (target.matches('[data-pos-payment]')) {
      pharmacyPosPayment = target.dataset.posPayment;
      renderPharmacyPos();
      return;
    }
    if (target.id === 'pharmacyPosCollect') {
      collectPharmacyPosBill();
      return;
    }
    if (target.matches('[data-pharmacy-report-print]')) {
      printPharmacyReport(target.dataset.pharmacyReportPrint);
      return;
    }
    if (target.matches('[data-pharmacy-tab]')) {
      if (target.dataset.pharmacyFilter) {
        document.getElementById('medicineStockFilter').value = target.dataset.pharmacyFilter;
      }
      setPharmacyTab(target.dataset.pharmacyTab);
      if (target.dataset.pharmacyFilter) renderMedicines();
      return;
    }
    if (target.matches('[data-new-pharmacy-order]')) {
      openPharmacyOrderForm();
      return;
    }
    if (target.matches('[data-new-supplier]')) {
      document.getElementById('supplierForm').reset();
      openModal('supplierModal');
      return;
    }
    if (target.matches('[data-new-purchase-order]')) {
      openPurchaseOrderForm();
      return;
    }
    if (target.id === 'addPharmacyOrderLine' || target.matches('[data-add-pharmacy-order-line]')) {
      addProcurementLine('pharmacyOrderLines', 'price');
      return;
    }
    if (target.id === 'addPurchaseOrderLine' || target.matches('[data-add-purchase-order-line]')) {
      addProcurementLine('purchaseOrderLines', 'cost');
      return;
    }
    if (target.matches('[data-remove-procurement-line]')) {
      const line = target.closest('.purchase-order-line');
      const container = line?.parentElement;
      line?.remove();
      if (container?.id === 'purchaseOrderLines') updateProcurementTotal('purchaseOrderLines', 'purchaseOrderTotal', 'Order total');
      if (container?.id === 'pharmacyOrderLines') updateProcurementTotal('pharmacyOrderLines', 'pharmacyOrderTotal', 'Order estimate');
      return;
    }
    if (target.matches('[data-open-receive-order]')) {
      openPurchaseReceipt(target.dataset.openReceiveOrder);
      return;
    }
    if (target.matches('[data-update-pharmacy-order]')) {
      try {
        await changePharmacyOrderStatus(target.dataset.updatePharmacyOrder, target.dataset.orderStatus);
      } catch (error) {
        console.error('Unable to update pharmacy order.', error);
        showToast(error.message || 'Unable to update pharmacy order.');
      }
      return;
    }
    if (target.matches('[data-toggle-supplier]')) {
      const supplier = data.suppliers.find((item) => item.id === target.dataset.toggleSupplier);
      if (!supplier) {
        showToast('Supplier not found. Refresh and retry.');
        return;
      }
      try {
        const active = target.dataset.active !== 'true';
        if (isApiConnected()) {
          await apiRequest(`/procurement/suppliers/${encodeURIComponent(supplier.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ active }),
          });
          await refreshLiveData();
        } else {
          supplier.active = active;
          save();
          renderPharmacyPurchases();
        }
        showToast(`Supplier ${active ? 'activated' : 'deactivated'}.`);
      } catch (error) {
        console.error('Unable to update supplier status.', error);
        showToast(error.message || 'Unable to update supplier status.');
      }
      return;
    }
    if (target.matches('[data-cancel-purchase-order]')) {
      if (!window.confirm('Cancel this purchase order?')) return;
      try {
        if (isApiConnected()) {
          await apiRequest(`/procurement/purchase-orders/${encodeURIComponent(target.dataset.cancelPurchaseOrder)}/cancel`, {
            method: 'POST',
            body: '{}',
          });
          await refreshLiveData();
        } else {
          const order = data.purchaseOrders.find((item) => item.id === target.dataset.cancelPurchaseOrder);
          if (!order || order.status !== 'ORDERED' || order.items.some((item) => Number(item.receivedQuantity) > 0)) {
            throw new Error('Only an unreceived purchase order can be cancelled.');
          }
          order.status = 'CANCELLED';
          save();
          renderPharmacyPurchases();
        }
        showToast('Purchase order cancelled.');
      } catch (error) {
        console.error('Unable to cancel purchase order.', error);
        showToast(error.message || 'Unable to cancel purchase order.');
      }
      return;
    }
    if (target.matches('[data-pharmacy-not-ready]')) {
      setPharmacyTab(target.dataset.pharmacyNotReady || 'purchases');
      return;
    }
    if (target.matches('[data-history-chip]')) {
      target.classList.toggle('active');
      return;
    }
    if (target.matches('[data-clinical-menu]')) {
      const panel = document.querySelector(`[data-clinical-menu-panel="${target.dataset.clinicalMenu}"]`);
      if (panel) panel.classList.toggle('hidden');
      return;
    }
    if (target.matches('[data-select-option]')) {
      const trigger = document.querySelector(`[data-clinical-menu="${target.dataset.menuTarget}"]`);
      if (trigger) trigger.textContent = target.dataset.selectOption;
      target.closest('.clinical-menu')?.classList.add('hidden');
      return;
    }
    if (target.matches('[data-clear-symptom]')) {
      const row = target.closest('.clinical-symptom-row');
      row?.querySelectorAll('input').forEach((input) => { input.value = ''; });
      return;
    }
    if (target.matches('[data-clear-diagnosis]')) {
      const row = target.closest('.clinical-diagnosis-row');
      row?.querySelectorAll('input').forEach((input) => { input.value = input.name === 'diagnosisIcd' ? 'ICD-10' : ''; });
      return;
    }
    if (target.matches('[data-add-symptom]')) {
      const row = target.previousElementSibling?.matches('.clinical-symptom-row') ? target.previousElementSibling : document.querySelector('.clinical-symptom-row');
      if (row) row.insertAdjacentHTML('afterend', `<div class="clinical-symptom-row">${row.innerHTML}</div>`);
      return;
    }
    if (target.matches('[data-add-diagnosis]')) {
      const row = document.querySelector('.clinical-diagnosis-row');
      if (row) row.insertAdjacentHTML('afterend', `<div class="clinical-diagnosis-row">${row.innerHTML}</div>`);
      return;
    }
    if (target.matches('[data-add-allergy]')) {
      const allergy = window.prompt('Enter allergy');
      if (allergy?.trim()) {
        target.insertAdjacentHTML('afterend', `<button type="button" class="clinical-chip clinical-chip-added">${escapeHtml(allergy.trim())} ×</button>`);
      }
      return;
    }
    if (target.matches('.clinical-draft-discard')) {
      target.closest('.consultation-draft-banner')?.classList.add('hidden');
      return;
    }
    if (target.matches('.clinical-draft-restore')) {
      target.closest('.consultation-draft-banner')?.classList.add('hidden');
      showToast('Unsaved draft restored.');
      return;
    }
    if (target.id === 'openWalkInCheckIn') {
      await openCheckInModal();
      return;
    }
    if (target.id === 'refreshPatientQueue') {
      if (isApiConnected()) await refreshLiveData();
      else renderPatientQueue();
      return;
    }
    if (target.id === 'refreshDoctorQueue') {
      if (isApiConnected()) {
        await refreshDoctorWorkspaceFromApi();
        await refreshDoctorDashboard();
      }
      else renderDoctorWorkspace();
      return;
    }
    if (target.id === 'blankRegistrationForm' || target.id === 'blankConsentForm') {
      printBlankPatientForm(target.id === 'blankConsentForm' ? 'consent' : 'registration');
      return;
    }
    if (target.matches('[data-archive-patient]')) {
      await setPatientArchived(target.dataset.archivePatient, true);
      return;
    }
    if (target.matches('[data-restore-patient]')) {
      await setPatientArchived(target.dataset.restorePatient, false);
      return;
    }
    if (target.matches('[data-check-in-patient]')) {
      await openCheckInModal(target.dataset.checkInPatient);
      return;
    }
    if (target.matches('[data-check-in-appointment]')) {
      const appointment = data.appointments.find((item) => item.id === target.dataset.checkInAppointment);
      if (appointment) await openCheckInModal(appointment.patientId, appointment.id);
      return;
    }
    if (target.matches('[data-queue-patient-profile]')) {
      await openPatientProfile(target.dataset.queuePatientProfile);
      return;
    }
    if (target.matches('[data-record-queue-intake]')) {
      await openNurseIntake(target.dataset.recordQueueIntake);
      return;
    }
    if (target.matches('[data-doctor-select-token]')) {
      showView('doctor');
      await openDoctorQueuePatient(target.dataset.doctorSelectToken);
      return;
    }
    if (target.matches('[data-nurse-select-token]')) {
      await openNurseQueuePatient(target.dataset.nurseSelectToken);
      return;
    }
    if (target.id === 'refreshNurseQueue') {
      if (isApiConnected()) {
        try {
          await refreshLiveData();
        } catch (error) {
          console.error('Unable to refresh the nurse queue.', error);
          showToast(error.message || 'Unable to refresh the nurse queue.');
        }
      } else {
        renderNurseWorkspace();
      }
      return;
    }
    if (target.matches('[data-doctor-call-token]')) {
      try {
        await updateQueueEntry(target.dataset.doctorCallToken, 'CALLED');
        activeDoctorQueueTokenId = target.dataset.doctorCallToken;
        renderDoctorWorkspace();
      } catch (error) {
        console.error('Unable to call the queued patient.', error);
        showToast(error.message || 'Unable to call the patient.');
      }
      return;
    }
    if (target.matches('[data-doctor-complete-token]')) {
      try {
        await updateQueueEntry(target.dataset.doctorCompleteToken, 'COMPLETED');
        activeDoctorQueueTokenId = target.dataset.doctorCompleteToken;
        renderDoctorWorkspace();
      } catch (error) {
        console.error('Unable to complete the queued visit.', error);
        showToast(error.message || 'Unable to complete the visit.');
      }
      return;
    }
    if (target.matches('[data-doctor-new-visit]')) {
      await openCheckInModal(target.dataset.doctorNewVisit);
      return;
    }
    if (target.matches('[data-doctor-continue-consultation]')) {
      const entry = getDoctorQueueEntries().find((item) => item.id === target.dataset.doctorContinueConsultation);
      if (entry) openConsultationPrescriptionEditor(entry.patientId, '', null, entry.encounterId);
      return;
    }
    if (target.matches('[data-doctor-open-consultation]')) {
      const entry = getDoctorQueueEntries().find((item) => item.id === target.dataset.doctorOpenConsultation);
      if (!entry || !canWriteConsultationPrescriptions()) return;
      if (entry.status === 'CALLED') await startQueueConsultation(entry.id);
      else if (entry.status === 'IN_CONSULTATION') openConsultationPrescriptionEditor(entry.patientId, '', null, entry.encounterId);
      return;
    }
    if (target.matches('[data-doctor-open-profile]')) {
      await openPatientProfile(target.dataset.doctorOpenProfile);
      return;
    }
    if (target.matches('[data-doctor-open-vitals]')) {
      await openPatientProfile(target.dataset.doctorOpenVitals, 'vitals');
      return;
    }
    if (target.matches('[data-doctor-history-tab]')) {
      activeDoctorWorkspaceTab = 'history';
      renderDoctorWorkspace();
      return;
    }
    if (target.matches('[data-doctor-tab]')) {
      activeDoctorWorkspaceTab = target.dataset.doctorTab;
      renderDoctorWorkspace();
      return;
    }
    if (target.matches('[data-queue-status]')) {
      try {
        await updateQueueEntry(target.dataset.queueStatus, target.dataset.status);
        showToast('Queue status updated.');
      } catch (error) {
        console.error('Unable to update queue status.', error);
        showToast(error.message || 'Unable to update queue status.');
      }
      return;
    }
    if (target.matches('[data-start-queue-consultation]')) {
      try {
        await startQueueConsultation(target.dataset.startQueueConsultation);
      } catch (error) {
        console.error('Unable to start queued consultation.', error);
        showToast(error.message || 'Unable to start consultation.');
      }
      return;
    }
    if (target.id === 'newConsultationPrescription') {
      if (activePatientRecordsId) openConsultationPrescriptionEditor(activePatientRecordsId);
      return;
    }
    if (target.matches('[data-consultation-tab]')) {
      setConsultationWorkspaceTab(target.dataset.consultationTab);
      return;
    }
    if (target.matches('[data-consultation-main-tab]')) {
      const form = document.getElementById('consultationPrescriptionForm');
      setConsultationMainTab(
        target.dataset.consultationMainTab,
        String(form.elements.namedItem('patientId').value || ''),
        String(form.elements.namedItem('encounterId').value || ''),
      );
      return;
    }
    if (target.matches('[data-focus-consultation-vitals]')) {
      if (target.closest('#consultationVitalsPanel')?.querySelector('[data-patient-vitals-form].is-readonly')) {
        showToast('Saved vitals are permanent and cannot be overwritten.');
      } else {
        document.querySelector('#consultationVitalsPanel [name="systolicMmHg"]')?.focus();
      }
      return;
    }
    if (target.matches('[data-cancel-consultation-vitals]')) {
      const form = target.closest('[data-patient-vitals-form]');
      form?.reset();
      if (form) updateConsultationVitalsPreview(form);
      return;
    }
    if (target.matches('[data-save-consultation-vitals]')) {
      const vitalsPanel = target.closest('[data-patient-vitals-form]');
      target.disabled = true;
      try {
        await submitPatientVitalsForm(vitalsPanel);
      } catch (error) {
        console.error('Unable to save consultation vitals.', error);
        showToast(error.message || 'Unable to save vitals.');
      } finally {
        if (target.isConnected) target.disabled = false;
      }
      return;
    }
    if (target.matches('[data-rx-search-button]')) {
      searchPrescriptionMedicines(target.dataset.rxSearchButton);
      return;
    }
    if (target.matches('[data-rx-autocomplete-toggle]')) {
      const row = target.closest('.rx-medication-row');
      const input = row.querySelector('.rx-tablet-medicine [name="name"]');
      const list = row.querySelector('.rx-medicine-autocomplete');
      if (list.classList.contains('hidden')) renderPrescriptionMedicineSuggestions(input, true);
      else closePrescriptionMedicineSuggestions(row);
      input.focus();
      return;
    }
    if (target.matches('[data-rx-select-medicine]')) {
      const row = target.closest('.rx-medication-row');
      const medicine = data.medicines.find((item) => item.id === target.dataset.rxSelectMedicine && item.active !== false);
      if (!medicine) {
        showToast('That medicine is no longer available. Search and select it again.');
        return;
      }
      selectPrescriptionMedicine(row, medicine);
      return;
    }
    if (target.matches('[data-rx-custom]')) {
      addPrescriptionMedicationRow(target.dataset.rxCustom, null, true);
      return;
    }
    if (target.matches('[data-rx-add-medicine]')) {
      const medicine = data.medicines.find((item) => item.id === target.dataset.rxAddMedicine);
      if (!medicine) {
        showToast('That medicine is no longer available. Search and select it again.');
        return;
      }
      addPrescriptionMedicationRow(target.dataset.rxSection, {
        medicineId: medicine.id,
        name: medicine.name,
        genericName: medicine.name,
        brand: medicine.brand,
        manufacturer: medicine.manufacturer,
        strength: medicine.productSize,
      });
      return;
    }
    if (target.matches('[data-rx-remove-row]')) {
      target.closest('.rx-medication-row, .rx-structured-row')?.remove();
      return;
    }
    if (target.id === 'addIvFluid') {
      addPrescriptionFluidRow();
      return;
    }
    if (target.id === 'addInvestigation') {
      addPrescriptionInvestigationRow();
      return;
    }
    if (target.matches('[data-prescription-revision]')) {
      const found = findPrescriptionVersion(
        target.dataset.patientId,
        target.dataset.consultationId,
        target.dataset.prescriptionRevision,
      );
      if (!found) {
        showToast('Prescription revision not found. Refresh the patient history and retry.');
        return;
      }
      openConsultationPrescriptionEditor(
        target.dataset.patientId,
        target.dataset.consultationId,
        found.version,
      );
      return;
    }
    if (target.matches('[data-prescription-view]')) {
      openPrescriptionPrint(
        target.dataset.patientId,
        target.dataset.consultationId,
        target.dataset.prescriptionView,
      );
      return;
    }
    if (target.matches('[data-prescription-print]')) {
      openPrescriptionPrint(
        target.dataset.patientId,
        target.dataset.consultationId,
        target.dataset.prescriptionPrint,
        true,
      );
      return;
    }
    if (target.matches('[data-prescription-download]')) {
      downloadPrescriptionPdf(
        target.dataset.patientId,
        target.dataset.consultationId,
        target.dataset.prescriptionDownload,
      );
      return;
    }
    if (target.matches('[data-patient-next]')) {
      setPatientFormStep(Number(target.dataset.patientNext), true);
      return;
    }
    if (target.matches('[data-patient-previous]')) {
      setPatientFormStep(Number(target.dataset.patientPrevious));
      return;
    }
    if (target.matches('[data-patient-step]')) {
      const requestedStep = Number(target.dataset.patientStep);
      const activeStep = Number(document.querySelector('#patientForm .patient-form-step:not(.hidden)')?.dataset.patientStepPanel || 0);
      if (requestedStep <= activeStep) setPatientFormStep(requestedStep);
      else if (requestedStep === activeStep + 1) setPatientFormStep(requestedStep, true);
      return;
    }
    if (target.id === 'openPatientDrafts') {
      renderPatientDrafts();
      openModal('patientDraftsModal');
      return;
    }
    if (target.matches('[data-load-patient-draft]')) {
      const draftId = target.dataset.loadPatientDraft;
      closeModal(document.getElementById('patientDraftsModal'));
      await openPatientEditor(undefined, draftId);
      return;
    }
    if (target.matches('[data-delete-patient-draft]')) {
      await deletePatientDraft(target.dataset.deletePatientDraft);
      return;
    }
    if (target.matches('[data-open-patient-profile]')) {
      await openPatientProfile(target.dataset.openPatientProfile);
      return;
    }
    if (target.matches('[data-preview-patient]')) {
      openPatientPreview(target.dataset.previewPatient);
      return;
    }
    if (target.matches('[data-open-patient-external-records]')) {
      await openPatientProfile(target.dataset.openPatientExternalRecords, 'external');
      return;
    }
    if (target.matches('[data-profile-tab]')) {
      const profilePatient = patientById(activePatientProfileId);
      if (profilePatient) {
        activePatientProfileTab = target.dataset.profileTab;
        renderPatientProfile(profilePatient);
      }
      return;
    }
    if (target.matches('[data-resolve-medical-condition]')) {
      const conditionId = target.dataset.resolveMedicalCondition;
      const condition = activePatientHistory?.medicalConditions?.find((item) => item.id === conditionId);
      if (!condition || !activePatientProfileId) {
        showToast('Medical condition not found. Refresh the patient history and retry.');
        return;
      }
      try {
        if (isApiConnected()) {
          await apiRequest(
            `/patients/${encodeURIComponent(activePatientProfileId)}/history/conditions/${encodeURIComponent(conditionId)}`,
            { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) },
          );
          await reloadPatientHistory(activePatientProfileId);
        } else {
          condition.status = 'RESOLVED';
          save();
          const patient = patientById(activePatientProfileId);
          if (patient) renderPatientProfile(patient);
        }
        showToast('Condition marked resolved.');
      } catch (error) {
        console.error('Unable to update medical condition.', error);
        showToast(error.message || 'Unable to update medical condition.');
      }
      return;
    }
    if (target.matches('[data-dispense-prescription-medication]')) {
      try {
        await confirmPrescriptionDispense(
          target.dataset.dispensePrescriptionMedication,
          target.dataset.medicineName || 'medicine',
          Number(target.dataset.prescribedQuantity),
          target.dataset.patientId || '',
          target.dataset.nurseDispense === 'true',
        );
      } catch (error) {
        console.error('Unable to record prescription dispensing.', error);
        showToast(error.message || 'Unable to record dispensing.');
      }
      return;
    }
    if (target.matches('[data-bill-patient-prescription]')) {
      if (!canCreateInvoices()) {
        showToast('Your account does not have permission to create prescription invoices.');
        return;
      }
      const patientId = target.dataset.patientId;
      const medicationId = target.dataset.billPatientPrescription;
      const row = getPrescriptionListRows().find((prescription) =>
        prescription.patientId === patientId &&
        (prescription.medications.some((item) => item.id === medicationId) ||
          prescription.legacyItems.some((item) => item.id === medicationId))
      );
      if (!row) {
        showToast('Prescription not found. Refresh the patient record and retry.');
        return;
      }
      closeModal(target.closest('.modal-backdrop'));
      openPharmacyPosForPrescription(row);
      return;
    }
    if (target.matches('[data-nurse-record-administration]')) {
      openMedicationAdministration(target);
      return;
    }
    if (target.matches('[data-preview-visit-bill]')) {
      try {
        const encounterId = target.dataset.previewVisitBill;
        const preview = await apiRequest(`/billing/visits/${encodeURIComponent(encounterId)}/preview`, {
          method: 'POST',
          body: '{}',
        });
        const summary = preview.items.map((item) => `${item.quantity} × ${item.name}`).join('\n');
        if (!window.confirm(`Preview bill total: ₹${Number(preview.subtotal).toFixed(2)}\n\n${summary || 'No billable items'}\n\nGenerate this invoice?`)) return;
        await apiRequest(`/billing/visits/${encodeURIComponent(encounterId)}/generate`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        await refreshLiveData();
        showToast('Visit invoice generated successfully.');
      } catch (error) {
        console.error('Unable to generate visit invoice.', error);
        showToast(error.message || 'Unable to generate visit invoice.');
      }
      return;
    }
    if (target.matches('[data-add-external-record]')) {
      openExternalMedicalRecordEditor(target.dataset.addExternalRecord);
      return;
    }
    if (target.matches('[data-edit-external-record]')) {
      openExternalMedicalRecordEditor(activePatientProfileId, target.dataset.editExternalRecord);
      return;
    }
    if (target.matches('[data-profile-history]')) {
      const patientId = target.dataset.profileHistory;
      closeModal(document.getElementById('patientProfileModal'));
      await openPatientRecords(patientId);
      return;
    }
    if (target.matches('[data-profile-edit]')) {
      const patientId = target.dataset.profileEdit;
      closeModal(document.getElementById('patientProfileModal'));
      await openPatientEditor(patientId);
      return;
    }
    if (target.matches('[data-profile-appointment]')) {
      const patientId = target.dataset.profileAppointment;
      closeModal(document.getElementById('patientProfileModal'));
      document.getElementById('appointmentForm').reset();
      updatePatientOptions();
      document.querySelector('#appointmentForm [name="patientId"]').value = patientId;
      document.querySelector('#appointmentForm [name="date"]').value = shiftDate(0);
      openModal('appointmentModal');
      if (isApiConnected()) void loadAppointmentDoctors();
      return;
    }
    if (target.matches('[data-global-search-result]')) {
      selectGlobalSearchResult(target);
      return;
    }
    if (target.matches('[data-print-patient-sheet]')) {
      printPatientClinicalSheet(target.dataset.patientId, target.dataset.printPatientSheet);
      return;
    }
    if (target.id === 'newPatientEncounter') {
      if (activePatientRecordsId) openPatientEncounterEditor(activePatientRecordsId);
      return;
    }
    if (target.matches('[data-edit-patient-encounter]')) {
      if (activePatientRecordsId) openPatientEncounterEditor(activePatientRecordsId, target.dataset.editPatientEncounter);
      return;
    }
    if (target.matches('[data-discharge-record]')) {
      const { dischargeRecord: encounterId, patientId } = target.dataset;
      if (!window.confirm('Discharge this inpatient encounter?')) return;
      try {
        if (isApiConnected()) {
          await apiRequest(`/patients/${encodeURIComponent(patientId)}/records/${encodeURIComponent(encounterId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CLOSED' }),
          });
          const records = await apiRequest(`/patients/${encodeURIComponent(patientId)}/records`);
          if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid clinical history.');
          data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patientId)
            .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId })));
        } else {
          const record = getPatientRecords(patientId).find((item) => item.id === encounterId);
          if (!record || record.status === 'CLOSED') throw new Error('This encounter is already closed.');
          record.status = 'CLOSED';
          record.dischargedAt = new Date().toISOString();
          save();
        }
        renderPatientRecords(patientId);
        showToast('Inpatient encounter discharged.');
      } catch (error) {
        console.error('Unable to discharge the patient encounter.', error);
        showToast(error.message || 'Unable to discharge the encounter.');
      }
      return;
    }
    if (target.matches('[data-ack-intake]')) {
      const queueTokenId = target.dataset.ackIntake;
      try {
        let updated;
        if (isApiConnected()) {
          updated = await apiRequest(`/nursing/queue/${encodeURIComponent(queueTokenId)}/intake/acknowledge`, {
            method: 'POST',
            body: '{}',
          });
        } else {
          const intake = data.patientIntakes.find((item) => item.queueTokenId === queueTokenId);
          if (!intake || intake.status !== 'SUBMITTED') throw new Error('Only submitted intake can be reviewed.');
          intake.status = 'ACKNOWLEDGED';
          intake.reviewedAt = new Date().toISOString();
          save();
          updated = intake;
        }
        data.patientIntakes = data.patientIntakes.map((item) => item.queueTokenId === queueTokenId ? { ...item, ...updated, queueTokenId } : item);
        renderPatientQueue();
        renderDoctorWorkspace();
        showToast('Nurse intake marked as reviewed.');
      } catch (error) {
        console.error('Unable to acknowledge nurse intake.', error);
        showToast(error.message || 'Unable to review nurse intake.');
      }
      return;
    }
    if (target.matches('[data-close-print-preview]')) {
      document.getElementById('printRoot').replaceChildren();
      return;
    }
    if (target.matches('[data-print-document]')) {
      window.print();
      return;
    }
    if (target.matches('[data-open-modal]')) {
      event.preventDefault();
      if (target.dataset.openModal === 'patientModal') openPatientEditor();
      else if (target.dataset.openModal === 'medicineModal') openMedicineEditor();
      else if (target.dataset.openModal === 'appointmentModal') {
        document.getElementById('appointmentForm').reset();
        document.querySelector('#appointmentForm [name="date"]').value = shiftDate(0);
        openModal('appointmentModal');
        if (isApiConnected()) void loadAppointmentDoctors();
      } else if (target.dataset.openModal === 'invoiceModal') openInvoiceModal();
    }
    if (target.matches('[data-cancel-consultation]')) {
      requestCloseConsultationPrescription();
      return;
    }
    if (target.matches('[data-close-modal]')) {
      if (target.closest('#patientRecordsModal')) activePatientRecordsId = '';
      closeModal(target.closest('.modal-backdrop'));
    }
    if (target.classList.contains('modal-backdrop') && event.target === target) {
      if (target.id === 'patientRecordsModal') activePatientRecordsId = '';
      closeModal(target);
    }
    if (target.id === 'workspaceSwitcherToggle') {
      setWorkspaceSwitcherOpen(target.getAttribute('aria-expanded') !== 'true');
      return;
    }
    if (target.matches('[data-doctor-search-provider]')) {
      openDoctorSearch(target.dataset.doctorSearchProvider);
      return;
    }
    if (target.matches('[data-workspace-url]')) {
      const destination = new URL(target.dataset.workspaceUrl, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) {
        showView(decodeURIComponent(destination.hash.slice(1)));
        return;
      }
      window.location.assign(destination.href);
      return;
    }
    if (target.matches('[data-go]')) showView(target.dataset.go);
    if (target.matches('.nav-link[data-section]')) { event.preventDefault(); showView(target.dataset.section); }
    if (target.id === 'sidebarToggle') setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'), true);
    if (target.id === 'mobileMenu') document.getElementById('sidebar').classList.toggle('open');
    if (target.id === 'dismissNotice') target.closest('.notice-strip').remove();
    if (target.id === 'clearPatientHistoryFilters') {
      document.getElementById('patientHistorySearch').value = '';
      document.getElementById('patientHistoryFrom').value = '';
      document.getElementById('patientHistoryTo').value = '';
      document.getElementById('patientHistoryDoctor').value = '';
      document.getElementById('patientHistoryType').value = '';
      document.getElementById('patientHistoryStatus').value = '';
      document.getElementById('patientHistoryContent').value = '';
      const patientId = activePatientRecordsId;
      if (patientId) renderPatientRecords(patientId);
    }
    if (target.id === 'exportPatientHistory' || target.id === 'printPatientHistory') {
      const patientId = activePatientRecordsId;
      if (patientId) {
        if (target.id === 'exportPatientHistory') exportPatientHistory(patientId);
        else printPatientHistory(patientId);
      }
    }
    if (target.id === 'overviewPrint' || target.id === 'reportPrint') printClinicSummary();
    if (target.matches('[data-open-patient-records]')) await openPatientRecords(target.dataset.openPatientRecords);
    if (target.matches('[data-invoice-prescriptions]')) {
      openPrescriptionInvoice(target.dataset.patientId, target.dataset.invoicePrescriptions);
    }
    if (target.matches('[data-edit-patient]')) openPatientEditor(target.dataset.editPatient);
    if (target.matches('[data-edit-medicine]')) openMedicineEditor(target.dataset.editMedicine);
    if (target.id === 'addClinicService') openClinicServiceEditor();
    if (target.matches('[data-edit-clinic-service]')) {
      openClinicServiceEditor(target.dataset.editClinicService);
    }
    if (target.matches('[data-toggle-clinic-service]')) {
      const service = data.clinicServices.find((item) => item.id === target.dataset.toggleClinicService);
      if (!service || !canManageClinicServices()) {
        showToast('Clinic service not found or you do not have permission to change it.');
        return;
      }
      const active = target.dataset.active === 'true';
      try {
        if (isApiConnected()) {
          const updated = await apiRequest(`/billing/services/${encodeURIComponent(service.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ active }),
          });
          Object.assign(service, normalizeApiClinicService(updated));
        } else {
          service.active = active;
          save();
        }
        renderClinicServices();
        showToast(active ? 'Clinic service activated.' : 'Clinic service deactivated.');
      } catch (error) {
        console.error('Unable to update clinic service.', error);
        showToast(error.message || 'Unable to update clinic service.');
      }
    }
    if (target.matches('[data-stock-consumable]')) {
      const item = data.consumables.find((entry) => entry.id === target.dataset.stockConsumable);
      if (!item) return;
      const change = Number(window.prompt(`How many ${item.name} units were received?`, '1'));
      if (!Number.isFinite(change) || change <= 0 || !Number.isInteger(change)) {
        showToast('Enter a positive whole number of units.');
        return;
      }
      if (isApiConnected()) {
        try {
          await apiRequest(`/consumables/${encodeURIComponent(item.id)}/stock`, {
            method: 'POST',
            body: JSON.stringify({ operation: 'RECEIVED', quantity: change, reason: 'Stock received from dashboard' }),
          });
          await refreshLiveData();
          showToast(`${item.name} stock updated.`);
        } catch (error) {
          console.error(error);
          showToast(error.message || 'Unable to receive supply stock.');
        }
        return;
      }
      const quantityBefore = Number(item.quantity);
      item.quantity = quantityBefore + Math.floor(change);
      data.inventoryMovements.push({
        kind: 'consumable',
        itemId: item.id,
        type: 'RECEIVED',
        quantityDelta: Math.floor(change),
        quantityBefore,
        quantityAfter: item.quantity,
        reason: 'Stock received from dashboard',
        createdAt: new Date().toISOString(),
      });
      save();
      renderAll();
      showToast(`${item.name} stock received.`);
    }
    if (target.matches('[data-consumable-history]')) {
      const item = data.consumables.find((entry) => entry.id === target.dataset.consumableHistory);
      if (item) await openInventoryHistory('consumable', item.id, item.name);
    }
    if (target.matches('[data-use-consumable]')) {
      openConsumableUseEditor(target.dataset.useConsumable);
    }
    if (target.matches('[data-edit-consumable]')) openConsumableEditor(target.dataset.editConsumable);
    if (target.matches('[data-medicine-history]')) {
      const item = data.medicines.find((entry) => entry.id === target.dataset.medicineHistory);
      if (item) await openInventoryHistory('medicine', item.id, item.name);
    }
    if (target.matches('[data-stock-medicine]')) {
      const medicine = data.medicines.find((item) => item.id === target.dataset.stockMedicine);
      if (!medicine) return;
      const change = Number(window.prompt(`How many ${medicine.name} units were received?`, '1'));
      if (!Number.isFinite(change) || change <= 0 || !Number.isInteger(change)) { showToast('Enter a positive whole number of units.'); return; }
      if (isApiConnected()) {
        try {
          await apiRequest(`/medicines/${encodeURIComponent(medicine.id)}/stock`, {
            method: 'POST',
            body: JSON.stringify({ operation: 'RECEIVE', quantity: change, reason: 'Stock received from dashboard' }),
          });
          await refreshLiveData();
          showToast(`${medicine.name} stock updated.`);
        } catch (error) {
          console.error(error);
          showToast(error.message || 'Unable to update medicine stock.');
        }
      } else {
        medicine.quantity = Number(medicine.quantity) + change;
        save(); renderAll(); showToast(`${medicine.name} stock updated.`);
      }
    }
    if (target.matches('[data-cancel-appointment]')) {
      const appointment = data.appointments.find((item) => item.id === target.dataset.cancelAppointment);
      if (appointment && window.confirm('Cancel this appointment?')) {
        if (isApiConnected()) {
          try {
            await apiRequest(`/appointments/${encodeURIComponent(appointment.id)}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'CANCELLED' }),
            });
            await refreshLiveData();
            showToast('Appointment cancelled.');
          } catch (error) {
            console.error(error);
            showToast(error.message || 'Unable to cancel appointment.');
          }
        } else {
          appointment.status = 'Cancelled';
          save(); renderAll(); showToast('Appointment cancelled.');
        }
      }
    }
    if (target.matches('[data-print-invoice]')) {
      const invoice = data.invoices.find((item) => item.id === target.dataset.printInvoice);
      if (invoice) printBillingDocument(invoice, 'invoice');
    }
    if (target.matches('[data-print-receipt]')) {
      const invoice = data.invoices.find((item) => item.id === target.dataset.printReceipt);
      if (invoice) printBillingDocument(invoice, 'receipt');
    }
    if (target.matches('[data-pay-invoice]')) {
      const invoice = data.invoices.find((item) => item.id === target.dataset.payInvoice);
      if (!invoice) return;
      const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paid));
      const form = document.getElementById('paymentForm');
      resetForm(form);
      form.elements.namedItem('invoiceId').value = invoice.id;
      form.elements.namedItem('amount').max = String(remaining);
      form.elements.namedItem('amount').value = String(remaining);
      form.elements.namedItem('date').value = dateKey(today);
      form.elements.namedItem('method').value = 'Cash';
      openModal('paymentModal');
    }
    if (target.matches('[data-void-invoice]')) {
      const invoice = data.invoices.find((item) => item.id === target.dataset.voidInvoice);
      if (!invoice || isInvoiceVoided(invoice)) return;
      if (Number(invoice.paid) > 0) {
        showToast('Only invoices with no recorded payments can be voided.');
        return;
      }
      const form = document.getElementById('invoiceVoidForm');
      resetForm(form);
      form.elements.namedItem('invoiceId').value = invoice.id;
      openModal('invoiceVoidModal');
    }
  });

  document.getElementById('patientForm').addEventListener('click', (event) => {
    const button = event.target.closest('button[name="saveAction"]');
    if (button) event.currentTarget.dataset.saveAction = button.value;
  });

  document.getElementById('patientProfileContent').addEventListener('submit', async (event) => {
    const form = event.target.closest('form[data-patient-history-form], form[data-patient-vitals-form]');
    if (!form) return;
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      if (form.matches('[data-patient-vitals-form]')) await submitPatientVitalsForm(form);
      else await submitPatientHistoryForm(form);
    } catch (error) {
      console.error('Unable to save patient record.', error);
      showToast(error.message || 'Unable to save patient record.');
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.getElementById('patientForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const invalidIdentity = updatePatientIdentityValidity(form, true);
    if (invalidIdentity) {
      setPatientFormStep(0);
      invalidIdentity.reportValidity();
      return;
    }
    const fields = new FormData(form);
    const id = String(fields.get('id') || '');
    const draftId = String(fields.get('draftId') || '');
    const current = data.patients.find((item) => item.id === id);
    const birthDate = String(fields.get('dob') || '');
    if (birthDate && birthDate > dateKey(new Date())) {
      const control = form.elements.namedItem('dob');
      control.setCustomValidity('Date of birth cannot be in the future.');
      control.reportValidity();
      control.setCustomValidity('');
      setPatientFormStep(0);
      return;
    }
    const duplicateMatches = getPotentialPatientDuplicates(fields, id);
    if (duplicateMatches.length && !form.querySelector('#patientDuplicateConfirmed')?.checked) {
      updatePatientDuplicateWarning();
      showToast('Check for an existing patient and confirm before continuing.');
      setPatientFormStep(0);
      return;
    }
    const submitButton = event.submitter || (document.activeElement instanceof HTMLButtonElement
      ? document.activeElement
      : null);
    const continueAfterSave = submitButton?.dataset.saveAction === 'continue'
      || (submitButton?.name === 'saveAction' && submitButton.value === 'continue')
      || form.dataset.saveAction === 'continue'
      || (!id && Boolean(draftId));
    const assignAfterSave = submitButton?.dataset.saveAction === 'assign'
      || (submitButton?.name === 'saveAction' && submitButton.value === 'assign')
      || form.dataset.saveAction === 'assign';
    delete form.dataset.saveAction;
    if (isApiConnected()) {
      if (submitButton) submitButton.disabled = true;
      try {
        const savedPatient = await apiRequest(id ? `/patients/${encodeURIComponent(id)}` : '/patients', {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify(apiPatientPayload(fields)),
        });
        const refreshed = await hydrateFromApi();
        renderAll();
        if (!refreshed) throw new Error('Patient was saved, but updated clinic data could not be reloaded. Refresh the patient list before continuing.');
        if (draftId) {
          try {
            await apiRequest(`/patients/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
            data.patientDrafts = data.patientDrafts.filter((draft) => draft.id !== draftId);
            renderPatients();
            renderPatientDrafts();
          } catch (error) {
            console.error('Patient saved, but the completed registration draft could not be removed.', error);
            showToast('Patient saved. The old draft could not be removed; delete it from Drafts.');
          }
        }
        closeModal(document.getElementById('patientModal'));
        if (assignAfterSave && savedPatient.id) {
          showToast(id ? 'Patient record updated. Opening doctor assignment.' : 'Patient registered. Opening doctor assignment.');
          await openCheckInModal(savedPatient.id);
        } else if (continueAfterSave && savedPatient.id) {
          showToast(id ? 'Patient record updated. Opening the patient profile.' : 'Patient registered. Opening the patient profile.');
          await openPatientProfile(savedPatient.id);
        } else {
          showToast(id ? 'Patient record updated.' : 'Patient registered.');
        }
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Unable to save patient record.');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
      return;
    }

    const patient = {
      id: current?.id || makeId('patient'),
      code: current?.code || nextPatientCode(),
      name: patientFullNameFromFields(fields),
      phone: String(fields.get('phone')).trim(),
      dob: String(fields.get('dob') || ''),
      gender: String(fields.get('gender') || 'Unspecified'),
      email: String(fields.get('email') || '').trim(),
      bloodGroup: String(fields.get('bloodGroup') || ''),
      address: String(fields.get('address') || '').trim(),
      notes: String(fields.get('notes') || '').trim(),
      allergies: String(fields.get('notes') || '').trim(),
      medicalHistory: String(fields.get('medicalHistory') || '').trim(),
      surgicalHistory: String(fields.get('surgicalHistory') || '').trim(),
      familyHistory: String(fields.get('familyHistory') || '').trim(),
      currentMedications: String(fields.get('currentMedications') || '').trim(),
      city: String(fields.get('city') || '').trim(),
      state: String(fields.get('state') || '').trim(),
      postalCode: String(fields.get('postalCode') || '').trim(),
      relationToAccount: String(fields.get('relationToAccount') || '').trim(),
      emergencyContact: emergencyContactSummary(fields),
      emergencyContactName: String(fields.get('emergencyContactName') || '').trim(),
      emergencyContactRelationship: String(fields.get('emergencyContactRelationship') || '').trim(),
      emergencyPhone: String(fields.get('emergencyPhone') || '').trim(),
      occupation: String(fields.get('occupation') || '').trim(),
      maritalStatus: String(fields.get('maritalStatus') || '').trim(),
      preferredLanguage: String(fields.get('preferredLanguage') || '').trim(),
      insuranceProvider: String(fields.get('insuranceProvider') || '').trim(),
      insuranceNumber: String(fields.get('insuranceNumber') || '').trim(),
      insuranceSumInsured: fields.get('insuranceSumInsured') ? Number(fields.get('insuranceSumInsured')) : null,
      profilePhotoDataUrl: String(fields.get('profilePhotoDataUrl') || ''),
      status: current?.status || 'Active',
      createdAt: current?.createdAt || new Date().toISOString(),
      registeredBy: current?.registeredBy || 'Front office',
    };
    if (current) Object.assign(current, patient); else data.patients.push(patient);
    data.patientDrafts = data.patientDrafts.filter((draft) => draft.id !== draftId);
    save(); renderAll(); closeModal(document.getElementById('patientModal'));
    if (assignAfterSave) {
      showToast(current ? 'Patient updated. Opening doctor assignment.' : 'Patient registered. Opening doctor assignment.');
      await openCheckInModal(patient.id);
      return;
    }
    const shouldOpenProfile = continueAfterSave && !current;
    if (shouldOpenProfile) {
      showToast('Patient registered. Opening the patient profile.');
      activePatientProfileId = patient.id;
      activePatientProfileTab = 'overview';
      openModal('patientProfileModal');
      renderPatientProfile(patient);
    } else {
      showToast(current ? 'Patient record updated.' : 'Patient registered.');
    }
  });

  document.getElementById('externalMedicalRecordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const patientId = String(fields.get('patientId') || '');
    const recordId = String(fields.get('recordId') || '');
    const recordDate = String(fields.get('recordDate') || '');
    if (recordDate > dateKey(today)) {
      showToast('Outside record date cannot be in the future.');
      return;
    }

    const payload = {
      recordDate,
      recordType: String(fields.get('recordType') || '').trim(),
      doctorName: String(fields.get('doctorName') || '').trim(),
      facilityName: String(fields.get('facilityName') || '').trim(),
      diagnosis: String(fields.get('diagnosis') || '').trim(),
      treatment: String(fields.get('treatment') || '').trim(),
      medications: String(fields.get('medications') || '').trim(),
      investigations: String(fields.get('investigations') || '').trim(),
      notes: String(fields.get('notes') || '').trim(),
    };
    if (recordId && fields.get('removeAttachment') === 'on') payload.removeAttachment = true;
    const file = form.elements.namedItem('attachment').files?.[0];
    if (file) {
      const extension = String(file.name.split('.').pop() || '').toLowerCase();
      const allowedTypes = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        txt: 'text/plain',
      };
      const expectedMime = allowedTypes[extension];
      const actualMime = String(file.type || '').split(';')[0].toLowerCase();
      if (file.size > 2 * 1024 * 1024) {
        showToast('Report file must be smaller than 2 MB.');
        return;
      }
      if (!expectedMime || (actualMime && actualMime !== expectedMime)) {
        showToast('Choose a PDF, PNG, JPEG, WebP, GIF, or plain-text report.');
        return;
      }
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Checking attachment…';
      try {
        if (!await isValidReportFileContent(file, extension)) {
          showToast('The selected file does not match its allowed file type.');
          return;
        }
        payload.fileName = sanitizeReportFileName(file.name);
        payload.mimeType = expectedMime;
        payload.fileDataUrl = await fileToDataUrl(file, expectedMime);
        delete payload.removeAttachment;
      } catch (error) {
        console.error('Unable to read the outside medical record attachment.', error);
        showToast('Could not read the selected report file.');
        return;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = recordId ? 'Update outside record' : 'Save outside record';
      }
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const submitLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      if (isApiConnected()) {
        const saved = await apiRequest(
          `/patients/${encodeURIComponent(patientId)}/external-records${recordId ? `/${encodeURIComponent(recordId)}` : ''}`,
          { method: recordId ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
        );
        const normalized = normalizeApiExternalMedicalRecord({ ...saved, patientId });
        if (recordId) {
          data.externalMedicalRecords = data.externalMedicalRecords.map((record) =>
            record.id === recordId ? normalized : record);
        } else {
          data.externalMedicalRecords.push(normalized);
        }
      } else {
        const current = recordId
          ? data.externalMedicalRecords.find((record) => record.id === recordId && record.patientId === patientId)
          : null;
        const record = {
          ...current,
          ...payload,
          id: current?.id || makeId('external-record'),
          patientId,
          createdAt: current?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileName: payload.fileDataUrl ? payload.fileName : current?.fileName || null,
          mimeType: payload.fileDataUrl ? payload.mimeType : current?.mimeType || null,
          fileDataUrl: payload.fileDataUrl || current?.fileDataUrl || null,
        };
        if (payload.removeAttachment) {
          record.fileName = null;
          record.mimeType = null;
          record.fileDataUrl = null;
        }
        delete record.removeAttachment;
        if (current) {
          data.externalMedicalRecords = data.externalMedicalRecords.map((item) => item.id === recordId ? record : item);
        } else {
          data.externalMedicalRecords.push(record);
        }
        save();
      }

      closeModal(document.getElementById('externalMedicalRecordModal'));
      const patient = patientById(patientId);
      if (patient && activePatientProfileId === patientId) renderPatientProfile(patient);
      showToast(recordId ? 'Outside-provider record updated.' : 'Outside-provider record saved.');
    } catch (error) {
      console.error('Unable to save the outside-provider medical record.', error);
      showToast(error.message || 'Unable to save the outside-provider record.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });

  document.getElementById('medicineForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const id = String(fields.get('id') || '');
    const current = data.medicines.find((item) => item.id === id);
    if (isApiConnected()) {
      const payload = apiMedicinePayload(fields);
      try {
        if (id) {
          await apiRequest(`/medicines/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: payload.name,
              category: payload.category,
              brand: payload.brand,
              manufacturer: payload.manufacturer,
              productSize: payload.productSize,
              supplier: payload.supplier,
              batchNumber: payload.batchNumber,
              ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
              reorderLevel: payload.reorderLevel,
              purchasePrice: payload.purchasePrice,
              sellingPrice: payload.sellingPrice,
            }),
          });

          const stockDifference = payload.quantity - Number(current?.quantity || 0);
          if (stockDifference !== 0) {
            await apiRequest(`/medicines/${encodeURIComponent(id)}/stock`, {
              method: 'POST',
              body: JSON.stringify({
                operation: stockDifference > 0 ? 'RECEIVE' : 'DISPENSE',
                quantity: Math.abs(stockDifference),
                reason: 'Stock updated from medicine form',
              }),
            });
          }
        } else {
          await apiRequest('/medicines', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
        await refreshLiveData();
        closeModal(document.getElementById('medicineModal'));
        showToast(id ? 'Medicine details updated.' : 'Medicine added to inventory.');
      } catch (error) {
        console.error(error);
        await refreshLiveData();
        showToast(error.message || 'Unable to save medicine details.');
      }
      return;
    }

    const medicine = {
      id: current?.id || makeId('medicine'),
      name: String(fields.get('name')).trim(),
      category: String(fields.get('category') || '').trim(),
      brand: String(fields.get('brand') || '').trim(),
      manufacturer: String(fields.get('manufacturer') || '').trim(),
      productSize: String(fields.get('productSize') || '').trim(),
      supplier: String(fields.get('supplier') || '').trim(),
      batch: String(fields.get('batch') || '').trim(),
      expiry: String(fields.get('expiry') || ''),
      quantity: Math.max(0, Number(fields.get('quantity')) || 0),
      reorder: Math.max(0, Number(fields.get('reorder')) || 0),
      cost: Math.max(0, Number(fields.get('cost')) || 0),
      price: Math.max(0, Number(fields.get('price')) || 0)
    };
    if (current) {
      const quantityBefore = Number(current.quantity);
      Object.assign(current, medicine);
      if (quantityBefore !== medicine.quantity) {
        data.inventoryMovements.push({
          kind: 'medicine',
          itemId: medicine.id,
          type: quantityBefore < medicine.quantity ? 'RECEIVED' : 'DISPENSED',
          quantityDelta: medicine.quantity - quantityBefore,
          quantityBefore,
          quantityAfter: medicine.quantity,
          reason: 'Stock updated from medicine form',
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      data.medicines.push(medicine);
      if (medicine.quantity > 0) {
        data.inventoryMovements.push({
          kind: 'medicine',
          itemId: medicine.id,
          type: 'RECEIVED',
          quantityDelta: medicine.quantity,
          quantityBefore: 0,
          quantityAfter: medicine.quantity,
          reason: 'Opening stock',
          createdAt: new Date().toISOString(),
        });
      }
    }
    save(); renderAll(); closeModal(document.getElementById('medicineModal')); showToast(current ? 'Medicine details updated.' : 'Medicine added to inventory.');
  });

  document.getElementById('supplierForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await saveSupplierForm(form);
    } catch (error) {
      console.error('Unable to save supplier.', error);
      showToast(error.message || 'Unable to save supplier.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('purchaseOrderForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await savePurchaseOrderForm(form);
    } catch (error) {
      console.error('Unable to create purchase order.', error);
      showToast(error.message || 'Unable to create purchase order.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('purchaseReceiptForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await receivePurchaseOrderForm(form);
    } catch (error) {
      console.error('Unable to record goods receipt.', error);
      showToast(error.message || 'Unable to record goods receipt.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('pharmacyOrderForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await savePharmacyOrderForm(form);
    } catch (error) {
      console.error('Unable to record pharmacy order.', error);
      showToast(error.message || 'Unable to record pharmacy order.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('appointmentDoctorApi').addEventListener('change', () => void loadAppointmentSlots());
  document.querySelector('#appointmentForm [name="date"]').addEventListener('change', () => {
    if (isApiConnected()) void loadAppointmentSlots();
  });
  document.getElementById('checkInPatientSearch').addEventListener('input', filterCheckInPatients);
  document.getElementById('checkInPatient').addEventListener('change', updateCheckInVitalsPreview);
  document.getElementById('checkInForm').addEventListener('input', updateCheckInVitalsPreview);
  document.getElementById('checkInForm').addEventListener('change', updateCheckInVitalsPreview);

  document.getElementById('checkInForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const patientId = String(fields.get('patientId') || '');
    const doctorId = String(fields.get('doctorId') || '');
    const appointmentId = String(fields.get('appointmentId') || '');
    const department = String(fields.get('department') || '').trim();
    const vitals = checkInVitalsPayload(form);
    if (submitButton) submitButton.disabled = true;
    try {
      if (isApiConnected()) {
        const queueEntry = await apiRequest('/appointments/check-ins', {
          method: 'POST',
          body: JSON.stringify({
            patientId,
            doctorId,
            department,
            encounterType: String(fields.get('encounterType') || 'OPD'),
            priority: String(fields.get('priority') || 'NORMAL'),
            reason: String(fields.get('reason') || '').trim(),
            ...(vitals ? { vitals } : {}),
            ...(appointmentId ? { appointmentId } : {}),
          }),
        });
        closeModal(document.getElementById('checkInModal'));
        await refreshLiveData();
        showToast(`Patient checked in with token ${queueEntry.tokenNumber}.`);
        return;
      }

      const patient = patientById(patientId);
      const doctor = doctorId;
      if (!patient || !doctor) throw new Error('Select an existing patient and doctor.');
      const queueDate = dateKey(today);
      const activeStatuses = ['WAITING', 'CALLED', 'IN_CONSULTATION'];
      const duplicate = (data.queueTokens || []).some((item) =>
        item.patientId === patientId &&
        item.doctorId === doctorId &&
        item.queueDate === queueDate &&
        activeStatuses.includes(item.status));
      if (duplicate) throw new Error('This patient already has an active queue entry for this doctor today.');
      const tokenNumber = Math.max(0, ...(data.queueTokens || [])
        .filter((item) => item.doctorId === doctorId && item.queueDate === queueDate)
        .map((item) => Number(item.tokenNumber) || 0)) + 1;
      const tokenId = makeId('queue');
      const encounterId = makeId('visit');
      const reason = String(fields.get('reason') || '').trim();
      const assignmentAt = new Date().toISOString();
      const patientType = patient.lastVisit || getPatientRecords(patientId).length ? 'EXISTING' : 'NEW';
      const queueEntry = {
        id: tokenId,
        patientId,
        doctorId,
        doctor,
        department,
        assignedBy: 'Front office',
        assignmentAt,
        patientType,
        tokenNumber,
        queueDate,
        priority: String(fields.get('priority') || 'NORMAL'),
        status: 'WAITING',
        reason,
        encounterType: String(fields.get('encounterType') || 'OPD'),
        encounterId,
        appointmentId: appointmentId || '',
        time: new Date(assignmentAt).toTimeString().slice(0, 5),
        appointmentStartsAt: appointmentId
          ? (() => {
            const appointment = data.appointments.find((item) => item.id === appointmentId);
            return appointment ? `${appointment.date}T${appointment.time}` : '';
          })()
          : '',
      };
      data.queueTokens = [...(data.queueTokens || []), queueEntry];
      data.patientRecords.push({
        id: encounterId,
        patientId,
        encounterType: queueEntry.encounterType,
        status: 'OPEN',
        visitDate: queueDate,
        doctorName: doctor,
        symptoms: reason,
        queueTokenId: tokenId,
        prescriptionItems: [],
        reports: [],
        createdAt: new Date().toISOString(),
      });
      if (vitals) {
        data.patientVitals.push(localCheckInVitalsRecord(vitals, patient, encounterId, doctor, assignmentAt));
      }
      if (appointmentId) {
        const appointment = data.appointments.find((item) => item.id === appointmentId);
        if (appointment) appointment.status = 'Checked in';
      }
      save();
      renderAll();
      closeModal(document.getElementById('checkInModal'));
      showToast(`Patient checked in with token ${tokenNumber}.`);
    } catch (error) {
      console.error('Unable to check in patient.', error);
      showToast(error.message || 'Unable to check in patient.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.getElementById('appointmentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (isApiConnected()) {
      try {
        await apiRequest('/appointments', {
          method: 'POST',
          body: JSON.stringify({
            patientId: String(fields.get('patientId')),
            slotId: String(fields.get('slotId')),
            reason: String(fields.get('reason') || '').trim(),
          }),
        });
        await refreshLiveData();
        closeModal(document.getElementById('appointmentModal'));
        showToast('Appointment scheduled.');
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Unable to schedule appointment.');
      }
      return;
    }

    data.appointments.push({
      id: makeId('appointment'),
      patientId: String(fields.get('patientId')),
      doctor: String(fields.get('doctor')).trim(),
      department: String(fields.get('department') || '').trim(),
      date: String(fields.get('date')),
      time: String(fields.get('time')),
      reason: String(fields.get('reason') || '').trim(),
      status: 'Scheduled'
    });
    save(); renderAll(); closeModal(document.getElementById('appointmentModal')); showToast('Appointment scheduled.');
  });

  document.getElementById('clinicServiceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canManageClinicServices()) {
      showToast('Only clinic administrators can manage service charges.');
      return;
    }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const id = String(fields.get('id') || '');
    const payload = {
      name: String(fields.get('name') || '').trim(),
      price: Number(fields.get('price')),
      ...(!id ? { code: String(fields.get('code') || '').trim().toUpperCase() } : {}),
    };
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      let service;
      if (isApiConnected()) {
        service = normalizeApiClinicService(await apiRequest(
          id ? `/billing/services/${encodeURIComponent(id)}` : '/billing/services',
          { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
        ));
        data.clinicServices = id
          ? data.clinicServices.map((item) => item.id === id ? service : item)
          : [...data.clinicServices, service];
      } else if (id) {
        service = data.clinicServices.find((item) => item.id === id);
        if (!service) throw new Error('Clinic service not found.');
        Object.assign(service, payload);
      } else {
        service = { id: makeId('service'), ...payload, active: true };
        data.clinicServices.push(service);
      }
      if (!isApiConnected()) save();
      renderClinicServices();
      closeModal(document.getElementById('clinicServiceModal'));
      showToast(id ? 'Clinic service updated.' : 'Clinic service added.');
    } catch (error) {
      console.error('Unable to save clinic service.', error);
      showToast(error.message || 'Unable to save clinic service.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.getElementById('prescriptionApplyFilters').addEventListener('click', renderPrescriptions);
  document.getElementById('prescriptionSearch').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') renderPrescriptions();
  });
  document.getElementById('pharmacyPosPatientSearch').addEventListener('input', (event) => {
    const patient = resolvePharmacyPosPatient(event.currentTarget.value);
    if (patient?.id !== pharmacyPosPatientId) {
      pharmacyPosPatientId = patient?.id || '';
      pharmacyPosPrescription = null;
      pharmacyPosCart = [];
    }
    renderPharmacyPos();
  });
  document.getElementById('pharmacyPosMedicineSearch').addEventListener('input', renderPharmacyPosMedicineSuggestions);
  document.getElementById('pharmacyPosDiscount').addEventListener('input', (event) => {
    pharmacyPosDiscount = Math.max(0, Number(event.currentTarget.value) || 0);
    updatePharmacyPosTotals();
  });
  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-pos-quantity]')) return;
    const item = pharmacyPosCart[Number(event.target.dataset.posQuantity)];
    if (!item) return;
    item.quantity = Math.max(1, Math.min(item.maxQuantity, Number(event.target.value) || 1));
    renderPharmacyPos();
  });

  document.getElementById('invoiceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const patientId = String(event.currentTarget.elements.namedItem('patientId').value || '');
    const patient = patientById(patientId);
    const items = currentInvoiceLines();
    if (!patient) { showToast('Select a patient for this invoice.'); return; }
    if (!items.length) { showToast('Add at least one invoice item.'); return; }
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(fields.get('discount')) || 0));
    const taxRate = Math.min(100, Math.max(0, Number(fields.get('taxRate')) || 0));
    const taxAmount = (subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + taxAmount;
    const paid = Number(fields.get('paid')) || 0;
    if (paid < 0 || paid > total) { showToast('Payment cannot exceed the invoice total.'); return; }
    const medicineIds = items.filter((item) => item.medicineId).map((item) => item.medicineId);
    if (new Set(medicineIds).size !== medicineIds.length) {
      showToast('Add each medicine only once per invoice.');
      return;
    }
    const consumableIds = items.filter((item) => item.consumableId).map((item) => item.consumableId);
    if (new Set(consumableIds).size !== consumableIds.length) {
      showToast('Add each clinical supply only once per invoice.');
      return;
    }
    const serviceIds = items.filter((item) => item.serviceId).map((item) => item.serviceId);
    if (new Set(serviceIds).size !== serviceIds.length) {
      showToast('Add each clinic service only once per invoice.');
      return;
    }
    const invalidMedicineLine = items.find((item) => {
      if (!item.medicineId) return false;
      const medicine = data.medicines.find((entry) => entry.id === item.medicineId && entry.active !== false);
      if (!medicine) return { ...item, error: 'is no longer active in inventory.' };
      if (medicine.expiry && medicine.expiry < dateKey(today)) return { ...item, error: 'has expired and cannot be billed.' };
      if (Number(medicine.quantity) < item.quantity) return { ...item, error: 'does not have enough stock.' };
      return false;
    });
    if (invalidMedicineLine) { showToast(`${invalidMedicineLine.name} ${invalidMedicineLine.error}`); return; }
    const invalidConsumableLine = items.find((item) => {
      if (!item.consumableId) return false;
      const supply = data.consumables.find((entry) => entry.id === item.consumableId && entry.active !== false);
      if (!supply) return { ...item, error: 'is no longer active in inventory.' };
      if (supply.expiry && supply.expiry < dateKey(today)) return { ...item, error: 'has expired and cannot be billed.' };
      if (Number(supply.quantity) < item.quantity) return { ...item, error: 'does not have enough stock.' };
      return false;
    });
    if (invalidConsumableLine) { showToast(`${invalidConsumableLine.name} ${invalidConsumableLine.error}`); return; }
    if (isApiConnected()) {
      const paymentMethod = apiPaymentMethod(String(fields.get('paymentMethod') || 'Cash'));
      const paymentDate = String(fields.get('date') || dateKey(today));
      const payload = {
        patientId,
        encounterId: String(fields.get('encounterId') || '') || null,
        invoiceDate: paymentDate,
        template: String(fields.get('template') || 'professional').toUpperCase(),
        discount,
        taxRate,
        notes: String(fields.get('notes') || '').trim(),
        items: items.map((item) => item.prescriptionMedicationId
          ? { prescriptionMedicationId: item.prescriptionMedicationId, quantity: item.quantity }
          : item.serviceId
          ? { serviceId: item.serviceId, quantity: item.quantity }
          : item.medicineId
          ? {
              medicineId: item.medicineId,
              quantity: item.quantity,
              ...(item.prescriptionItemId ? { prescriptionItemId: item.prescriptionItemId } : {}),
            }
          : item.consumableId
          ? { consumableId: item.consumableId, quantity: item.quantity }
          : { name: item.name, quantity: item.quantity, unitPrice: item.price }),
        ...(paid > 0 ? {
          initialPayment: {
            amount: paid,
            method: paymentMethod,
            paidAt: `${paymentDate}T12:00:00.000Z`,
          },
        } : {}),
      };

      try {
        const created = await apiRequest('/billing/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const createdInvoice = normalizeApiInvoice(created);
        const refreshed = await hydrateFromApi();
        const invoice = refreshed ? data.invoices.find((item) => item.id === createdInvoice.id) || createdInvoice : createdInvoice;
        if (!data.invoices.some((item) => item.id === invoice.id)) data.invoices.push(invoice);
        clearPharmacyPosCheckout();
        renderAll();
        closeModal(document.getElementById('invoiceModal'));
        showView('billing');
        showToast('Invoice saved. Opening print preview.');
        setTimeout(() => printBillingDocument(invoice, 'invoice'), 250);
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Unable to save invoice.');
      }
      return;
    }

    const invoiceNumber = nextInvoiceNumber();
    const invoice = {
      id: makeId('invoice'),
      number: invoiceNumber,
      patientId,
      encounterId: String(fields.get('encounterId') || '') || null,
      date: String(fields.get('date') || dateKey(today)),
      items,
      subtotal,
      discount,
      taxRate,
      taxAmount,
      total,
      paid,
      template: String(fields.get('template') || 'professional'),
      paymentMethod: String(fields.get('paymentMethod') || 'Cash'),
      payments: paid > 0 ? [{
        amount: paid,
        date: new Date().toISOString(),
        method: String(fields.get('paymentMethod') || 'Cash'),
        reference: '',
        receiptNumber: `${invoiceNumber}-R1`
      }] : [],
      notes: String(fields.get('notes') || '').trim(),
      createdAt: new Date().toISOString()
    };
    items.forEach((item) => { if (item.medicineId) { const medicine = data.medicines.find((entry) => entry.id === item.medicineId); if (medicine) medicine.quantity -= item.quantity; } });
    items.forEach((item) => {
      if (!item.consumableId) return;
      const supply = data.consumables.find((entry) => entry.id === item.consumableId);
      if (!supply) return;
      const quantityBefore = Number(supply.quantity);
      supply.quantity = quantityBefore - item.quantity;
      data.inventoryMovements.push({
        kind: 'consumable',
        itemId: supply.id,
        patientId,
        type: 'DISPENSED',
        quantityDelta: -item.quantity,
        quantityBefore,
        quantityAfter: supply.quantity,
        reason: 'Used for patient care and billed on an invoice',
        createdAt: new Date().toISOString(),
      });
    });
    items.forEach((item) => {
      if (!item.prescriptionItemId) return;
      const prescription = data.patientRecords
        .flatMap((record) => record.prescriptionItems || [])
        .find((entry) => entry.id === item.prescriptionItemId);
      if (prescription) prescription.billedQuantity = Number(prescription.billedQuantity || 0) + item.quantity;
    });
    data.invoices.push(invoice);
    clearPharmacyPosCheckout();
    save(); renderAll(); closeModal(document.getElementById('invoiceModal')); showView('billing'); showToast('Invoice saved. Opening print preview.'); setTimeout(() => printBillingDocument(invoice, 'invoice'), 250);
  });

  document.getElementById('paymentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const invoice = data.invoices.find((item) => item.id === String(fields.get('invoiceId')));
    const amount = Number(fields.get('amount'));
    if (!invoice) { showToast('Invoice not found. Refresh billing and try again.'); return; }
    const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paid));
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      showToast(`Enter a payment greater than zero and no more than ${money(remaining)}.`);
      return;
    }
    const date = String(fields.get('date'));
    if (isApiConnected()) {
      try {
        const updated = await apiRequest(`/billing/invoices/${encodeURIComponent(invoice.id)}/payments`, {
          method: 'POST',
          body: JSON.stringify({
            amount,
            method: apiPaymentMethod(String(fields.get('method') || 'Cash')),
            reference: String(fields.get('reference') || '').trim(),
            paidAt: `${date}T12:00:00.000Z`,
          }),
        });
        const updatedInvoice = normalizeApiInvoice(updated);
        const refreshed = await hydrateFromApi();
        const currentInvoice = refreshed ? data.invoices.find((item) => item.id === updatedInvoice.id) || updatedInvoice : updatedInvoice;
        if (!data.invoices.some((item) => item.id === currentInvoice.id)) data.invoices.push(currentInvoice);
        const payment = updatedInvoice.payments[updatedInvoice.payments.length - 1] || null;
        renderAll();
        closeModal(document.getElementById('paymentModal'));
        showToast('Payment recorded. Opening receipt print preview.');
        setTimeout(() => printBillingDocument(currentInvoice, 'receipt', payment), 250);
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Unable to record payment.');
      }
      return;
    }

    const receiptNumber = `${invoice.number}-R${invoice.payments.length + 1}`;
    const payment = {
      amount,
      date: new Date(`${date}T12:00:00`).toISOString(),
      method: String(fields.get('method') || 'Cash'),
      reference: String(fields.get('reference') || '').trim(),
      receiptNumber
    };
    invoice.paid = Number(invoice.paid) + amount;
    invoice.payments.push(payment);
    save();
    renderAll();
    closeModal(document.getElementById('paymentModal'));
    showToast('Payment recorded. Opening receipt print preview.');
    setTimeout(() => printBillingDocument(invoice, 'receipt', payment), 250);
  });

  document.getElementById('invoiceVoidForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const invoice = data.invoices.find((item) => item.id === String(fields.get('invoiceId')));
    const reason = String(fields.get('reason') || '').trim();
    const submitButton = form.querySelector('button[type="submit"]');
    if (!invoice || isInvoiceVoided(invoice)) {
      showToast('Invoice not found or already voided. Refresh billing and try again.');
      return;
    }
    if (Number(invoice.paid) > 0 || (invoice.payments || []).length > 0) {
      showToast('Only invoices with no recorded payments can be voided.');
      return;
    }
    if (reason.length < 3) {
      showToast('Enter a reason of at least 3 characters.');
      return;
    }

    if (submitButton) submitButton.disabled = true;
    try {
      if (isApiConnected()) {
        const updated = normalizeApiInvoice(await apiRequest(
          `/billing/invoices/${encodeURIComponent(invoice.id)}/void`,
          { method: 'POST', body: JSON.stringify({ reason }) },
        ));
        const index = data.invoices.findIndex((item) => item.id === updated.id);
        if (index >= 0) data.invoices[index] = updated;
        else data.invoices.push(updated);
      } else {
        invoice.voidedAt = new Date().toISOString();
        invoice.voidReason = reason;
        invoice.status = 'VOIDED';
      }
      save();
      renderAll();
      closeModal(document.getElementById('invoiceVoidModal'));
      showToast('Unpaid invoice voided. Inventory movements were not reversed.');
    } catch (error) {
      console.error('Unable to void invoice.', error);
      showToast(error.message || 'Unable to void invoice.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.querySelectorAll('#invoiceForm [name="discount"], #invoiceForm [name="taxRate"]').forEach((input) => {
    input.addEventListener('input', calculateInvoice);
  });

  document.getElementById('settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    let vitalReferenceRanges;
    try {
      vitalReferenceRanges = canManageClinicSettings()
        ? readVitalReferenceRanges()
        : data.settings.vitalReferenceRanges || [];
    } catch (error) {
      showToast(error.message || 'Check the vital reference ranges.');
      return;
    }
    const settings = { ...Object.fromEntries(fields.entries()), vitalReferenceRanges };
    if (isApiConnected()) {
      try {
        await apiRequest('/clinic/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            name: String(settings.clinicName || '').trim(),
            phone: String(settings.phone || '').trim(),
            email: String(settings.email || '').trim(),
            address: String(settings.address || '').trim(),
            practitionerName: String(settings.practitioner || '').trim(),
            registrationNumber: String(settings.registration || '').trim(),
            taxId: String(settings.taxId || '').trim(),
            currency: String(settings.currency || 'INR').trim(),
            invoiceFooter: String(settings.invoiceFooter || '').trim(),
            ...(canManageClinicSettings() ? { vitalReferenceRanges } : {}),
          }),
        });
        data.settings = settings;
        save();
        renderAll();
        showToast('Clinic details saved to the API.');
      } catch (error) {
        showToast(error.message || 'Clinic details could not be saved to the API.');
      }
      return;
    }
    data.settings = settings;
    save();
    renderAll();
    showToast('Clinic details saved.');
  });
  document.getElementById('addVitalReferenceRange').addEventListener('click', () => {
    const body = document.getElementById('vitalReferenceRangesBody');
    body.querySelector('.vital-range-empty')?.closest('tr')?.remove();
    body.insertAdjacentHTML('beforeend', vitalReferenceRangeRowMarkup());
  });
  document.getElementById('vitalReferenceRangesBody').addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-vital-range]');
    if (!removeButton) return;
    removeButton.closest('[data-vital-range-row]')?.remove();
    const body = document.getElementById('vitalReferenceRangesBody');
    if (!body.querySelector('[data-vital-range-row]')) {
      body.innerHTML = '<tr><td colspan="7" class="vital-range-empty">No ranges configured. Readings remain unclassified until clinician-approved ranges are added.</td></tr>';
    }
  });
  document.getElementById('vitalReferenceRangesBody').addEventListener('change', (event) => {
    const metricSelect = event.target.closest('[data-vital-range-metric]');
    if (!metricSelect) return;
    const metric = vitalReferenceMetrics.find((item) => item.key === metricSelect.value);
    metricSelect.closest('[data-vital-range-row]').querySelector('[data-vital-range-unit]').textContent = metric?.unit || '';
  });

  document.getElementById('apiConnectButton')?.addEventListener('click', connectToApi);
  document.getElementById('doctorApiConnectButton')?.addEventListener('click', connectToApi);
  const disconnectFromApi = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }, true).catch(() => {});
    clearApiSession();
    data = loadData();
    renderAll();
    showToast('Disconnected from the live API and returned to local demo mode.');
  };
  document.getElementById('apiDisconnectButton')?.addEventListener('click', disconnectFromApi);
  document.getElementById('doctorApiDisconnectButton')?.addEventListener('click', disconnectFromApi);

  document.getElementById('addInvoiceItem').addEventListener('click', () => addInvoiceLine());
  document.querySelector('#invoiceForm [name="paid"]').addEventListener('input', calculateInvoice);
  document.getElementById('patientSearch').addEventListener('input', () => { patientDirectoryPage = 1; renderPatients(); });
  document.getElementById('exportPatientDirectory')?.addEventListener('click', exportPatientDirectory);
  ['patientGenderFilter', 'patientBloodFilter', 'patientTypeFilter', 'patientStatusFilter', 'patientSort'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => { patientDirectoryPage = 1; renderPatients(); });
  });
  document.getElementById('clearPatientFilters')?.addEventListener('click', () => {
    document.getElementById('patientSearch').value = '';
    document.getElementById('patientGenderFilter').value = '';
    document.getElementById('patientBloodFilter').value = '';
    document.getElementById('patientTypeFilter').value = '';
    document.getElementById('patientStatusFilter').value = '';
    document.getElementById('patientSort').value = 'recent';
    patientDirectoryPage = 1;
    renderPatients();
  });
  document.getElementById('patientPrevPage')?.addEventListener('click', () => { if (patientDirectoryPage > 1) { patientDirectoryPage -= 1; renderPatients(); } });
  document.getElementById('patientNextPage')?.addEventListener('click', () => { patientDirectoryPage += 1; renderPatients(); });
  document.getElementById('closePatientPreview')?.addEventListener('click', () => document.getElementById('patientPreviewDrawer').classList.add('hidden'));
  document.getElementById('patientForm').addEventListener('input', (event) => {
    if (['firstName', 'phone'].includes(event.target.name)) {
      event.target.dataset.touched = 'true';
      updatePatientIdentityValidity(event.currentTarget);
    }
    if (['firstName', 'lastName', 'phone', 'dob'].includes(event.target.name)) {
      updatePatientDuplicateWarning();
      updatePatientRegistrationPreview();
    }
  });
  document.getElementById('patientForm').addEventListener('change', (event) => {
    if (['firstName', 'phone'].includes(event.target.name)) {
      event.target.dataset.touched = 'true';
      updatePatientIdentityValidity(event.currentTarget);
    }
    if (['firstName', 'lastName', 'phone', 'dob'].includes(event.target.name)) updatePatientDuplicateWarning();
    if (event.target.name === 'dob') updatePatientRegistrationPreview();
  });
  document.getElementById('patientPhotoFile').addEventListener('change', async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      document.getElementById('patientPhotoCaption').textContent = 'Optimizing photo…';
      document.getElementById('patientForm').elements.namedItem('profilePhotoDataUrl').value =
        await optimizePatientPhoto(file);
      updatePatientRegistrationPreview();
    } catch (error) {
      event.currentTarget.value = '';
      showToast(error.message || 'Unable to process the selected photo.');
      updatePatientRegistrationPreview();
    }
  });
  document.getElementById('removePatientPhoto').addEventListener('click', () => {
    document.getElementById('patientForm').elements.namedItem('profilePhotoDataUrl').value = '';
    document.getElementById('patientPhotoFile').value = '';
    updatePatientRegistrationPreview();
  });
  document.getElementById('savePatientDraft').addEventListener('click', savePatientDraft);
  ['patientHistorySearch', 'patientHistoryFrom', 'patientHistoryTo', 'patientHistoryDoctor', 'patientHistoryType', 'patientHistoryStatus', 'patientHistoryContent'].forEach((id) => {
    document.getElementById(id).addEventListener(id === 'patientHistorySearch' ? 'input' : 'change', () => {
      const patientId = activePatientRecordsId;
      if (patientId) renderPatientRecords(patientId);
    });
  });
  document.getElementById('appointmentSearch').addEventListener('input', renderAppointments);
  document.getElementById('doctorQueueSearch').addEventListener('input', renderDoctorWorkspace);
  document.getElementById('nurseIntakeForm').addEventListener('input', updateNurseIntakeBmi);
  document.getElementById('nurseIntakeForm').addEventListener('change', updateNurseIntakeBmi);
  document.querySelector('#patientEncounterForm [name="encounterType"]').addEventListener('change', (event) => {
    document.getElementById('patientEncounterAdmissionFields').classList.toggle('hidden', event.currentTarget.value !== 'IPD');
  });
  document.getElementById('nurseIntakeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const intent = event.submitter?.value === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';
    const buttons = [...form.querySelectorAll('button[type="submit"]')];
    buttons.forEach((button) => { button.disabled = true; });
    try {
      await submitNurseIntake(form, intent);
    } catch (error) {
      console.error('Unable to save nurse intake.', error);
      showToast(error.message || 'Unable to save nurse intake.');
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  });
  document.getElementById('patientEncounterForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await savePatientEncounter(form);
    } catch (error) {
      console.error('Unable to save patient visit.', error);
      showToast(error.message || 'Unable to save patient visit.');
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('medicineSearch').addEventListener('input', renderMedicines);
  document.getElementById('medicineStockFilter').addEventListener('change', renderMedicines);
  document.getElementById('consumableSearch').addEventListener('input', renderConsumables);
  document.getElementById('consumableCategoryFilter')?.addEventListener('change', renderConsumables);
  document.getElementById('consumableStockFilter')?.addEventListener('change', renderConsumables);
  document.getElementById('openConsumableModal').addEventListener('click', () => {
    openConsumableEditor();
  });
  function openConsumableEditor(id = '') {
    const form = document.getElementById('consumableForm');
    const item = data.consumables.find((entry) => entry.id === id);
    form.reset();
    form.elements.namedItem('id').value = item?.id || '';
    form.elements.namedItem('name').value = item?.name || '';
    form.elements.namedItem('category').value = item?.category || '';
    form.elements.namedItem('brand').value = item?.brand || '';
    form.elements.namedItem('manufacturer').value = item?.manufacturer || '';
    form.elements.namedItem('unit').value = item?.unit || 'unit';
    form.elements.namedItem('batch').value = item?.batch || '';
    form.elements.namedItem('expiry').value = item?.expiry || '';
    form.elements.namedItem('quantity').value = String(item?.quantity ?? 0);
    form.elements.namedItem('quantity').disabled = Boolean(item);
    form.elements.namedItem('reorder').value = String(item?.reorder ?? 10);
    form.elements.namedItem('cost').value = String(item?.cost ?? 0);
    form.elements.namedItem('price').value = String(item?.price ?? 0);
    form.elements.namedItem('supplier').value = item?.supplier || '';
    form.elements.namedItem('storage').value = item?.storage || '';
    document.getElementById('consumableModalTitle').textContent = item ? 'Edit clinical supply' : 'Add clinical supply';
    form.querySelector('button[type="submit"]').textContent = item ? 'Save changes' : 'Save supply';
    openModal('consumableModal');
  }
  function openConsumableUseEditor(consumableId) {
    const item = data.consumables.find((entry) => entry.id === consumableId);
    if (!item) return;
    const form = document.getElementById('consumableUseForm');
    form.reset();
    form.elements.namedItem('consumableId').value = item.id;
    form.elements.namedItem('quantity').value = '1';
    form.elements.namedItem('quantity').max = String(item.quantity);
    form.elements.namedItem('date').value = dateKey(today);
    const patientSelect = form.elements.namedItem('patientId');
    patientSelect.innerHTML = '<option value="">Select patient</option>' + data.patients
      .slice().sort((left, right) => left.name.localeCompare(right.name))
      .map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(patient.name)} · ${escapeHtml(patient.code)}</option>`).join('');
    document.getElementById('consumableUseTitle').textContent = `Use ${item.name}`;
    openModal('consumableUseModal');
  }
  document.getElementById('consumableForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const id = String(fields.get('id') || '');
    const current = data.consumables.find((entry) => entry.id === id);
    const name = String(fields.get('name') || '').trim();
    const category = String(fields.get('category') || '').trim();
    if (!name || !category) {
      showToast('Enter a supply name and category.');
      return;
    }
    const input = {
      name,
      category,
      brand: String(fields.get('brand') || '').trim(),
      manufacturer: String(fields.get('manufacturer') || '').trim(),
      unit: String(fields.get('unit') || 'unit').trim() || 'unit',
      batch: String(fields.get('batch') || '').trim(),
      expiry: String(fields.get('expiry') || ''),
      quantity: current ? current.quantity : Number(fields.get('quantity') || 0),
      reorder: Number(fields.get('reorder') || 0),
      cost: Number(fields.get('cost') || 0),
      price: Number(fields.get('price') || 0),
      supplier: String(fields.get('supplier') || '').trim(),
      storage: String(fields.get('storage') || '').trim(),
    };
    if (isApiConnected()) {
      try {
        const apiInput = {
          name: input.name,
          category: input.category,
          brand: input.brand,
          manufacturer: input.manufacturer,
          unit: input.unit,
          batchNumber: input.batch,
          ...(input.expiry ? { expiresAt: input.expiry } : {}),
          reorderLevel: input.reorder,
          purchasePrice: input.cost,
          sellingPrice: input.price,
          supplier: input.supplier,
          storageInstructions: input.storage,
          ...(!current ? { quantity: input.quantity } : {}),
        };
        await apiRequest(`/consumables${current ? `/${encodeURIComponent(id)}` : ''}`, {
          method: current ? 'PATCH' : 'POST',
          body: JSON.stringify(apiInput),
        });
        const refreshed = await hydrateFromApi();
        if (!refreshed) throw new Error('Supply saved, but inventory could not be refreshed.');
        renderAll();
      } catch (error) {
        console.error('Unable to save clinical supply.', error);
        showToast(error.message || 'Unable to save clinical supply.');
        return;
      }
    } else if (current) {
      Object.assign(current, input);
      save();
      renderAll();
    } else {
      const item = { id: makeId('consumable'), ...input };
      data.consumables.push(item);
      if (item.quantity > 0) {
        data.inventoryMovements.push({
          kind: 'consumable',
          itemId: item.id,
          type: 'RECEIVED',
          quantityDelta: item.quantity,
          quantityBefore: 0,
          quantityAfter: item.quantity,
          reason: 'Opening stock',
          createdAt: new Date().toISOString(),
        });
      }
      save();
      renderAll();
    }
    save();
    closeModal(document.getElementById('consumableModal'));
    showToast(current ? 'Clinical supply updated.' : 'Clinical supply added to inventory.');
  });
  document.getElementById('consumableUseForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const consumableId = String(fields.get('consumableId') || '');
    const patientId = String(fields.get('patientId') || '');
    const quantity = Number(fields.get('quantity') || 0);
    const date = String(fields.get('date') || dateKey(today));
    const reason = String(fields.get('reason') || '').trim() || 'Used for patient care';
    const billToPatient = fields.get('billToPatient') === 'on';
    const item = data.consumables.find((entry) => entry.id === consumableId);
    const patient = patientById(patientId);
    if (!item || !patient) {
      showToast('Select a supply and patient.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(item.quantity)) {
      showToast(`Enter a whole number between 1 and ${Number(item.quantity)}.`);
      return;
    }
    if (isApiConnected()) {
      try {
        if (billToPatient) {
          await apiRequest('/billing/invoices', {
            method: 'POST',
            body: JSON.stringify({
              patientId,
              invoiceDate: date,
              template: 'PROFESSIONAL',
              discount: 0,
              taxRate: 0,
              notes: reason,
              items: [{ consumableId, quantity }],
            }),
          });
        } else {
          await apiRequest(`/consumables/${encodeURIComponent(consumableId)}/stock`, {
            method: 'POST',
            body: JSON.stringify({
              operation: 'DISPENSED',
              quantity,
              reason,
              patientId,
            }),
          });
        }
        await refreshLiveData();
        renderAll();
        closeModal(document.getElementById('consumableUseModal'));
        showToast(billToPatient ? `${item.name} usage recorded and added to the patient invoice.` : `${item.name} usage recorded for ${patient.name}.`);
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Unable to record consumable usage.');
      }
      return;
    }
    const quantityBefore = Number(item.quantity);
    item.quantity = quantityBefore - quantity;
    data.inventoryMovements.push({
      kind: 'consumable',
      itemId: item.id,
      patientId,
      type: 'DISPENSED',
      quantityDelta: -quantity,
      quantityBefore,
      quantityAfter: item.quantity,
      reason,
      createdAt: new Date(`${date}T12:00:00`).toISOString(),
    });
    if (billToPatient) {
      const invoiceNumber = nextInvoiceNumber();
      const amount = quantity * Number(item.price || 0);
      data.invoices.push({
        id: makeId('invoice'),
        number: invoiceNumber,
        patientId,
        encounterId: null,
        date,
        items: [{ consumableId: item.id, name: item.name, quantity, price: Number(item.price || 0), amount }],
        subtotal: amount,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: amount,
        paid: 0,
        template: 'professional',
        paymentMethod: 'Cash',
        payments: [],
        notes: reason,
        createdAt: new Date(`${date}T12:00:00`).toISOString(),
      });
    }
    save();
    renderAll();
    closeModal(document.getElementById('consumableUseModal'));
    showToast(billToPatient ? `${item.name} usage recorded and added to the patient invoice.` : `${item.name} usage recorded for ${patient.name}.`);
  });
  document.getElementById('invoiceSearch').addEventListener('input', renderInvoices);
  ['reportFrom', 'reportTo'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      document.querySelectorAll('[data-report-period]').forEach((button) => button.classList.remove('active'));
      renderReports();
    });
  });
  document.getElementById('reportTypeFilter')?.addEventListener('change', renderReports);
  document.getElementById('reportClearFilters')?.addEventListener('click', () => {
    document.getElementById('reportFrom').value = '';
    document.getElementById('reportTo').value = '';
    document.getElementById('reportTypeFilter').value = 'all';
    document.querySelectorAll('[data-report-period]').forEach((button) => button.classList.toggle('active', button.dataset.reportPeriod === 'all'));
    renderReports();
  });
  document.querySelectorAll('[data-report-period]').forEach((button) => {
    button.addEventListener('click', () => {
      const period = button.dataset.reportPeriod;
      document.querySelectorAll('[data-report-period]').forEach((item) => item.classList.toggle('active', item === button));
      if (period === 'all') {
        document.getElementById('reportFrom').value = '';
        document.getElementById('reportTo').value = '';
      } else {
        const end = dateKey(today);
        const start = period === 'today' ? end : (() => {
          const date = new Date(today);
          date.setDate(date.getDate() - (Number(period) - 1));
          return dateKey(date);
        })();
        document.getElementById('reportFrom').value = start;
        document.getElementById('reportTo').value = end;
      }
      renderReports();
    });
  });
  document.getElementById('reportExport')?.addEventListener('click', exportClinicReport);
  document.getElementById('consultationDocumentFiles')?.addEventListener('change', (event) => {
    void uploadConsultationDocuments(event.currentTarget);
  });
  document.querySelectorAll('[data-consultation-document-source]').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest('details').open = false;
      if (button.dataset.consultationDocumentSource === 'camera') {
        void openConsultationCamera();
      } else {
        document.getElementById('consultationDocumentFiles').click();
      }
    });
  });
  document.getElementById('consultationCameraCapture')?.addEventListener('click', () => {
    void captureConsultationPhoto().catch((error) => {
      console.error('Unable to capture consultation photo.', error);
      const errorMessage = document.getElementById('consultationCameraError');
      errorMessage.textContent = error.message || 'The photo could not be captured.';
      errorMessage.classList.remove('hidden');
    });
  });
  const consultationPrescriptionForm = document.getElementById('consultationPrescriptionForm');
  consultationPrescriptionForm.addEventListener('input', () => {
    consultationPrescriptionHasChanges = true;
  });
  consultationPrescriptionForm.addEventListener('change', (event) => {
    if (event.target.id !== 'prescriptionOutputLanguage') consultationPrescriptionHasChanges = true;
  });
  consultationPrescriptionForm.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.matches('[data-cancel-consultation], [data-consultation-tab], [data-consultation-main-tab]')) return;
    consultationPrescriptionHasChanges = true;
  });
  consultationPrescriptionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const shouldPrint = event.submitter?.value === 'save-and-print';
    if (!canWriteConsultationPrescriptions()) {
      showToast('Your account does not have permission to write prescriptions.');
      return;
    }
    const patientId = String(form.elements.namedItem('patientId').value || '');
    const consultationId = String(form.elements.namedItem('consultationId').value || '');
    const submitButtons = [...form.querySelectorAll('button[type="submit"]')];
    submitButtons.forEach((button) => { button.disabled = true; });
    try {
      const payload = buildConsultationPrescriptionPayload(form);
      if (!payload.visitDate || !payload.doctorName.trim()) {
        throw new Error('Enter the consultation date and doctor name in the Clinical section.');
      }
      let savedPrescription;
      if (isApiConnected()) {
        const endpoint = consultationId
          ? `/consultations/${encodeURIComponent(consultationId)}/prescriptions`
          : `/patients/${encodeURIComponent(patientId)}/consultations`;
        savedPrescription = await apiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        savedPrescription = saveLocalConsultationPrescription(patientId, payload);
      }
      consultationPrescriptionHasChanges = false;
      closeModal(document.getElementById('consultationPrescriptionModal'));
      await openPatientRecords(patientId);
      const savedEncounterId = savedPrescription?.encounterId || consultationId || payload.encounterId;
      const savedRecord = getPatientRecords(patientId).find((record) => record.id === savedEncounterId);
      const savedVersion = savedRecord?.prescriptionVersions?.find((version) => version.id === savedPrescription?.id)
        || savedRecord?.prescriptionVersions?.[0];
      showToast(consultationId
        ? 'Prescription revision saved. Previous versions remain in the history.'
        : 'Consultation and prescription saved.');
      if (shouldPrint && savedRecord && savedVersion) {
        openPrescriptionPrint(patientId, savedRecord.id, savedVersion.id, true);
      }
    } catch (error) {
      console.error('Unable to save consultation prescription.', error);
      showToast(error.message || 'Unable to save consultation prescription.');
    } finally {
      submitButtons.forEach((button) => { button.disabled = false; });
    }
  });
  const prescriptionOutputLanguage = document.getElementById('prescriptionOutputLanguage');
  prescriptionOutputLanguage.value = getPrescriptionOutputLanguage();
  prescriptionOutputLanguage.addEventListener('change', () => {
    localStorage.setItem('cskClinicPrescriptionLanguage', prescriptionOutputLanguage.value);
  });
  document.getElementById('globalSearch').addEventListener('input', (event) => {
    renderGlobalSearchResults(event.currentTarget.value);
  });
  document.getElementById('globalSearch').addEventListener('keydown', (event) => {
    const results = [...document.querySelectorAll('#globalSearchResults [data-global-search-result]')];
    const selectedIndex = results.findIndex((result) => result.getAttribute('aria-selected') === 'true');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!results.length) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (selectedIndex + direction + results.length) % results.length;
      results.forEach((result, index) => result.setAttribute('aria-selected', String(index === nextIndex)));
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      selectGlobalSearchResult(results[selectedIndex >= 0 ? selectedIndex : 0]);
    } else if (event.key === 'Escape') {
      closeGlobalSearchResults();
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('globalSearch').focus(); }
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((modal) => {
        if (modal.id === 'consultationPrescriptionModal') requestCloseConsultationPrescription();
        else closeModal(modal);
      });
    }
  });
  document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();

  function initializeDisplayOptions() {
    const decreaseFontSize = document.getElementById('decreaseFontSize');
    const increaseFontSize = document.getElementById('increaseFontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const storedScale = localStorage.getItem(UI_FONT_SCALE_KEY);
    const storedScaleNumber = Number(storedScale);
    let fontScale = Number.isFinite(storedScaleNumber) && storedScaleNumber >= 0.1 && storedScaleNumber <= 2
      ? Math.round(storedScaleNumber * 10) / 10
      : 1;
    const applyFontSize = (persist) => {
      document.documentElement.style.setProperty('--app-font-scale', fontScale.toFixed(1));
      fontSizeValue.textContent = `${Math.round(fontScale * 100)}%`;
      decreaseFontSize.disabled = fontScale <= 0.1;
      increaseFontSize.disabled = fontScale >= 2;
      if (persist) localStorage.setItem(UI_FONT_SCALE_KEY, fontScale.toFixed(1));
    };
    decreaseFontSize.addEventListener('click', () => {
      if (fontScale > 0.1) {
        fontScale = Math.max(0.1, Math.round((fontScale - 0.1) * 10) / 10);
        applyFontSize(true);
      }
    });
    increaseFontSize.addEventListener('click', () => {
      if (fontScale < 2) {
        fontScale = Math.min(2, Math.round((fontScale + 0.1) * 10) / 10);
        applyFontSize(true);
      }
    });
    applyFontSize(false);

    const fullscreenToggle = document.getElementById('fullscreenToggle');
    const updateFullscreenToggle = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      const label = isFullscreen ? 'Exit full screen' : 'Enter full screen';
      fullscreenToggle.setAttribute('aria-label', label);
      fullscreenToggle.setAttribute('title', label);
      fullscreenToggle.setAttribute('aria-pressed', String(isFullscreen));
    };
    document.addEventListener('fullscreenchange', updateFullscreenToggle);
    fullscreenToggle.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          showToast('Full screen is not supported by this browser.');
        }
      } catch (error) {
        showToast(`Could not change full screen: ${error.message || 'Please try again.'}`);
      }
    });
    updateFullscreenToggle();
  }

  async function initializeApp() {
    initializeDisplayOptions();
    const homeSection = WORKSPACE_MODE === 'doctor' ? 'doctor'
      : WORKSPACE_MODE === 'front-office' ? 'patients' : 'overview';
    document.querySelector('.brand').setAttribute('href', `#${homeSection}`);
    if (getStoredApiToken()) {
      await hydrateFromApi();
    }
    renderAll();
    if (WORKSPACE_MODE !== 'front-office') {
      startDoctorQueuePolling();
      void refreshDoctorRealtimeConfiguration();
    }
    bindAppointmentPatientSearch();
    const defaultSection = WORKSPACE_MODE === 'front-office' ? 'patients'
      : WORKSPACE_MODE === 'doctor' ? 'doctor' : '';
    const initialSection = window.location.hash.slice(1) || defaultSection;
    if (document.getElementById(initialSection)?.classList.contains('view')) showView(initialSection);
  }

  void initializeApp();
})();
