(() => {
  'use strict';

  const STORAGE_KEY = 'csk-clinic-management-v1';
  const API_BASE_URL = window.CSK_CLINIC_API_BASE_URL || 'http://localhost:3001/api';
  const API_TOKEN_KEY = 'csk-clinic-api-token';
  const API_USER_KEY = 'csk-clinic-api-user';
  const DEMO_DATA_VERSION = 1;
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
    patients: [
      { id: 'patient-demo-1', code: 'CSK-2048', name: 'Aisha Nair', phone: '98765 43210', dob: '1992-06-18', gender: 'Female', email: 'aisha@example.com', bloodGroup: 'O+', address: 'Chennai', notes: '', allergies: '', medicalHistory: 'Hypertension follow-up', emergencyContact: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-2', code: 'CSK-3191', name: 'Rohan Mehta', phone: '98450 11223', dob: '1984-03-07', gender: 'Male', email: '', bloodGroup: 'B+', address: '', notes: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-3', code: 'CSK-1880', name: 'Pooja Iyer', phone: '99001 22334', dob: '1997-11-24', gender: 'Female', email: '', bloodGroup: 'A+', address: '', notes: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-4', code: 'CSK-4204', name: 'Maya Krishnan', phone: '9000000044', dob: '1981-08-03', gender: 'Female', email: 'maya.demo@example.test', bloodGroup: 'A-', address: 'Salem', notes: 'Demo patient record', allergies: 'No known drug allergies', medicalHistory: 'Type 2 diabetes follow-up', emergencyContact: 'Demo contact · 9000000045', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-5', code: 'CSK-4205', name: 'Arjun Das', phone: '9000000046', dob: '1994-02-16', gender: 'Male', email: 'arjun.demo@example.test', bloodGroup: 'B+', address: 'Attur', notes: 'Demo patient record', allergies: 'Seasonal pollen allergy', medicalHistory: 'Mild asthma', emergencyContact: '', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-6', code: 'CSK-4206', name: 'Leela Subramaniam', phone: '9000000047', dob: '1957-12-09', gender: 'Female', email: '', bloodGroup: 'O-', address: 'Thammampatti', notes: 'Demo patient record', allergies: '', medicalHistory: 'Hypertension and osteoarthritis', emergencyContact: 'Demo contact · 9000000048', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'patient-demo-7', code: 'CSK-4207', name: 'Naveen Kumar', phone: '9000000049', dob: '2008-05-22', gender: 'Male', email: '', bloodGroup: 'AB+', address: 'Veethi', notes: 'Demo patient record', allergies: '', medicalHistory: 'No known chronic conditions', emergencyContact: 'Demo guardian · 9000000050', status: 'Active', createdAt: new Date().toISOString() }
    ],
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
    consumableCategories: ['PPE', 'Injection supplies', 'Dressings'],
    inventoryMovements: [
      { id: 'movement-demo-med-1', kind: 'medicine', itemId: 'medicine-demo-4', type: 'RECEIVED', quantityDelta: 84, quantityBefore: 0, quantityAfter: 84, reason: 'Opening demo stock', createdAt: `${shiftDate(-20)}T09:00:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-med-2', kind: 'medicine', itemId: 'medicine-demo-4', type: 'DISPENSED', quantityDelta: -6, quantityBefore: 90, quantityAfter: 84, reason: 'Demo dispensing record', createdAt: `${shiftDate(-5)}T16:30:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-supply-1', kind: 'consumable', itemId: 'supply-demo-1', type: 'RECEIVED', quantityDelta: 160, quantityBefore: 0, quantityAfter: 160, reason: 'Opening demo stock', createdAt: `${shiftDate(-18)}T09:15:00`, recordedBy: 'Demo inventory user' },
      { id: 'movement-demo-supply-2', kind: 'consumable', itemId: 'supply-demo-1', type: 'DISPENSED', quantityDelta: -12, quantityBefore: 172, quantityAfter: 160, reason: 'Demo clinic usage', createdAt: `${shiftDate(-3)}T17:20:00`, recordedBy: 'Demo inventory user' },
    ],
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
    ],
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
      currency: 'INR'
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
      return {
        ...defaults,
        ...parsed,
        demoDataVersion: DEMO_DATA_VERSION,
        patients: records('patients'),
        medicines: records('medicines'),
        consumables: records('consumables'),
        consumableCategories: [...new Set([
          ...(Array.isArray(parsed.consumableCategories) ? parsed.consumableCategories : []),
          ...(needsDemoSeed ? defaults.consumableCategories : []),
        ])],
        inventoryMovements: records('inventoryMovements'),
        appointments: records('appointments'),
        queueTokens: Array.isArray(parsed.queueTokens) ? parsed.queueTokens : [],
        invoices: records('invoices'),
        patientDrafts: Array.isArray(parsed.patientDrafts) ? parsed.patientDrafts : [],
        patientRecords: records('patientRecords'),
        patientIntakes: records('patientIntakes'),
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
  let activePatientProfileTab = 'overview';
  let activePatientProfileId = '';
  let activePatientRecordsId = '';
  let patientDirectoryPage = 1;
  let activeTimelineFilter = 'all';
  let activeTimelineFrom = '';
  let activeTimelineTo = '';
  const patientDirectoryPageSize = 10;
  const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: data.settings.currency || 'INR', maximumFractionDigits: 2 }).format(Number(amount) || 0);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const initials = (name) => String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();

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
      return;
    }
    localStorage.setItem(API_TOKEN_KEY, token);
    localStorage.setItem(API_USER_KEY, JSON.stringify(user || null));
  }

  function clearApiSession() {
    storeApiSession('', null);
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
    return {
      id: item.id,
      code: item.patientCode || '',
      name: item.fullName || 'Unknown patient',
      phone: item.mobile || '',
      dob: item.dateOfBirth ? String(item.dateOfBirth).slice(0, 10) : '',
      gender: item.gender ? String(item.gender).replace(/_/g, ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase()) : 'Unspecified',
      email: item.email || '',
      bloodGroup: item.bloodGroup || '',
      address: item.address || '',
      emergencyContact: item.emergencyContact || '',
      occupation: item.occupation || '',
      maritalStatus: item.maritalStatus || '',
      preferredLanguage: item.preferredLanguage || '',
      insuranceProvider: item.insuranceProvider || '',
      insuranceNumber: item.insuranceNumber || '',
      notes: item.allergies || '',
      allergies: item.allergies || '',
      medicalHistory: item.medicalHistory || '',
      surgicalHistory: item.surgicalHistory || '',
      familyHistory: item.familyHistory || '',
      currentMedications: item.currentMedications || '',
      status: item.status === 'INACTIVE' ? 'Inactive' : 'Active',
      createdAt: item.createdAt || new Date().toISOString(),
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
      emergencyContact: payload.emergencyContact || '',
      occupation: payload.occupation || '',
      maritalStatus: payload.maritalStatus || '',
      preferredLanguage: payload.preferredLanguage || '',
      insuranceProvider: payload.insuranceProvider || '',
      insuranceNumber: payload.insuranceNumber || '',
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
        prescriptionItemId: line.prescriptionItemId || null,
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
      createdAt: item.createdAt || new Date().toISOString(),
      template: String(item.template || 'professional').toLowerCase(),
      notes: item.notes || '',
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
      const inventoryReaderRoles = ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PHARMACIST', 'ACCOUNTANT'];
      const canReadConsumables = inventoryReaderRoles.includes(getStoredApiUser()?.role);
      const consumablesRequest = canReadConsumables
        ? Promise.all([apiListAll('/consumables?active=true'), apiRequest('/consumables/categories')])
        : Promise.resolve([[], []]);
      const [patientsResult, medicinesResult, appointmentsResult, invoicesResult, settingsResult, draftsResult, consumableResults] = await Promise.all([
        apiListAll('/patients'),
        apiListAll('/medicines?active=true'),
        apiListAll('/appointments'),
        apiListAll('/billing/invoices'),
        apiRequest('/clinic/settings'),
        draftRequest,
        consumablesRequest,
      ]);

      const nextPatients = patientsResult.map(normalizeApiPatient);
      const nextMedicines = medicinesResult.map(normalizeApiMedicine);
      const [consumablesResult, categoriesResult] = consumableResults;
      const nextAppointments = appointmentsResult.map(normalizeApiAppointment);
      const nextInvoices = invoicesResult.map(normalizeApiInvoice);
      data = {
        ...initialData(),
        patients: nextPatients,
        patientDrafts: Array.isArray(draftsResult) ? draftsResult.map(normalizeApiPatientDraft) : [],
        medicines: nextMedicines,
        consumables: consumablesResult.map(normalizeApiConsumable),
        consumableCategories: categoriesResult.map((category) => category.name),
        appointments: nextAppointments,
        patientRecords: [],
        patientIntakes: [],
        externalMedicalRecords: [],
        queueTokens: [],
        invoices: nextInvoices,
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
        },
      };
      save();
      return true;
    } catch (error) {
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

  function apiPatientPayload(fields) {
    const genderValue = String(fields.get('gender') || 'Unspecified').toUpperCase();
    const email = String(fields.get('email') || '').trim();
    return {
      fullName: String(fields.get('name') || '').trim(),
      mobile: String(fields.get('phone') || '').trim(),
      dateOfBirth: fields.get('dob') ? String(fields.get('dob')) : null,
      gender: ['FEMALE', 'MALE', 'OTHER'].includes(genderValue) ? genderValue : 'UNSPECIFIED',
      email: email || null,
      bloodGroup: String(fields.get('bloodGroup') || '').trim(),
      address: String(fields.get('address') || '').trim(),
      allergies: String(fields.get('notes') || '').trim(),
      emergencyContact: String(fields.get('emergencyContact') || '').trim(),
      occupation: String(fields.get('occupation') || '').trim(),
      maritalStatus: String(fields.get('maritalStatus') || '').trim(),
      preferredLanguage: String(fields.get('preferredLanguage') || '').trim(),
      insuranceProvider: String(fields.get('insuranceProvider') || '').trim(),
      insuranceNumber: String(fields.get('insuranceNumber') || '').trim(),
      medicalHistory: String(fields.get('medicalHistory') || '').trim(),
      surgicalHistory: String(fields.get('surgicalHistory') || '').trim(),
      familyHistory: String(fields.get('familyHistory') || '').trim(),
      currentMedications: String(fields.get('currentMedications') || '').trim(),
    };
  }

  function apiPatientDraftPayload(fields) {
    const genderValue = String(fields.get('gender') || '').toUpperCase();
    const values = {
      fullName: String(fields.get('name') || '').trim(),
      mobile: String(fields.get('phone') || '').trim(),
      dateOfBirth: String(fields.get('dob') || ''),
      gender: ['FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'].includes(genderValue) ? genderValue : '',
      email: String(fields.get('email') || '').trim(),
      bloodGroup: String(fields.get('bloodGroup') || '').trim(),
      address: String(fields.get('address') || '').trim(),
      emergencyContact: String(fields.get('emergencyContact') || '').trim(),
      occupation: String(fields.get('occupation') || '').trim(),
      maritalStatus: String(fields.get('maritalStatus') || '').trim(),
      preferredLanguage: String(fields.get('preferredLanguage') || '').trim(),
      insuranceProvider: String(fields.get('insuranceProvider') || '').trim(),
      insuranceNumber: String(fields.get('insuranceNumber') || '').trim(),
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
    if (!label || !connect || !disconnect) return;
    const hasToken = !!getStoredApiToken();
    label.textContent = hasToken ? 'Connected to live clinic API' : 'Local demo mode';
    connect.classList.toggle('hidden', hasToken);
    disconnect.classList.toggle('hidden', !hasToken);
    document.getElementById('dashboardStorageCaption').textContent = hasToken
      ? 'Clinic records are loaded from the connected clinic API.'
      : 'Clinic records are stored in this browser on this device. This demo is not connected to the clinic API.';
    document.getElementById('reportsSourceCaption').textContent = hasToken
      ? 'Detailed analysis based on records from the connected clinic API.'
      : 'Detailed analysis based on clinic records stored in this browser.';
  }

  async function connectToApi() {
    const email = window.prompt('Clinic admin email', window.CSK_CLINIC_DEMO_EMAIL || 'admin@cskclinic.local') || '';
    const password = window.prompt('Clinic admin password', '') || '';
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
  function save() {
    try {
      const savedData = { ...data };
      if (isApiConnected()) {
        savedData.patientRecords = [];
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

  function closeModal(modal) {
    modal.classList.add('hidden');
    if (!document.querySelector('.modal-backdrop:not(.hidden)')) document.body.style.overflow = '';
  }
  function showView(id) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('view')) return;
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view === target));
    document.querySelectorAll('.nav-link[data-section]').forEach((link) => link.classList.toggle('active', link.dataset.section === id));
    document.getElementById('pageBreadcrumb').textContent = id[0].toUpperCase() + id.slice(1);
    document.getElementById('sidebar').classList.remove('open');
    history.replaceState(null, '', `#${id}`);
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
    const paidCount = data.invoices.filter((invoice) => Number(invoice.paid) >= Number(invoice.total)).length;
    const due = data.invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paid)), 0);
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

  function renderPatients() {
    const query = (document.getElementById('patientSearch')?.value || '').trim().toLowerCase();
    const phoneQuery = patientPhoneKey(query);
    const gender = document.getElementById('patientGenderFilter')?.value || '';
    const bloodGroup = document.getElementById('patientBloodFilter')?.value || '';
    const patientType = document.getElementById('patientTypeFilter')?.value || '';
    const sort = document.getElementById('patientSort')?.value || 'recent';
    const currentMonth = dateKey(today).slice(0, 7);
    const returningCount = data.patients.filter((patient) => getPatientRecords(patient.id).length > 0).length;
    const followupCount = data.patients.filter((patient) => getPatientRecords(patient.id).some((record) => record.followUpDate && record.followUpDate >= dateKey(today))).length;
    const showRecordsAction = canViewClinicalRecords();
    const canManage = canManagePatientData();
    let rows = data.patients.filter((patient) => {
      const records = getPatientRecords(patient.id);
      const appointments = data.appointments.filter((item) => item.patientId === patient.id);
      const textMatch = [patient.name, patient.code, patient.phone, patient.email].some((value) => String(value || '').toLowerCase().includes(query));
      const phoneMatch = phoneQuery.length >= 3 && patientPhoneKey(patient.phone).includes(phoneQuery);
      if (query && !textMatch && !phoneMatch) return false;
      if (gender && String(patient.gender || 'Unspecified') !== gender) return false;
      if (bloodGroup && patient.bloodGroup !== bloodGroup) return false;
      if (patientType === 'new' && (patient.createdAt || '').slice(0, 7) !== currentMonth) return false;
      if (patientType === 'returning' && records.length === 0) return false;
      if (patientType === 'followup' && !records.some((record) => record.followUpDate && record.followUpDate >= dateKey(today))) return false;
      if (patientType === 'appointment' && !appointments.some((item) => item.status !== 'Cancelled')) return false;
      return true;
    });
    rows.sort((left, right) => {
      if (sort === 'name') return String(left.name).localeCompare(String(right.name));
      if (sort === 'code') return String(left.code).localeCompare(String(right.code), undefined, { numeric: true });
      if (sort === 'lastVisit') {
        const leftVisit = getPatientRecords(left.id)[0]?.visitDate || '';
        const rightVisit = getPatientRecords(right.id)[0]?.visitDate || '';
        return rightVisit.localeCompare(leftVisit);
      }
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    });
    const totalPages = Math.max(1, Math.ceil(rows.length / patientDirectoryPageSize));
    patientDirectoryPage = Math.min(patientDirectoryPage, totalPages);
    const pageStart = (patientDirectoryPage - 1) * patientDirectoryPageSize;
    const pagedRows = rows.slice(pageStart, pageStart + patientDirectoryPageSize);
    document.getElementById('patientResultCount').textContent = `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`;
    document.getElementById('patientPageTotal').textContent = data.patients.length;
    document.getElementById('patientMonthTotal').textContent = data.patients.filter((patient) => (patient.createdAt || '').slice(0, 7) === currentMonth).length;
    document.getElementById('patientReturningTotal').textContent = returningCount;
    document.getElementById('patientFollowupTotal').textContent = followupCount;
    document.getElementById('patientsEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('patientsTable').innerHTML = pagedRows.map((patient) => {
      const records = getPatientRecords(patient.id);
      const lastVisit = records[0]?.visitDate;
      return `<tr><td><button type="button" class="patient-cell patient-preview-trigger" data-preview-patient="${escapeHtml(patient.id)}"><span class="patient-avatar">${escapeHtml(initials(patient.name))}</span><span><b>${escapeHtml(patient.name)}</b><small>${escapeHtml(patient.email || 'Email not provided')}</small></span></button></td><td><b>${escapeHtml(patient.code)}</b></td><td>${escapeHtml(patient.phone)}</td><td>${escapeHtml(patientAge(patient))} / ${escapeHtml(patient.gender || '—')}</td><td>${escapeHtml(patient.bloodGroup || '—')}</td><td>${lastVisit ? escapeHtml(formatDate(lastVisit)) : '<span class="muted">No visits</span>'}</td><td>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</td><td><span class="row-actions"><button class="action-button" data-open-patient-profile="${escapeHtml(patient.id)}">Profile</button>${showRecordsAction ? `<button class="action-button" data-open-patient-records="${escapeHtml(patient.id)}">Visits</button><button class="action-button" data-open-patient-external-records="${escapeHtml(patient.id)}">Outside</button>` : ''}${canManage ? `<button class="action-button" data-edit-patient="${escapeHtml(patient.id)}">Edit</button>` : ''}</span></td></tr>`;
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
    document.getElementById('patientPreviewName').textContent = patient.name;
    document.getElementById('patientPreviewContent').innerHTML = `
      <div class="patient-preview-identity"><span class="patient-avatar">${escapeHtml(initials(patient.name))}</span><div><b>${escapeHtml(patient.code)}</b><span>${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Unspecified')} · ${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</span></div></div>
      <dl class="patient-preview-details">
        <div><dt>Mobile</dt><dd>${escapeHtml(patient.phone || '—')}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(patient.email || '—')}</dd></div>
        <div><dt>Registration</dt><dd>${escapeHtml(formatDate(String(patient.createdAt || '').slice(0, 10)))}</dd></div>
        <div><dt>Latest visit</dt><dd>${latest ? escapeHtml(formatDate(latest.visitDate)) : 'No visits'}</dd></div>
        <div><dt>Next appointment</dt><dd>${upcoming ? `${escapeHtml(formatDate(upcoming.date))} · ${escapeHtml(upcoming.doctor)}` : 'No upcoming appointment'}</dd></div>
        <div><dt>Clinical alert</dt><dd>${escapeHtml(patient.allergies || patient.notes || 'Allergy status not recorded')}</dd></div>
      </dl>
      <div class="patient-preview-actions"><button type="button" class="button button-primary" data-open-patient-profile="${escapeHtml(patient.id)}">Open full profile</button>${canManagePatientData() ? `<button type="button" class="button button-light" data-edit-patient="${escapeHtml(patient.id)}">Edit</button>` : ''}</div>`;
    document.getElementById('patientPreviewDrawer').classList.remove('hidden');
  }

  function patientPhoneKey(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function nextPatientCode() {
    const usedCodes = new Set(data.patients.map((patient) => String(patient.code || '').toUpperCase()));
    let sequence = Date.now() % 1000000;
    let code = `CSK-${String(sequence).padStart(6, '0')}`;
    while (usedCodes.has(code)) {
      sequence = (sequence + 1) % 1000000;
      code = `CSK-${String(sequence).padStart(6, '0')}`;
    }
    return code;
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
    const birthDate = String(form.elements.namedItem('dob').value || '');
    const id = String(form.elements.namedItem('id').value || '');
    const draftId = String(form.elements.namedItem('draftId').value || '');
    const patient = data.patients.find((item) => item.id === id);
    const draft = data.patientDrafts.find((item) => item.id === draftId);
    const code = patient?.code || draft?.code || '';
    document.getElementById('patientCodePreview').textContent = code || 'Assigned on save';
    document.getElementById('patientRegistrationPreview').textContent = patient?.createdAt
      ? formatDate(String(patient.createdAt).slice(0, 10))
      : 'Today';
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

  function updatePatientIdentityValidity(form, showErrors = false) {
    const name = form.elements.namedItem('name');
    const phone = form.elements.namedItem('phone');
    const nameValue = String(name.value || '').trim();
    const phoneValue = String(phone.value || '').trim();
    const nameMessage = !nameValue
      ? 'Enter the patient name; spaces alone are not valid.'
      : nameValue.length < 2
        ? 'Enter at least 2 characters for the patient name.'
        : '';
    const phoneMessage = !phoneValue
      ? 'Enter the patient mobile number; spaces alone are not valid.'
      : !/\d/.test(phoneValue)
        ? 'Enter a mobile number with at least one digit.'
        : phoneValue.length < 7
          ? 'Enter a mobile number with at least 7 characters.'
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
    const currentPanel = form.querySelector('.patient-form-step:not(.hidden)');
    if (validateCurrent && currentPanel) {
      if (currentPanel.dataset.patientStepPanel === '0') updatePatientIdentityValidity(form, true);
      const fields = [...currentPanel.querySelectorAll('input, select, textarea')];
      const invalid = fields.find((field) => !field.checkValidity());
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    form.querySelectorAll('[data-patient-step-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', Number(panel.dataset.patientStepPanel) !== step);
    });
    form.querySelectorAll('[data-patient-step]').forEach((indicator) => {
      const active = Number(indicator.dataset.patientStep) === step;
      indicator.classList.toggle('active', active);
      if (active) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });
    form.querySelector(`[data-patient-step-panel="${step}"] input:not([type="hidden"]), [data-patient-step-panel="${step}"] select, [data-patient-step-panel="${step}"] textarea`)?.focus();
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
    const latestVitals = latestRecord ? [
      ['BP', latestRecord.bloodPressure],
      ['Pulse', latestRecord.pulseBpm ? `${latestRecord.pulseBpm} bpm` : ''],
      ['Temp', latestRecord.temperatureC !== null && latestRecord.temperatureC !== undefined ? `${latestRecord.temperatureC} °C` : ''],
      ['SpO2', latestRecord.spo2Percent !== null && latestRecord.spo2Percent !== undefined ? `${latestRecord.spo2Percent}%` : ''],
      ['Weight', latestRecord.weightKg !== null && latestRecord.weightKg !== undefined ? `${latestRecord.weightKg} kg` : ''],
      ['BMI', latestRecord.bmi],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '') : [];
    const allergies = patient.allergies || patient.notes || '';
    const clinicalFlags = [
      allergies ? 'Allergy information recorded' : 'Allergy status needs confirmation',
      patient.currentMedications ? 'Current medicines recorded' : 'Medication list needs review',
      latestRecord?.followUpDate ? `Follow-up ${formatDate(latestRecord.followUpDate)}` : 'No follow-up recorded',
    ];
    document.getElementById('patientProfileTitle').textContent = patient.name || 'Patient profile';
    document.getElementById('patientProfileSubtitle').textContent = `${patient.code || 'ID pending'} · Registered ${formatDate(String(patient.createdAt || '').slice(0, 10))}`;
    const content = document.getElementById('patientProfileContent');
    const profileTabs = [
      ['overview', 'Overview'],
      ['personal', 'Personal'],
      ...(canViewClinicalRecords() ? [['medical', 'Medical history']] : []),
      ...(canViewClinicalRecords() ? [['visits', `Visits (${records.length})`]] : []),
      ...(canViewClinicalRecords() ? [['diagnoses', `Diagnoses (${records.filter((record) => record.diagnosis).length})`]] : []),
      ...(canViewClinicalRecords() ? [['external', `Outside records (${externalRecords.length})`]] : []),
      ...(canViewClinicalRecords() ? [['vitals', 'Vitals']] : []),
      ...(canViewClinicalRecords() ? [['medications', 'Medications']] : []),
      ...(canViewClinicalRecords() ? [['supplies', `Supply usage (${consumableUsages.length})`]] : []),
      ...(canViewClinicalRecords() ? [['investigations', `Investigations (${records.filter((record) => record.tests || record.investigationAdvice).length})`]] : []),
      ...(canViewClinicalRecords() ? [['documents', `Documents (${records.reduce((count, record) => count + (record.reports?.length || 0), 0) + externalRecords.filter((record) => record.fileDataUrl).length})`]] : []),
      ['appointments', `Appointments (${appointments.length})`],
      ['billing', `Billing (${invoices.length})`],
      ['timeline', 'Timeline'],
    ];
    let panel = '';
    if (activePatientProfileTab === 'overview') {
      panel = `
        <div class="patient-profile-summary">
          <div class="patient-profile-identity"><span class="patient-avatar">${escapeHtml(initials(patient.name))}</span><div><h3>${escapeHtml(patient.name)}</h3><p>${escapeHtml(patientAge(patient))} · ${escapeHtml(patient.gender || 'Unspecified')} · ${escapeHtml(patient.bloodGroup || 'Blood group not recorded')}</p></div></div>
          <div class="patient-profile-stats"><div><b>${records.length}</b><span>Visits</span></div><div><b>${appointments.length}</b><span>Appointments</span></div><div><b>${invoices.length}</b><span>Invoices</span></div><div><b>${escapeHtml(patient.bloodGroup || '—')}</b><span>Blood group</span></div></div>
        </div>
        ${allergies ? `<section class="patient-alert-card"><b>Allergies / safety alert</b><p>${recordText(allergies)}</p></section>` : '<section class="patient-alert-card patient-alert-empty"><b>Allergies not recorded</b><p>Confirm allergy status with the patient and update their record.</p></section>'}
        <section class="patient-clinical-handoff">
          <div class="patient-section-heading"><div><h3>Visit history</h3><p>Read-only clinical context from earlier clinic visits.</p></div><span class="patient-handoff-badge">${latestRecord ? 'Previous visit available' : 'No previous visit'}</span></div>
          <div class="patient-handoff-grid">
            <div><small>Known case</small><b>${recordText(latestRecord?.knownCase || patient.medicalHistory || 'Not recorded')}</b></div>
            <div><small>Latest diagnosis</small><b>${recordText(latestRecord?.diagnosis || 'Not recorded')}</b></div>
            <div><small>Investigation plan</small><b>${recordText(latestRecord?.tests || latestRecord?.investigationAdvice || 'Not recorded')}</b></div>
            <div><small>Follow-up plan</small><b>${recordText(latestRecord?.followUpInstructions || 'Not recorded')}</b></div>
          </div>
          ${latestVitals.length ? `<div class="patient-latest-vitals"><span>Latest vitals · ${escapeHtml(formatDate(latestRecord.visitDate))}</span>${latestVitals.map(([label, value]) => `<b>${escapeHtml(label)} <em>${escapeHtml(value)}</em></b>`).join('')}</div>` : '<div class="patient-care-gap">No vitals recorded yet. Capture baseline vitals during the next visit.</div>'}
          <div class="patient-care-flags">${clinicalFlags.map((flag) => `<span>${escapeHtml(flag)}</span>`).join('')}</div>
        </section>
        ${canViewClinicalRecords() ? `<section class="external-records-overview">
          <div class="patient-section-heading"><div><h3>Previous / outside doctor records</h3><p>Kept separate from CSK Clinic visit history.</p></div><span class="external-record-count">${externalRecords.length} records</span></div>
          ${externalRecords.length ? `<p>${escapeHtml(formatDate(String(externalRecords[0].recordDate || '').slice(0, 10)))} · ${escapeHtml(externalRecords[0].recordType)} · ${escapeHtml(externalRecords[0].doctorName)}</p>` : '<p>No outside-provider records added yet.</p>'}
          <button type="button" class="action-button" data-profile-tab="external">View outside records</button>
        </section>` : ''}
        <div class="patient-profile-info-grid">
          <section><h3>Contact and demographics</h3><dl><div><dt>Mobile</dt><dd>${escapeHtml(patient.phone || '—')}</dd></div><div><dt>Email</dt><dd>${escapeHtml(patient.email || '—')}</dd></div><div><dt>Emergency contact</dt><dd>${escapeHtml(patient.emergencyContact || '—')}</dd></div><div><dt>Address</dt><dd>${recordText(patient.address)}</dd></div><div><dt>Occupation</dt><dd>${escapeHtml(patient.occupation || '—')}</dd></div><div><dt>Language</dt><dd>${escapeHtml(patient.preferredLanguage || '—')}</dd></div><div><dt>Marital status</dt><dd>${escapeHtml(patient.maritalStatus || '—')}</dd></div></dl></section>
          <section><h3>Medical background</h3><dl><div><dt>Existing conditions / history</dt><dd>${recordText(patient.medicalHistory || patient.notes)}</dd></div><div><dt>Surgical history</dt><dd>${recordText(patient.surgicalHistory)}</dd></div><div><dt>Family history</dt><dd>${recordText(patient.familyHistory)}</dd></div><div><dt>Current medications</dt><dd>${recordText(patient.currentMedications)}</dd></div><div><dt>Previous visit</dt><dd>${records.length ? `${escapeHtml(formatDate(records[0].visitDate))} · ${escapeHtml(records[0].diagnosis || 'No diagnosis recorded')}` : 'No visit recorded'}</dd></div><div><dt>Next appointment</dt><dd>${nextAppointment ? `${escapeHtml(formatDate(nextAppointment.date))} · ${escapeHtml(nextAppointment.doctor)}` : 'No upcoming appointment'}</dd></div></dl></section>
        </div>
        <section class="patient-insurance-card"><div><h3>Coverage and payment context</h3><p>Use this information when planning investigations, admission, or billing.</p></div><dl><div><dt>Provider</dt><dd>${escapeHtml(patient.insuranceProvider || 'Not recorded')}</dd></div><div><dt>Policy number</dt><dd>${escapeHtml(patient.insuranceNumber || 'Not recorded')}</dd></div></dl></section>
        <div class="patient-profile-actions">${canViewClinicalRecords() ? `<button type="button" class="button button-light" data-profile-history="${escapeHtml(patient.id)}">Open clinical timeline</button>` : ''}${canManagePatientData() ? `<button type="button" class="button button-light" data-profile-appointment="${escapeHtml(patient.id)}">Schedule appointment</button><button type="button" class="button button-light" data-profile-edit="${escapeHtml(patient.id)}">Edit patient details</button>` : ''}</div>
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
            <div class="patient-profile-actions"><button type="button" class="action-button" data-edit-external-record="${escapeHtml(record.id)}">Edit record</button></div>
          </article>
        `).join('')}</div>` : '<div class="empty-state"><span>▤</span><b>No outside-provider records</b><p>Add previous doctor reports, diagnosis and treatment details here. CSK Clinic visits remain in the Visits tab.</p></div>'}
      `;
    } else if (activePatientProfileTab === 'personal') {
      panel = `<div class="patient-profile-info-grid"><section><h3>Personal information</h3><dl><div><dt>Full name</dt><dd>${escapeHtml(patient.name)}</dd></div><div><dt>Patient ID</dt><dd>${escapeHtml(patient.code)}</dd></div><div><dt>Date of birth</dt><dd>${escapeHtml(patient.dob ? formatDate(patient.dob) : 'Not recorded')}</dd></div><div><dt>Age</dt><dd>${escapeHtml(patientAge(patient))}</dd></div><div><dt>Gender</dt><dd>${escapeHtml(patient.gender || 'Unspecified')}</dd></div><div><dt>Blood group</dt><dd>${escapeHtml(patient.bloodGroup || 'Not recorded')}</dd></div></dl></section><section><h3>Contact information</h3><dl><div><dt>Mobile</dt><dd>${escapeHtml(patient.phone || '—')}</dd></div><div><dt>Email</dt><dd>${escapeHtml(patient.email || '—')}</dd></div><div><dt>Emergency contact</dt><dd>${escapeHtml(patient.emergencyContact || '—')}</dd></div><div><dt>Address</dt><dd>${recordText(patient.address)}</dd></div><div><dt>Occupation</dt><dd>${escapeHtml(patient.occupation || '—')}</dd></div><div><dt>Language</dt><dd>${escapeHtml(patient.preferredLanguage || '—')}</dd></div><div><dt>Marital status</dt><dd>${escapeHtml(patient.maritalStatus || '—')}</dd></div></dl></section></div>`;
    } else if (activePatientProfileTab === 'medical') {
      panel = `<div class="patient-profile-info-grid"><section><h3>Medical background</h3><dl><div><dt>Allergies / reactions</dt><dd>${recordText(patient.allergies || patient.notes)}</dd></div><div><dt>Existing conditions</dt><dd>${recordText(patient.medicalHistory)}</dd></div><div><dt>Previous surgeries</dt><dd>${recordText(patient.surgicalHistory)}</dd></div><div><dt>Family history</dt><dd>${recordText(patient.familyHistory)}</dd></div><div><dt>Current medications</dt><dd>${recordText(patient.currentMedications)}</dd></div></dl></section><section><h3>Recent clinical summary</h3><dl><div><dt>Latest diagnosis</dt><dd>${recordText(records[0]?.diagnosis)}</dd></div><div><dt>Recent investigations</dt><dd>${recordText(records[0]?.tests || records[0]?.investigationAdvice)}</dd></div><div><dt>Follow-up</dt><dd>${records[0]?.followUpDate ? escapeHtml(formatDate(records[0].followUpDate)) : 'Not recorded'}</dd></div><div><dt>Hospitalization</dt><dd>${recordText(records.find((record) => record.encounterType === 'IPD')?.consultationNotes)}</dd></div></dl></section></div>`;
    } else if (activePatientProfileTab === 'vitals') {
      const vitals = records.filter((record) => ['bloodPressure', 'pulseBpm', 'temperatureC', 'spo2Percent', 'weightKg', 'heightCm', 'bmi', 'cbgMgDl'].some((key) => record[key] !== null && record[key] !== undefined && record[key] !== '')).sort((left, right) => String(right.visitDate).localeCompare(String(left.visitDate)));
      const trend = (key, label, unit) => {
        const samples = vitals.filter((record) => record[key] !== null && record[key] !== undefined && record[key] !== '').slice(0, 6).reverse();
        if (!samples.length) return '';
        const values = samples.map((record) => Number(record[key])).filter(Number.isFinite);
        if (!values.length) return '';
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const range = maximum - minimum || 1;
        const bars = values.map((value) => `<span style="height:${Math.max(18, ((value - minimum) / range) * 100)}%" title="${escapeHtml(`${value} ${unit}`)}"></span>`).join('');
        return `<div class="patient-vitals-trend"><div><b>${escapeHtml(label)}</b><strong>${escapeHtml(`${values[values.length - 1]} ${unit}`)}</strong></div><div class="patient-vitals-bars">${bars}</div><small>${escapeHtml(formatDate(samples[0].visitDate))} → ${escapeHtml(formatDate(samples[samples.length - 1].visitDate))}</small></div>`;
      };
      const trendCards = trend('weightKg', 'Weight', 'kg') + trend('pulseBpm', 'Pulse', 'bpm') + trend('spo2Percent', 'SpO2', '%') + trend('bmi', 'BMI', '') + trend('cbgMgDl', 'Blood glucose', 'mg/dL');
      panel = vitals.length ? `${trendCards ? `<div class="patient-vitals-trends">${trendCards}</div>` : ''}<div class="patient-profile-list">${vitals.map((record) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(formatDate(record.visitDate))}</b><span>${escapeHtml(record.doctorName || 'Recording source not shown')}</span></div><div class="patient-profile-vitals">${[['Blood pressure', record.bloodPressure], ['Pulse', record.pulseBpm ? `${record.pulseBpm} bpm` : ''], ['Temperature', record.temperatureC !== null && record.temperatureC !== undefined ? `${record.temperatureC} °C` : ''], ['SpO2', record.spo2Percent !== null && record.spo2Percent !== undefined ? `${record.spo2Percent}%` : ''], ['Height', record.heightCm !== null && record.heightCm !== undefined ? `${record.heightCm} cm` : ''], ['Weight', record.weightKg !== null && record.weightKg !== undefined ? `${record.weightKg} kg` : ''], ['BMI', record.bmi], ['Blood glucose', record.cbgMgDl !== null && record.cbgMgDl !== undefined ? `${record.cbgMgDl} mg/dL` : '']].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => `<span><b>${label}</b> ${escapeHtml(value)}</span>`).join('')}</div></article>`).join('')}</div>` : '<div class="empty-state"><span>◷</span><b>No vitals history</b><p>No clinical measurements have been recorded for this patient.</p></div>';
    } else if (activePatientProfileTab === 'medications') {
      const prescribed = records.flatMap((record) => (record.prescriptionItems || []).map((item) => ({ ...item, prescriptionDate: record.visitDate, doctorName: record.doctorName })));
      panel = prescribed.length ? `<div class="patient-profile-list">${prescribed.map((item) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(item.medicineName || item.medicine?.name || 'Medicine')}</b><span>${escapeHtml(formatDate(item.prescriptionDate))}</span></div><p>${escapeHtml(item.strength || item.medicine?.productSize || 'Strength not recorded')} · ${escapeHtml(item.dosage || 'Dosage not recorded')} · ${escapeHtml(item.frequency || 'Frequency not recorded')} · ${escapeHtml(item.durationDays ? `${item.durationDays} days` : 'Duration not recorded')}</p><p>Prescribed by ${escapeHtml(item.doctorName || 'Doctor not recorded')} · Prescription only; dispensing status is not inferred.</p></article>`).join('')}</div>` : `<div class="empty-state"><span>✚</span><b>No prescription history</b><p>${recordText(patient.currentMedications) !== 'Not recorded' ? `Recorded current medicines: ${escapeHtml(patient.currentMedications)}` : 'No prescribed medicines have been recorded.'}</p></div>`;
    } else if (activePatientProfileTab === 'documents') {
      const documents = records.flatMap((record) => (record.reports || []).map((report) => ({ ...report, recordDate: report.reportDate || record.visitDate })));
      externalRecords.forEach((record) => { if (record.fileDataUrl) documents.push({ name: record.fileName || record.recordType || 'Outside record', fileName: record.fileName, fileDataUrl: record.fileDataUrl, recordDate: record.recordDate, source: record.facilityName || record.doctorName }); });
      panel = documents.length ? `<div class="patient-profile-list">${documents.map((document) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(document.name)}</b><span>${escapeHtml(formatDate(String(document.recordDate || '').slice(0, 10)))}</span></div><p>${escapeHtml(document.source || 'CSK Clinic record')}</p>${document.fileDataUrl ? `<a class="external-record-attachment" href="${escapeHtml(document.fileDataUrl)}" download="${escapeHtml(document.fileName || document.name)}" target="_blank" rel="noopener noreferrer">Preview / download</a>` : ''}</article>`).join('')}</div>` : '<div class="empty-state"><span>▤</span><b>No documents</b><p>Laboratory reports, imaging reports and external attachments will appear here.</p></div>';
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
      panel = invoices.length ? `<div class="patient-profile-list">${invoices.map((invoice) => `<article class="patient-profile-entry"><div class="patient-profile-entry-head"><b>${escapeHtml(invoice.number)}</b><span>${escapeHtml(formatDate(invoice.date))}</span></div><p>Total ${money(invoice.total)} · Paid ${money(invoice.paid)} · Balance ${money(Math.max(0, Number(invoice.total) - Number(invoice.paid)))}</p>${invoice.encounterId ? `<p>Linked to a clinical visit · <button type="button" class="action-button" data-open-patient-records="${escapeHtml(patient.id)}">View visit history</button></p>` : '<p>General billing · no visit link recorded</p>'}<span class="status-pill ${Number(invoice.paid) >= Number(invoice.total) ? '' : 'pending'}">${escapeHtml(invoiceStatus(invoice))}</span>${invoice.payments?.length ? `<div class="patient-profile-payments">${invoice.payments.map((payment) => `<span>${escapeHtml(formatDate(String(payment.date || '').slice(0, 10)))} · ${escapeHtml(payment.method || 'Payment')} ${payment.reference ? `· ${escapeHtml(payment.reference)}` : ''} · ${money(payment.amount)}</span>`).join('')}</div>` : ''}</article>`).join('')}</div>` : '<div class="empty-state"><span>▤</span><b>No billing history</b><p>Invoices and payments linked to this patient will appear here.</p></div>';
    }
    content.innerHTML = `<nav class="patient-profile-tabs" role="tablist" aria-label="Patient profile sections">${profileTabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${activePatientProfileTab === key}" class="${activePatientProfileTab === key ? 'active' : ''}" data-profile-tab="${key}">${label}</button>`).join('')}</nav><section class="patient-profile-panel">${panel}</section>`;
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
    activePatientProfileTab = initialTab;
    document.getElementById('patientProfileContent').innerHTML = '<div class="patient-profile-loading" role="status">Loading patient profile…</div>';
    openModal('patientProfileModal');
    try {
      if (isApiConnected()) {
        patient = normalizeApiPatient(await apiRequest(`/patients/${encodeURIComponent(patientId)}`));
        data.patients = data.patients.map((item) => item.id === patientId ? { ...item, ...patient } : item);
        if (canViewClinicalRecords()) {
          const records = await apiRequest(`/patients/${encodeURIComponent(patientId)}/records`);
          if (!Array.isArray(records)) throw new Error('The clinic API returned an invalid clinical history.');
          data.patientRecords = data.patientRecords.filter((record) => record.patientId !== patientId)
            .concat(records.map((record) => normalizeApiEncounter({ ...record, patientId })));
          const externalRecords = await apiRequest(`/patients/${encodeURIComponent(patientId)}/external-records`);
          if (!Array.isArray(externalRecords)) throw new Error('The clinic API returned an invalid outside-provider history.');
          data.externalMedicalRecords = data.externalMedicalRecords.filter((record) => record.patientId !== patientId)
            .concat(externalRecords.map((record) => normalizeApiExternalMedicalRecord({ ...record, patientId })));
          const consumableUsages = await apiRequest(`/patients/${encodeURIComponent(patientId)}/consumable-usages`);
          if (!Array.isArray(consumableUsages)) throw new Error('The clinic API returned invalid supply usage.');
          data.consumableUsages = (data.consumableUsages || []).filter((usage) => usage.patientId !== patientId)
            .concat(consumableUsages.map((usage) => ({ ...usage, patientId })));
        }
      }
      renderPatientProfile(patient);
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
    return {
      ...item,
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
    };
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
    const settings = data.settings;
    const vitals = [
      ['BP', record.bloodPressure],
      ['PR', record.pulseBpm ? `${record.pulseBpm} bpm` : ''],
      ['Temp', record.temperatureC !== null && record.temperatureC !== undefined ? `${record.temperatureC} °C` : ''],
      ['SpO2', record.spo2Percent !== null && record.spo2Percent !== undefined ? `${record.spo2Percent}%` : ''],
      ['CBG', record.cbgMgDl !== null && record.cbgMgDl !== undefined ? `${record.cbgMgDl} mg/dL` : ''],
      ['HT', record.heightCm !== null && record.heightCm !== undefined ? `${record.heightCm} cm` : ''],
      ['WT', record.weightKg !== null && record.weightKg !== undefined ? `${record.weightKg} kg` : ''],
      ['BMI', record.bmi !== null && record.bmi !== undefined ? record.bmi : ''],
    ];
    const vitalsMarkup = vitals.map(([label, value]) =>
      `<div><b>${escapeHtml(label)}</b><span>${escapeHtml(value || '____________')}</span></div>`
    ).join('');
    const medicineRows = (record.prescriptionItems || []).map((item) =>
      `<tr><td>${escapeHtml(item.medicineName || item.medicine?.name || 'Medicine')}</td><td>${escapeHtml(item.dosage)}</td><td>${escapeHtml(item.frequency)}</td><td>${Number(item.durationDays)} days</td><td>${escapeHtml(item.instructions || '')}</td></tr>`
    ).join('');
    const popup = window.open('', '_blank', 'width=900,height=1000');
    if (!popup) {
      showToast('Allow pop-ups to print the clinical sheet.');
      return;
    }
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(patient.name)} - Prescription</title><style>
      body{margin:0;font-family:Arial,sans-serif;color:#151515}.sheet{max-width:850px;margin:0 auto;padding:18px}
      .clinic{background:#142f67;color:#fff;display:flex;align-items:center;gap:18px;padding:14px 18px;border-bottom:4px solid #ed1c24}
      .clinic img{width:92px;height:92px;object-fit:contain;background:#fff;border-radius:8px}.clinic-info{flex:1;text-align:center}.clinic-info h1{margin:0;font-size:34px}.clinic-info p{margin:5px 0}.registration{font-weight:bold;font-size:18px}
      .patient{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px 4px;border-bottom:1px solid #bbb}.patient div{font-size:16px}
      .body{display:grid;grid-template-columns:190px 1fr;min-height:620px}.vitals{border-right:1px solid #555;padding:12px 10px}.vitals h3{margin:0 0 10px}.vitals div{display:grid;grid-template-columns:42px 1fr;margin:10px 0}.rx{padding:12px}.rx-mark{font-family:Georgia,serif;font-size:52px;margin-bottom:8px}.rx table{width:100%;border-collapse:collapse}.rx th,.rx td{border-bottom:1px solid #ddd;padding:8px 4px;text-align:left;font-size:13px}.rx th{background:#f2f4f7}
      .sections{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.sections div{min-height:70px}.sections b{display:block;margin-bottom:5px}.footer{border-top:3px solid #142f67;text-align:center;padding:10px;margin-top:18px}.footer b{color:#142f67}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.sheet{max-width:none;padding:0}}
    </style></head><body><article class="sheet">
      <header class="clinic"><img src="/assets/csk-clinic-logo.png" alt="CSK Clinic logo"><div class="clinic-info"><h1>${escapeHtml(settings.clinicName || 'C.S.K. Clinic')}</h1><p>${escapeHtml(settings.practitioner || 'Dr. C. Selvakumar')} · MBBS, MD</p><p class="registration">REG No: ${escapeHtml(settings.registration || '80887')}</p></div></header>
      <section class="patient"><div><b>Date:</b> ${escapeHtml(formatDate(record.visitDate))}</div><div><b>Patient ID:</b> ${escapeHtml(patient.code)}</div><div><b>Name:</b> ${escapeHtml(patient.name)}</div><div><b>Age/Sex:</b> ${escapeHtml(patientAge(patient))} / ${escapeHtml(patient.gender || '—')}</div></section>
      <section class="body"><aside class="vitals"><h3>Vital signs</h3>${vitalsMarkup}</aside><main class="rx"><div class="rx-mark">℞</div>${medicineRows ? `<table><thead><tr><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${medicineRows}</tbody></table>` : ''}${record.prescriptions ? `<p>${recordText(record.prescriptions)}</p>` : ''}<div class="sections">
      ${record.knownCase ? `<div><b>Known case of</b><span>${recordText(record.knownCase)}</span></div>` : ''}
      ${record.diagnosis ? `<div><b>Diagnosis</b><span>${recordText(record.diagnosis)}</span></div>` : ''}
      ${record.investigationAdvice ? `<div><b>Investigation advised</b><span>${recordText(record.investigationAdvice)}</span></div>` : ''}
      ${record.referralDetails ? `<div><b>Referral details</b><span>${recordText(record.referralDetails)}</span></div>` : ''}
      ${record.tests ? `<div><b>Tests / lab orders</b><span>${recordText(record.tests)}</span></div>` : ''}
      ${record.followUpInstructions ? `<div><b>Follow-up</b><span>${recordText(record.followUpInstructions)}</span></div>` : ''}
      </div></main></section>
      <footer class="footer"><b>${escapeHtml(settings.address || 'Clinic address not set')} · ${escapeHtml(settings.phone || '')}</b></footer>
    </article><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function getPatientRecords(patientId) {
    return (data.patientRecords || [])
      .filter((record) => record.patientId === patientId)
      .sort((a, b) => `${b.visitDate || ''} ${b.createdAt || ''}`.localeCompare(`${a.visitDate || ''} ${a.createdAt || ''}`));
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
      const reportLinks = (Array.isArray(record.reports) ? record.reports : []).map((report) => {
        const downloadUrl = safeReportDataUrl(report.fileDataUrl);
        return `<div><b>${escapeHtml(report.name || 'Report')}</b>${report.reportDate ? `<p>Report date: ${escapeHtml(formatDate(String(report.reportDate).slice(0, 10)))}</p>` : ''}${report.notes ? `<p>${recordText(report.notes)}</p>` : ''}${downloadUrl ? `<a class="patient-report-link" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(sanitizeReportFileName(report.fileName || 'attached-report'))}">Download ${escapeHtml(report.fileName || 'attached report')}</a>` : report.fileName ? `<p>Attached file: ${escapeHtml(report.fileName)}</p>` : ''}</div>`;
      }
      ).join('');
      return `${dateLabel}<article class="patient-record-card">
        <div class="patient-record-top"><div><span class="record-type ${inpatient ? 'ipd' : ''}">${inpatient ? 'IPD · Inpatient' : 'OPD · Outpatient'}</span><h4>${escapeHtml(record.diagnosis || 'Visit record')}</h4><p>${escapeHtml(formatDate(record.visitDate))} · ${escapeHtml(record.doctorName || 'Doctor not recorded')}</p></div><div class="record-status"><span class="status-pill ${closed ? '' : inpatient ? 'pending' : ''}">${inpatient && !closed ? 'Admitted' : closed ? 'Closed' : 'Open'}</span><button type="button" class="action-button" data-print-patient-sheet="${escapeHtml(record.id)}" data-patient-id="${escapeHtml(patientId)}">Print sheet</button>${invoiceAction}</div></div>
        <div class="patient-record-grid">
          ${record.symptoms ? `<div><b>Symptoms</b><p>${recordText(record.symptoms)}</p></div>` : ''}
          ${record.consultationNotes ? `<div><b>Consultation notes</b><p>${recordText(record.consultationNotes)}</p></div>` : ''}
          ${record.knownCase ? `<div><b>Known case of</b><p>${recordText(record.knownCase)}</p></div>` : ''}
          ${vitals.length ? `<div><b>Vitals</b><p>${escapeHtml(vitals.join(' · '))}</p></div>` : ''}
          ${prescriptionsMarkup}
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
    return ['SUPER_ADMIN', 'CLINIC_OWNER', 'CLINIC_ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(getStoredApiUser()?.role);
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
      <div class="patient-clinical-visit"><span class="status-pill">Read-only history</span><small>Past clinic records and archived intake</small></div>
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
    openModal('patientRecordsModal');
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
      return `<tr><td>${escapeHtml(patient?.name || 'Patient record unavailable')}</td><td>${escapeHtml(appointment.doctor)}</td><td>${escapeHtml(appointment.department || '—')}</td><td>${escapeHtml(formatDate(appointment.date))} · ${escapeHtml(formatTime(appointment.time))}</td><td>${escapeHtml(appointment.reason || '—')}</td><td><span class="status-pill ${statusClass}">${escapeHtml(appointment.status)}</span></td><td>${appointment.status !== 'Cancelled' && appointment.status !== 'Completed' ? `<button class="action-button danger" data-cancel-appointment="${escapeHtml(appointment.id)}">Cancel</button>` : ''}</td></tr>`;
    }).join('');
  }

  function medicineStatus(medicine) {
    if (medicine.expiry && medicine.expiry < dateKey(today)) return 'Expired';
    if (Number(medicine.quantity) <= Number(medicine.reorder)) return 'Low stock';
    if (medicine.expiry && medicine.expiry <= shiftDate(45)) return 'Expiring soon';
    return 'In stock';
  }
  function renderMedicines() {
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
      return `<tr><td><span class="patient-cell"><span class="medicine-icon">✚</span><span><b>${escapeHtml(medicine.name)}</b><small>${escapeHtml([medicine.brand, medicine.productSize, medicine.category || 'Uncategorized'].filter(Boolean).join(' · '))}</small></span></span></td><td>${escapeHtml(medicine.category || '—')}</td><td>${escapeHtml(medicine.batch || '—')}<br><small>${escapeHtml(formatDate(medicine.expiry))}</small></td><td><b>${Number(medicine.quantity)}</b> units</td><td>${Number(medicine.reorder)} units</td><td>${money(medicine.price)}</td><td><span class="status-pill ${className}">${escapeHtml(status)}</span></td><td><span class="row-actions"><button class="action-button" data-stock-medicine="${escapeHtml(medicine.id)}" data-stock-delta="1">＋ Stock</button><button class="action-button" data-edit-medicine="${escapeHtml(medicine.id)}">Edit</button><button class="action-button" data-medicine-history="${escapeHtml(medicine.id)}">History</button></span></td></tr>`;
    }).join('');
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
    const total = Number(invoice.total) || 0;
    const paid = Number(invoice.paid) || 0;
    if (total > 0 && paid >= total) return 'Paid';
    if (paid > 0) return 'Part paid';
    return 'Unpaid';
  }
  function renderInvoices() {
    const query = document.getElementById('invoiceSearch').value.trim().toLowerCase();
    const rows = [...data.invoices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).filter((invoice) => {
      const name = patientById(invoice.patientId)?.name || '';
      return `${invoice.number} ${name}`.toLowerCase().includes(query);
    });
    const collected = collectedOnDate(dateKey(today));
    const due = data.invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paid)), 0);
    document.getElementById('billingCollected').textContent = money(collected);
    document.getElementById('billingOutstanding').textContent = money(due);
    document.getElementById('billingInvoiceCount').textContent = data.invoices.length;
    document.getElementById('invoicesEmpty').classList.toggle('hidden', rows.length > 0);
    document.getElementById('invoicesTable').innerHTML = rows.map((invoice) => {
      const patient = patientById(invoice.patientId);
      const balance = Math.max(0, Number(invoice.total) - Number(invoice.paid));
      const status = invoiceStatus(invoice);
      return `<tr><td>${escapeHtml(invoice.number)}</td><td>${escapeHtml(patient?.name || 'Patient record unavailable')}</td><td>${escapeHtml(formatDate(invoice.date))}</td><td>${money(invoice.total)}</td><td>${money(invoice.paid)}</td><td>${money(balance)}</td><td><span class="status-pill ${status === 'Paid' ? '' : 'pending'}">${status}</span></td><td><span class="row-actions"><button class="action-button" data-print-invoice="${escapeHtml(invoice.id)}">Invoice</button><button class="action-button" data-print-receipt="${escapeHtml(invoice.id)}">Receipt</button>${balance > 0 ? `<button class="action-button" data-pay-invoice="${escapeHtml(invoice.id)}">Receive payment</button>` : ''}</span></td></tr>`;
    }).join('');
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
    const invoices = data.invoices.filter((invoice) => !from && !to || inPeriod(invoice.date));
    const paymentRecords = data.invoices.flatMap((invoice) => {
      const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
      const records = payments.length
        ? payments.map((payment) => ({
            invoice,
            date: String(payment.date || payment.paidAt || invoice.date || '').slice(0, 10),
            amount: Number(payment.amount || 0),
            method: payment.method || invoice.paymentMethod || 'Other',
            reference: payment.reference || payment.receiptNumber || '',
          }))
        : Number(invoice.paid || 0) > 0
          ? [{
              invoice,
              date: String(invoice.date || '').slice(0, 10),
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
    return [
      ...report.patients.map((patient) => ({ date: String(patient.createdAt || '').slice(0, 10), activity: 'Patient registered', detail: patient.name, value: patient.code })),
      ...report.appointments.map((appointment) => ({ date: appointment.date, activity: 'Appointment', detail: patientById(appointment.patientId)?.name || 'Patient', value: `${appointment.status} · ${appointment.time || ''}` })),
      ...report.visits.map((visit) => ({ date: visit.visitDate, activity: 'Clinic visit', detail: patientById(visit.patientId)?.name || 'Patient', value: `${visit.doctorName || 'Doctor not recorded'} · ${visit.diagnosis || visit.encounterType || 'Visit'}` })),
      ...report.invoices.map((invoice) => ({ date: invoice.date, activity: 'Invoice', detail: patientById(invoice.patientId)?.name || 'Patient', value: `${invoice.number} · ${money(invoice.total)} · ${invoiceStatus(invoice)}` })),
      ...report.paymentRecords.map((payment) => ({ date: payment.date, activity: 'Payment received', detail: patientById(payment.invoice.patientId)?.name || 'Patient', value: `${payment.invoice.number} · ${payment.method} · ${money(payment.amount)}` })),
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
          const balance = Math.max(0, Number(invoice.total) - Number(invoice.paid));
          return `<tr><td><b>${escapeHtml(invoice.number)}</b></td><td>${escapeHtml(formatDate(invoice.date))}</td><td>${escapeHtml(patientById(invoice.patientId)?.name || 'Patient unavailable')}</td><td>${money(invoice.total)}</td><td>${money(invoice.paid)}</td><td>${money(balance)}</td><td><span class="status-pill ${balance === 0 ? '' : 'pending'}">${escapeHtml(invoiceStatus(invoice))}</span></td></tr>`;
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
  function renderSettings() {
    const form = document.getElementById('settingsForm');
    Object.entries(data.settings).forEach(([name, value]) => {
      if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value || '';
    });
  }
  function renderAll() {
    updateApiStatusText();
    toggleAppointmentApiFields();
    renderOverview();
    renderPatients();
    renderAppointments();
    renderConsumables();
    renderMedicines();
    renderInvoices();
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
    document.getElementById('savePatientDraft').disabled = !!patient;
    document.getElementById('savePatientDraft').title = patient ? 'Drafts are for new patient registrations.' : '';
    document.getElementById('patientDuplicateWarning').classList.add('hidden');
    ['name', 'phone'].forEach((name) => {
      const field = form.elements.namedItem(name);
      delete field.dataset.touched;
      field.setCustomValidity('');
    });
    form.elements.namedItem('dob').max = dateKey(today);
    setPatientFormStep(0);
    updatePatientIdentityValidity(form);
    updatePatientRegistrationPreview();
    updatePatientDuplicateWarning();
    openModal('patientModal');
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

  function addInvoiceLine(item = {}) {
    const row = document.createElement('div');
    row.className = 'invoice-line';
    const options = ['<option value="">Select medicine, supply or service</option>', '<option value="consultation">Consultation</option>', ...data.medicines.filter((medicine) => medicine.active !== false).map((medicine) => `<option value="${escapeHtml(medicine.id)}">${escapeHtml(medicine.name)} · ${money(medicine.price)} · ${Number(medicine.quantity)} in stock</option>`), ...data.consumables.filter((supply) => supply.active !== false).map((supply) => `<option value="consumable:${escapeHtml(supply.id)}">${escapeHtml(supply.category)} · ${escapeHtml(supply.name)} · ${money(supply.price)} · ${Number(supply.quantity)} in stock</option>`)].join('');
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
    if (item.medicineId) {
      row.querySelector('.line-product').value = item.medicineId;
      const medicine = data.medicines.find((entry) => entry.id === item.medicineId);
      if (medicine) row.querySelector('.line-qty').max = String(medicine.quantity);
    }
    if (item.name === 'Consultation') row.querySelector('.line-product').value = 'consultation';
    row.querySelector('.line-product').addEventListener('change', () => {
      const selectedMedicineId = row.querySelector('.line-product').value;
      const medicine = data.medicines.find((entry) => entry.id === selectedMedicineId);
      const consumableChoice = selectedMedicineId.startsWith('consumable:') ? selectedMedicineId.slice('consumable:'.length) : '';
      const consumable = data.consumables.find((entry) => entry.id === consumableChoice);
      if (row.dataset.prescriptionItemId && selectedMedicineId !== row.dataset.prescriptionMedicineId) {
        delete row.dataset.prescriptionItemId;
      }
      if (medicine) row.querySelector('.line-price').value = medicine.price;
      if (medicine) row.querySelector('.line-qty').max = String(medicine.quantity);
      if (consumable) row.querySelector('.line-price').value = consumable.price;
      if (consumable) row.querySelector('.line-qty').max = String(consumable.quantity);
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
      const name = medicine ? medicine.name : consumable ? consumable.name : choice === 'consultation' ? 'Consultation' : '';
      const quantity = Math.max(0, Number(row.querySelector('.line-qty').value) || 0);
      const price = Math.max(0, Number(row.querySelector('.line-price').value) || 0);
      return {
        medicineId: medicine?.id || null,
        consumableId: consumable?.id || null,
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
  function openInvoiceModal(patientId = '', prescriptionItems = [], encounterId = '') {
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
    openModal('invoiceModal');
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
    const balance = Math.max(0, Number(invoice.total) - Number(invoice.paid));
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
  });

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('button,a');
    if (!target) return;
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
    if (target.matches('[data-close-modal]')) {
      if (target.closest('#patientRecordsModal')) activePatientRecordsId = '';
      closeModal(target.closest('.modal-backdrop'));
    }
    if (target.classList.contains('modal-backdrop') && event.target === target) {
      if (target.id === 'patientRecordsModal') activePatientRecordsId = '';
      closeModal(target);
    }
    if (target.matches('[data-go]')) showView(target.dataset.go);
    if (target.matches('.nav-link[data-section]')) { event.preventDefault(); showView(target.dataset.section); }
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
  });

  document.getElementById('patientForm').addEventListener('click', (event) => {
    const button = event.target.closest('button[name="saveAction"]');
    if (button) event.currentTarget.dataset.saveAction = button.value;
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
        if (continueAfterSave && savedPatient.id) {
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
      name: String(fields.get('name')).trim(),
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
      emergencyContact: String(fields.get('emergencyContact') || '').trim(),
      status: current?.status || 'Active',
      createdAt: current?.createdAt || new Date().toISOString()
    };
    if (current) Object.assign(current, patient); else data.patients.push(patient);
    data.patientDrafts = data.patientDrafts.filter((draft) => draft.id !== draftId);
    save(); renderAll(); closeModal(document.getElementById('patientModal'));
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

  document.getElementById('appointmentDoctorApi').addEventListener('change', () => void loadAppointmentSlots());
  document.querySelector('#appointmentForm [name="date"]').addEventListener('change', () => {
    if (isApiConnected()) void loadAppointmentSlots();
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
        items: items.map((item) => item.medicineId
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

  document.querySelectorAll('#invoiceForm [name="discount"], #invoiceForm [name="taxRate"]').forEach((input) => {
    input.addEventListener('input', calculateInvoice);
  });

  document.getElementById('settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const settings = Object.fromEntries(fields.entries());
    data.settings = settings;
    save(); renderAll(); showToast('Clinic details saved.');
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
          }),
        });
        showToast('Clinic details saved to the API.');
      } catch (error) {
        showToast(error.message || 'Clinic details saved locally but could not update the API.');
      }
    }
  });

  document.getElementById('apiConnectButton')?.addEventListener('click', connectToApi);
  document.getElementById('apiDisconnectButton')?.addEventListener('click', async () => {
    await apiRequest('/auth/logout', { method: 'POST' }, true).catch(() => {});
    clearApiSession();
    data = loadData();
    renderAll();
    showToast('Disconnected from the live API and returned to local demo mode.');
  });

  document.getElementById('addInvoiceItem').addEventListener('click', () => addInvoiceLine());
  document.querySelector('#invoiceForm [name="paid"]').addEventListener('input', calculateInvoice);
  document.getElementById('patientSearch').addEventListener('input', () => { patientDirectoryPage = 1; renderPatients(); });
  ['patientGenderFilter', 'patientBloodFilter', 'patientTypeFilter', 'patientSort'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => { patientDirectoryPage = 1; renderPatients(); });
  });
  document.getElementById('clearPatientFilters')?.addEventListener('click', () => {
    document.getElementById('patientSearch').value = '';
    document.getElementById('patientGenderFilter').value = '';
    document.getElementById('patientBloodFilter').value = '';
    document.getElementById('patientTypeFilter').value = '';
    document.getElementById('patientSort').value = 'recent';
    patientDirectoryPage = 1;
    renderPatients();
  });
  document.getElementById('patientPrevPage')?.addEventListener('click', () => { if (patientDirectoryPage > 1) { patientDirectoryPage -= 1; renderPatients(); } });
  document.getElementById('patientNextPage')?.addEventListener('click', () => { patientDirectoryPage += 1; renderPatients(); });
  document.getElementById('closePatientPreview')?.addEventListener('click', () => document.getElementById('patientPreviewDrawer').classList.add('hidden'));
  document.getElementById('patientForm').addEventListener('input', (event) => {
    if (['name', 'phone'].includes(event.target.name)) {
      event.target.dataset.touched = 'true';
      updatePatientIdentityValidity(event.currentTarget);
    }
    if (['name', 'phone', 'dob'].includes(event.target.name)) {
      updatePatientDuplicateWarning();
      updatePatientRegistrationPreview();
    }
  });
  document.getElementById('patientForm').addEventListener('change', (event) => {
    if (['name', 'phone'].includes(event.target.name)) {
      event.target.dataset.touched = 'true';
      updatePatientIdentityValidity(event.currentTarget);
    }
    if (['name', 'phone', 'dob'].includes(event.target.name)) updatePatientDuplicateWarning();
    if (event.target.name === 'dob') updatePatientRegistrationPreview();
  });
  document.getElementById('savePatientDraft').addEventListener('click', savePatientDraft);
  ['patientHistorySearch', 'patientHistoryFrom', 'patientHistoryTo', 'patientHistoryDoctor', 'patientHistoryType', 'patientHistoryStatus', 'patientHistoryContent'].forEach((id) => {
    document.getElementById(id).addEventListener(id === 'patientHistorySearch' ? 'input' : 'change', () => {
      const patientId = activePatientRecordsId;
      if (patientId) renderPatientRecords(patientId);
    });
  });
  document.getElementById('appointmentSearch').addEventListener('input', renderAppointments);
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
    if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(closeModal);
  });
  document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();

  async function initializeApp() {
    if (getStoredApiToken()) {
      await hydrateFromApi();
    }
    renderAll();
    const initialSection = window.location.hash.slice(1);
    if (document.getElementById(initialSection)?.classList.contains('view')) showView(initialSection);
  }

  void initializeApp();
})();
