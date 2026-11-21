import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('overview navigation and patient registration work', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await expect(page.getByRole('heading', { name: 'Register patient' })).toBeVisible();

  await page.locator('#patientForm [name="name"]').fill('E2E History Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000099');
  await page.locator('#patientForm [name="dob"]').fill('1992-05-10');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: 'Save patient' }).click();

  await page.getByRole('link', { name: /Patients/ }).click();
  await expect(page.locator('#patientsTable').getByText('E2E History Patient')).toBeVisible();
});

test('mobile data screens use labeled cards without horizontal overflow', async ({ page }) => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });

    for (const section of ['overview', 'patients', 'appointments', 'billing', 'pharmacy', 'consumables', 'reports', 'settings']) {
      await page.evaluate((sectionId) => {
        document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.click();
      }, section);
      await expect(page.locator(`#${section}`)).toHaveClass(/active/);

      const table = page.locator(`#${section} .table-scroll table`).first();
      if (await table.count()) {
        await expect(table).toBeVisible();
        const tableContainerFits = await table.locator('xpath=..').evaluate((element) => element.scrollWidth <= element.clientWidth);
        expect(tableContainerFits, `${section} table container should fit at ${width}px`).toBe(true);

        const labeledCellCount = await table.locator('tbody td[data-label]').count();
        expect(labeledCellCount, `${section} cells should have mobile labels at ${width}px`).toBeGreaterThan(0);
      }

      const pageFits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(pageFits, `${section} should not overflow at ${width}px`).toBe(true);

      if (section === 'patients' && width === 390) {
        await table.locator('[data-preview-patient]').first().click();
        const drawer = page.locator('#patientPreviewDrawer');
        await expect(drawer).toBeVisible();
        const drawerFits = await drawer.evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth);
        expect(drawerFits).toBe(true);
        await page.locator('#closePatientPreview').click();
      }

      if (section === 'consumables' && width === 360) {
        await page.locator('#openConsumableModal').click();
        const modal = page.locator('#consumableModal .modal');
        await expect(modal).toBeVisible();
        const modalFits = await modal.evaluate((element) => element.getBoundingClientRect().width <= window.innerWidth);
        expect(modalFits).toBe(true);
        await page.locator('#consumableModal [data-close-modal]').first().click();
      }
    }
  }
});

test('tablet report sections fit without internal grid overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.locator('.nav-link[data-section="reports"]').evaluate((element) => element.click());
  await expect(page.getByRole('heading', { name: 'Reports & analytics' })).toBeVisible();

  const overflowingSections = await page.locator('#reports .report-section').evaluateAll((sections) =>
    sections.filter((section) => section.getBoundingClientRect().width > 0 && section.scrollWidth > section.clientWidth + 1)
      .map((section) => section.querySelector('h2')?.textContent || 'unnamed report section'));
  expect(overflowingSections).toEqual([]);

  const pageFits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(pageFits).toBe(true);
});

test('adds more demo patients and records when opening older saved browser data', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('csk-clinic-management-v1', JSON.stringify({
      demoDataVersion: 0,
      patients: [{
        id: 'legacy-local-patient',
        code: 'LEGACY-001',
        name: 'Existing Local Patient',
        phone: '9000000011',
        status: 'Active',
        createdAt: new Date().toISOString(),
      }],
      settings: {},
    }));
  });
  await page.reload();

  await page.getByRole('link', { name: /Patients/ }).click();
  await expect(page.locator('#patientsTable')).toContainText('Existing Local Patient');
  await expect(page.locator('#patientsTable')).toContainText('Maya Krishnan');
  await expect(page.locator('#patientsTable tr', { hasText: 'Maya Krishnan' })).toHaveCount(1);
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' })
    .getByRole('button', { name: 'View visits' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Hypertension follow-up');
  await expect(page.locator('#patientIntakeHistory')).toContainText('Headache and high home BP readings');
  await page.locator('#patientRecordsModal [data-close-modal]').first().click();

  await page.reload();
  await page.getByRole('link', { name: /Patients/ }).click();
  await expect(page.locator('#patientsTable tr', { hasText: 'Maya Krishnan' })).toHaveCount(1);
});

test('patient registration blocks whitespace-only names and mobile numbers', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: '＋ Add patient' }).click();
  const name = page.locator('#patientForm [name="name"]');
  const phone = page.locator('#patientForm [name="phone"]');
  const continueButton = page.getByRole('button', { name: /Continue to contact details/ });

  await name.fill('   ');
  await phone.fill('9000000012');
  await continueButton.click();
  await expect(page.locator('#patientNameError')).toHaveText('Enter the patient name; spaces alone are not valid.');
  await expect(page.locator('#patientForm [data-patient-step-panel="0"]')).toBeVisible();

  await name.fill('E2E Valid Patient');
  await phone.fill('       ');
  await continueButton.click();
  await expect(page.locator('#patientPhoneError')).toHaveText('Enter the patient mobile number; spaces alone are not valid.');
  await expect(page.locator('#patientForm [data-patient-step-panel="0"]')).toBeVisible();

  await phone.fill('9000000012');
  await continueButton.click();
  await expect(page.locator('#patientForm [data-patient-step-panel="1"]')).toBeVisible();
});

test('patient registration saves and resumes a draft, then shows the patient profile', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: '＋ Add patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Draft Patient');
  await expect(page.locator('#patientAgePreview')).toContainText('Age calculated');
  await page.locator('#patientForm [name="dob"]').fill('1990-01-01');
  await expect(page.locator('#patientAgePreview')).toContainText('Age');
  await expect(page.locator('#patientCodePreview')).toContainText('Assigned on save');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('#toast')).toHaveText('Patient registration draft saved.');
  await page.getByRole('button', { name: /Drafts/ }).click();
  await expect(page.locator('#patientDraftList')).toContainText('E2E Draft Patient');
  await page.locator('#patientDraftList').getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('#patientForm [name="name"]')).toHaveValue('E2E Draft Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000021');
  await page.locator('#patientForm [name="dob"]').fill('1990-01-01');
  await page.getByRole('button', { name: /Continue to contact details/ }).click();
  await page.locator('#patientForm [name="emergencyContact"]').fill('E2E Contact · 9000000022');
  await page.getByRole('button', { name: /Continue to health background/ }).click();
  await page.locator('#patientForm [name="notes"]').fill('E2E allergy detail');
  await page.locator('#patientForm [name="medicalHistory"]').fill('E2E condition and surgical history');
  await page.locator('#patientForm [name="surgicalHistory"]').fill('E2E prior procedure history');
  await page.locator('#patientForm [name="familyHistory"]').fill('E2E family health history');
  await page.locator('#patientForm [name="currentMedications"]').fill('E2E current medicine and dose');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Draft Patient', level: 2 })).toBeVisible();
  await expect(page.locator('#patientProfileContent')).toContainText('E2E Contact · 9000000022');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E allergy detail');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E condition and surgical history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E prior procedure history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E family health history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E current medicine and dose');
  await page.getByRole('tab', { name: /Visits/ }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('No visits recorded');
  await page.getByRole('tab', { name: /Appointments/ }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('No appointments');
  await page.getByRole('tab', { name: /Billing/ }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('No billing history');
  await page.getByRole('tab', { name: /Overview/ }).click();
  await page.locator('#patientProfileModal').getByRole('button', { name: 'Schedule appointment' }).click();
  const patientId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.patients.find((patient: { name: string }) => patient.name === 'E2E Draft Patient')?.id;
  });
  await expect(page.locator('#appointmentForm [name="patientId"]')).toHaveValue(patientId);
  await page.locator('#appointmentModal').getByRole('button', { name: 'Cancel' }).click();
  await page.locator('#patientsTable tr', { hasText: 'E2E Draft Patient' }).getByRole('button', { name: 'Profile' }).click();
  await page.locator('#patientProfileModal').getByRole('button', { name: 'Edit patient details' }).click();
  await expect(page.locator('#patientForm [name="emergencyContact"]')).toHaveValue('E2E Contact · 9000000022');
  await expect(page.locator('#patientForm [name="notes"]')).toHaveValue('E2E allergy detail');
  await expect(page.locator('#patientForm [name="medicalHistory"]')).toHaveValue('E2E condition and surgical history');
  await expect(page.locator('#patientForm [name="surgicalHistory"]')).toHaveValue('E2E prior procedure history');
  await expect(page.locator('#patientForm [name="familyHistory"]')).toHaveValue('E2E family health history');
  await expect(page.locator('#patientForm [name="currentMedications"]')).toHaveValue('E2E current medicine and dose');
  await page.locator('#patientForm').getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#patientDraftCount')).toHaveText('0');
});

test('patient registration warns and requires explicit confirmation for possible duplicates', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: '＋ Add patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Existing Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000031');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const beforeCount = await page.locator('#patientsTable tr').count();

  await page.getByRole('button', { name: '＋ Add patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Possible Duplicate');
  await page.locator('#patientForm [name="phone"]').fill('9000000031');
  await expect(page.locator('#patientDuplicateWarning')).toBeVisible();
  await expect(page.locator('#patientDuplicateWarning')).toContainText('E2E Existing Patient');
  await page.getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#toast')).toHaveText('Check for an existing patient and confirm before continuing.');
  await expect(page.locator('#patientsTable tr')).toHaveCount(beforeCount);
  await page.locator('#patientDuplicateConfirmed').check();
  await page.getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#patientsTable')).toContainText('E2E Possible Duplicate');
  await expect(page.locator('#patientsTable tr')).toHaveCount(beforeCount + 1);
  await page.locator('#patientSearch').fill('9000000031');
  await expect(page.locator('#patientsTable')).toContainText('E2E Existing Patient');
  await expect(page.locator('#patientsTable')).toContainText('E2E Possible Duplicate');
});

test('outside-provider history supports structured records, attachments, edits, and doctor review', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: '＋ Add patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Outside History Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000042');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const patientRow = page.locator('#patientsTable tr', { hasText: 'E2E Outside History Patient' });
  await expect(page.getByRole('columnheader', { name: 'Clinic visit records' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Previous / outside history' })).toBeVisible();
  await patientRow.getByRole('button', { name: 'View visits' }).click();
  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await page.locator('#patientRecordsModal [data-close-modal]').first().click();
  await patientRow.getByRole('button', { name: 'Outside history' }).click();

  await expect(page.getByRole('tab', { name: /Outside records/, selected: true })).toBeVisible();
  await page.getByRole('button', { name: '＋ Add outside record' }).click();
  await page.locator('#externalMedicalRecordForm [name="recordDate"]').fill('2023-02-14');
  await page.locator('#externalMedicalRecordForm [name="recordType"]').selectOption({ label: 'Discharge summary' });
  await page.locator('#externalMedicalRecordForm [name="doctorName"]').fill('Dr. E2E Previous');
  await page.locator('#externalMedicalRecordForm [name="facilityName"]').fill('E2E Outside Hospital');
  await page.locator('#externalMedicalRecordForm [name="diagnosis"]').fill('Outside diagnosis');
  await page.locator('#externalMedicalRecordForm [name="treatment"]').fill('Outside treatment plan');
  await page.locator('#externalMedicalRecordForm [name="medications"]').fill('Medicine X, once daily');
  await page.locator('#externalMedicalRecordForm [name="investigations"]').fill('CBC report');
  await page.locator('#externalMedicalRecordForm [name="notes"]').fill('History supplied by previous provider');
  await page.locator('#externalMedicalRecordForm [name="attachment"]').setInputFiles({
    name: 'outside-report.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic outside provider report.'),
  });
  await page.getByRole('button', { name: 'Save outside record' }).click();
  await expect(page.locator('#toast')).toHaveText('Outside-provider record saved.');
  await expect(page.locator('#patientProfileContent')).toContainText('Outside diagnosis');
  await expect(page.locator('#patientProfileContent')).toContainText('outside-report.txt');

  await page.getByRole('button', { name: 'Edit record' }).click();
  await expect(page.locator('#externalRecordCurrentFile')).toContainText('outside-report.txt');
  await page.locator('#externalMedicalRecordForm [name="diagnosis"]').fill('Updated outside diagnosis');
  await page.locator('#externalRecordRemoveFileLabel input').check();
  await page.getByRole('button', { name: 'Update outside record' }).click();
  await expect(page.locator('#toast')).toHaveText('Outside-provider record updated.');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated outside diagnosis');
  await expect(page.locator('#patientProfileContent')).toContainText('No attachment');

  await page.getByRole('tab', { name: /Visits/ }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('No visits recorded');
  await page.getByRole('button', { name: 'Review clinical timeline' }).click();
  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await expect(page.locator('#patientRecordsHistory')).toContainText('No visit records');
  await expect(page.locator('#patientRecordsModal')).not.toContainText('Updated outside diagnosis');
});

test('removes clinical workspaces while preserving read-only visit and intake history', async ({ page }) => {
  const visitDate = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  await page.evaluate((date) => {
    const key = 'csk-clinic-management-v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.demoDataVersion = 1;
    data.patients = [{
      id: 'patient-demo-1',
      code: 'CSK-2048',
      name: 'Aisha Nair',
      phone: '98765 43210',
      email: 'aisha@example.com',
      dob: '1992-06-18',
      gender: 'Female',
      bloodGroup: 'O+',
      status: 'Active',
      createdAt: `${date}T10:00:00.000Z`,
    }];
    data.patientRecords = [...(data.patientRecords || []),
      {
        id: 'archived-visit-e2e',
        patientId: 'patient-demo-1',
        encounterType: 'OPD',
        status: 'OPEN',
        visitDate: date,
        doctorName: 'Dr. Archive E2E',
        diagnosis: 'Archived diagnosis',
        symptoms: 'Archived symptom history',
        prescriptionItems: [],
        reports: [],
      },
      {
        id: 'other-visit-e2e',
        patientId: 'patient-demo-1',
        encounterType: 'OPD',
        status: 'OPEN',
        visitDate: date,
        doctorName: 'Dr. Archive E2E',
        diagnosis: 'Unrelated diagnosis',
        prescriptionItems: [],
        reports: [],
      },
    ];
    data.queueTokens = [...(data.queueTokens || []), {
      id: 'archived-token-e2e',
      patientId: 'patient-demo-1',
      date,
      tokenNumber: 12,
      doctor: 'Dr. Archive E2E',
      nurseIntake: {
        chiefComplaint: 'Archived intake complaint',
        symptoms: 'Archived intake symptoms',
        status: 'SUBMITTED',
        enteredBy: 'Nurse E2E',
      },
    }];
    localStorage.setItem(key, JSON.stringify(data));
  }, visitDate);
  await page.reload();

  await expect(page.getByRole('link', { name: 'Doctor workspace' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Nursing workspace' })).toHaveCount(0);
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' })
    .getByRole('button', { name: 'View visits' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Archived diagnosis');
  await expect(page.locator('#patientIntakeHistory')).toContainText('Archived intake complaint');
  await expect(page.locator('#patientIntakeHistory')).toContainText('Nurse E2E');
  await expect(page.locator('#patientRecordsModal #patientEncounterForm')).toHaveCount(0);
  await expect(page.locator('#patientRecordsModal')).not.toContainText('Save doctor visit');

  await page.locator('#patientHistorySearch').fill('Archived diagnosis');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Archived diagnosis');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Archived symptom history');
  await expect(page.locator('#patientRecordsHistory')).not.toContainText('Unrelated diagnosis');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;
  const csvPath = await download.path();
  if (!csvPath) throw new Error('Patient history CSV was not written to a temporary file.');
  const csv = await readFile(csvPath, 'utf8');
  expect(csv).toContain('Archived diagnosis');
  expect(csv).not.toContain('Unrelated diagnosis');
  await page.getByRole('button', { name: 'Clear filters' }).click();
});

test.skip('nurse intake workflow has been removed', async ({ page }) => {
  await page.getByRole('link', { name: 'Token queue' }).click();
  await page.getByRole('button', { name: '＋ Add to queue' }).click();
  await page.locator('#queueForm [name="patientId"]').selectOption('patient-demo-1');
  await page.locator('#queueForm [name="doctor"]').fill('Dr. Meera Nair');
  await page.locator('#queueForm [name="reason"]').fill('Fever and headache');
  await page.getByRole('button', { name: 'Issue queue token' }).click();

  const row = page.locator('#queueTable tr', { hasText: 'Aisha Nair' });
  await row.getByRole('button', { name: 'Record intake' }).click();
  await expect(page.locator('#nurseIntakePatientContext')).toContainText('Hypertension follow-up');
  await page.locator('#nurseIntakeForm [name="chiefComplaint"]').fill('Fever and headache since morning');
  await page.locator('#nurseIntakeForm [name="onset"]').fill('Started today');
  await page.locator('#nurseIntakeForm [name="allergyStatus"]').selectOption('CONFIRMED_NONE');
  await page.locator('#nurseIntakeForm [name="medicationsReviewed"]').selectOption('true');
  await page.locator('#nurseIntakeForm [name="bloodPressure"]').fill('118/76');
  await page.locator('#nurseIntakeForm [name="pulseBpm"]').fill('84');
  await page.locator('#nurseIntakeForm [name="weightKg"]').fill('70');
  await page.locator('#nurseIntakeForm [name="heightCm"]').fill('175');
  await expect(page.locator('#nurseIntakeForm [name="bmi"]')).toHaveValue('22.86');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(row).toContainText('Intake in progress');

  await row.getByRole('button', { name: 'Resume intake' }).click();
  await expect(page.locator('#nurseIntakeForm [name="chiefComplaint"]')).toHaveValue('Fever and headache since morning');
  await page.getByRole('button', { name: 'Send to doctor' }).click();
  await expect(page.locator('#toast')).toHaveText('Nurse intake sent to the doctor worklist.');
  await expect(row).toContainText('Ready for doctor');

  await row.getByRole('button', { name: 'Call' }).click();
  await row.getByRole('button', { name: 'Start' }).click();
  await expect(row).toContainText('In consultation');
  await expect(row).toContainText('Reviewed by doctor');
});

test.skip('nursing and doctor workspaces have been removed', async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Nursing Handoff Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000077');
  await page.locator('#patientForm [name="dob"]').fill('1990-04-12');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: /Continue to contact details/ }).click();
  await page.locator('#patientForm [name="address"]').fill('E2E Clinic Address');
  await page.getByRole('button', { name: /Continue to health background/ }).click();
  await page.locator('#patientForm [name="notes"]').fill('E2E penicillin allergy');
  await page.locator('#patientForm [name="medicalHistory"]').fill('E2E asthma history');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const patientId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.patients.find((patient: { name: string }) => patient.name === 'E2E Nursing Handoff Patient')?.id;
  });
  expect(patientId).toBeTruthy();

  await page.getByRole('link', { name: 'Nursing workspace' }).click();
  const arrival = page.locator('#nursingNewPatientsTable tr', { hasText: 'E2E Nursing Handoff Patient' });
  await expect(arrival).toContainText('Registered · unassigned');
  await arrival.getByRole('button', { name: 'View full record' }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('E2E asthma history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E penicillin allergy');
  await page.getByRole('tab', { name: /Outside records/ }).click();
  await page.getByRole('button', { name: '＋ Add outside record' }).click();
  await page.locator('#externalMedicalRecordForm [name="recordDate"]').fill('2022-10-10');
  await page.locator('#externalMedicalRecordForm [name="recordType"]').selectOption({ label: 'Consultation' });
  await page.locator('#externalMedicalRecordForm [name="doctorName"]').fill('Dr. Previous E2E');
  await page.locator('#externalMedicalRecordForm [name="diagnosis"]').fill('Previous provider respiratory history');
  await page.getByRole('button', { name: 'Save outside record' }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('Previous provider respiratory history');
  await page.locator('#patientProfileModal [data-close-modal]').first().click();

  await arrival.getByRole('button', { name: 'Assign doctor' }).click();
  await expect(page.locator('#queueForm [name="patientId"]')).toHaveValue(patientId);
  await page.locator('#queueForm [name="doctor"]').fill('Dr. E2E Nurse Handoff');
  await page.locator('#queueForm [name="reason"]').fill('E2E cough and wheeze');
  await page.getByRole('button', { name: 'Issue queue token' }).click();

  const nursingVisit = page.locator('#nursingQueueTable tr', { hasText: 'E2E Nursing Handoff Patient' });
  await expect(nursingVisit).toContainText('Dr. E2E Nurse Handoff');
  await nursingVisit.getByRole('button', { name: 'Record intake' }).click();
  await page.locator('#nurseIntakeForm [name="chiefComplaint"]').fill('Cough and wheeze since yesterday');
  await page.locator('#nurseIntakeForm [name="symptoms"]').fill('Shortness of breath after walking');
  await page.locator('#nurseIntakeForm [name="allergyStatus"]').selectOption('HAS_ALLERGIES');
  await page.locator('#nurseIntakeForm [name="allergyDetails"]').fill('Penicillin');
  await page.locator('#nurseIntakeForm [name="bloodPressure"]').fill('118/76');
  await page.locator('#nurseIntakeForm [name="pulseBpm"]').fill('82');
  await page.getByRole('button', { name: 'Send to doctor' }).click();
  await expect(nursingVisit).toContainText('Submitted');

  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  const doctorVisit = page.locator('#doctorQueueTable tr', { hasText: 'E2E Nursing Handoff Patient' });
  await expect(doctorVisit).toContainText('Cough and wheeze since yesterday');
  await doctorVisit.getByRole('button', { name: 'Open consultation' }).click();
  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await expect(page.locator('#patientClinicalIdentity')).toContainText('E2E Nursing Handoff Patient');
  await expect(page.locator('#patientClinicalIdentity')).toContainText('T001');
  await expect(page.locator('#patientClinicalIdentity')).toContainText('In consultation');
  await expect(page.locator('#patientEncounterForm .form-actions')).toHaveCSS('position', 'sticky');
  await expect(page.locator('#patientRecordsModal')).not.toContainText('Previous provider respiratory history');
  await expect(page.locator('#nurseHandoffDetails')).toContainText('Cough and wheeze since yesterday');
  await expect(page.locator('#nurseHandoffDetails')).toContainText('Shortness of breath after walking');
  await expect(page.locator('#nurseHandoffDetails')).toContainText('118/76');
  await expect(page.locator('#nurseHandoffStatus')).toContainText('Reviewed');
  await expect(page.locator('#patientEncounterForm [name="doctorName"]')).toHaveValue('Dr. E2E Nurse Handoff');
  await expect(page.locator('#patientEncounterForm [name="symptoms"]')).toHaveCount(0);
  await expect(page.locator('#patientEncounterForm [name="bloodPressure"]')).toHaveCount(0);
  await expect(page.locator('#patientEncounterForm [name="pulseBpm"]')).toHaveCount(0);
  await page.locator('#patientEncounterForm [name="diagnosis"]').fill('E2E consultation diagnosis');
  await page.locator('#patientEncounterForm [name="consultationNotes"]').fill('E2E consultation and treatment plan');
  await page.locator('#patientEncounterForm [name="followUpInstructions"]').fill('Return if breathing worsens');
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('E2E consultation diagnosis');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Cough and wheeze since yesterday');
  await expect(page.locator('#patientRecordsHistory')).toContainText('118/76');
  await expect(doctorVisit).toContainText('completed');
  await expect(page.locator('#doctorCompletedCount')).toHaveText('1');

  await page.setViewportSize({ width: 390, height: 844 });
  const historyColumns = await page.locator('#patientRecordsModal .patient-clinical-workspace')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(historyColumns).toBe(1);
  const modalHasHorizontalOverflow = await page.locator('#patientRecordsModal .modal-wide')
    .evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(modalHasHorizontalOverflow).toBe(false);

  await page.locator('#patientRecordsModal [data-close-modal]').first().click();
  await page.getByRole('link', { name: 'Nursing workspace' }).click();
  await expect(page.locator('#nursingQueueTable tr', { hasText: 'E2E Nursing Handoff Patient' })).toContainText('completed');
});

test('clinical consumable inventory tracks opening stock and stock history', async ({ page }) => {
  await page.getByRole('link', { name: 'Clinical supplies' }).click();
  await page.getByRole('button', { name: '＋ Add supply' }).click();
  await page.locator('#consumableForm [name="name"]').fill('E2E Sterile Gauze');
  await page.locator('#consumableForm [name="category"]').fill('E2E Dressing');
  await page.locator('#consumableForm [name="brand"]').fill('E2E Medical');
  await page.locator('#consumableForm [name="batch"]').fill('GAUZE-E2E-01');
  await page.locator('#consumableForm [name="quantity"]').fill('20');
  await page.locator('#consumableForm [name="reorder"]').fill('4');
  await page.locator('#consumableForm [name="cost"]').fill('2');
  await page.getByRole('button', { name: 'Save supply' }).click();

  const row = page.locator('#consumablesTable tr', { hasText: 'E2E Sterile Gauze' });
  await expect(row).toContainText('E2E Dressing');
  await expect(row).toContainText('20');
  page.once('dialog', (dialog) => dialog.accept('6'));
  await row.getByRole('button', { name: '＋ Stock' }).click();
  await expect(row).toContainText('26');
  page.once('dialog', (dialog) => dialog.accept('2'));
  await row.getByRole('button', { name: 'Use' }).click();
  await expect(row).toContainText('24');
  await row.getByRole('button', { name: 'History' }).click();
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Opening stock');
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Stock received from dashboard');
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Used for patient care');
  await expect(page.locator('#inventoryHistoryTable')).toContainText('+6');
  await expect(page.locator('#inventoryHistoryTable')).toContainText('-2');
});

test('token queue is removed while appointments remain available', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Token queue' })).toHaveCount(0);
  await expect(page.locator('#queue')).toHaveCount(0);
  await expect(page.locator('#queueModal')).toHaveCount(0);
  await page.getByRole('link', { name: 'Appointments' }).click();
  await expect(page.getByRole('heading', { name: 'Appointments' })).toBeVisible();
  await page.getByRole('button', { name: '＋ New appointment' }).click();
  await page.locator('#appointmentForm [name="patientId"]').selectOption('patient-demo-4');
  await page.locator('#appointmentForm [name="doctor"]').fill('Dr. Demo Clinician');
  await page.locator('#appointmentForm [name="department"]').fill('General medicine');
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#appointmentForm [name="date"]').fill(today);
  await page.locator('#appointmentForm [name="time"]').fill('18:30');
  await page.locator('#appointmentForm [name="reason"]').fill('Demo appointment without queue');
  await page.getByRole('button', { name: 'Save appointment' }).click();
  await expect(page.locator('#appointmentsTable')).toContainText('Demo appointment without queue');
  await expect(page.locator('#appointmentsTable tr', { hasText: 'Demo appointment without queue' })).toContainText('Scheduled');
});

test.skip('clinical encounter entry workflow has been removed', async ({ page }) => {
  test.setTimeout(120_000);
  const { today, futureDate, admissionDateTime } = await page.evaluate(() => {
    const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return {
      today: formatDate(new Date()),
      futureDate: formatDate(tomorrow),
      admissionDateTime: `${formatDate(yesterday)}T09:00`,
    };
  });

  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Complete Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000012');
  await page.locator('#patientForm [name="dob"]').fill('1988-03-20');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: /Continue to contact details/ }).click();
  await page.locator('#patientForm [name="email"]').fill('complete.patient@example.test');
  await page.locator('#patientForm [name="bloodGroup"]').selectOption('O+');
  await page.locator('#patientForm [name="address"]').fill('12 Test Street, Thammampatti');
  await page.locator('#patientForm [name="emergencyContact"]').fill('E2E Emergency · 9000000013');
  await page.getByRole('button', { name: /Continue to health background/ }).click();
  await page.locator('#patientForm [name="notes"]').fill('Synthetic E2E allergy and history notes');
  await page.locator('#patientForm [name="medicalHistory"]').fill('Synthetic E2E medical history');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const patientId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.patients.find((patient: { name: string }) => patient.name === 'E2E Complete Patient')?.id;
  });
  expect(patientId).toBeTruthy();

  await page.getByRole('link', { name: /Medicines & stock/ }).click();
  await page.getByRole('button', { name: '＋ Add medicine' }).click();
  await page.locator('#medicineForm [name="name"]').fill('E2E Test Medicine 500 mg');
  await page.locator('#medicineForm [name="category"]').fill('E2E category');
  await page.locator('#medicineForm [name="batch"]').fill('E2E-BATCH-001');
  await page.locator('#medicineForm [name="expiry"]').fill(futureDate);
  await page.locator('#medicineForm [name="quantity"]').fill('25');
  await page.locator('#medicineForm [name="reorder"]').fill('5');
  await page.locator('#medicineForm [name="cost"]').fill('4.25');
  await page.locator('#medicineForm [name="price"]').fill('8.50');
  await page.getByRole('button', { name: 'Save medicine' }).click();
  const medicineId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.medicines.find((medicine: { name: string }) => medicine.name === 'E2E Test Medicine 500 mg')?.id;
  });
  expect(medicineId).toBeTruthy();

  const medicineRow = page.locator('#medicinesTable tr', { hasText: 'E2E Test Medicine 500 mg' });
  page.once('dialog', (dialog) => dialog.accept('5'));
  await medicineRow.getByRole('button', { name: /Stock/ }).click();
  await expect(medicineRow).toContainText('30 units');

  await page.getByRole('link', { name: 'Appointments' }).click();
  await page.getByRole('button', { name: '＋ New appointment' }).click();
  await page.locator('#appointmentForm [name="patientId"]').selectOption(patientId);
  await page.locator('#appointmentForm [name="doctor"]').fill('Dr. E2E Workflow');
  await page.locator('#appointmentForm [name="department"]').fill('General medicine');
  await page.locator('#appointmentForm [name="date"]').fill(today);
  await page.locator('#appointmentForm [name="time"]').fill('18:30');
  await page.locator('#appointmentForm [name="reason"]').fill('Complete workflow visit');
  await page.getByRole('button', { name: 'Save appointment' }).click();
  const appointmentId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.appointments.find((appointment: { reason: string }) => appointment.reason === 'Complete workflow visit')?.id;
  });
  expect(appointmentId).toBeTruthy();

  await page.getByRole('link', { name: 'Token queue' }).click();
  await page.getByRole('button', { name: '＋ Add to queue' }).click();
  await page.locator('#queueAppointmentSelect').selectOption(appointmentId);
  await page.locator('#queueForm [name="priority"]').selectOption('EMERGENCY');
  await page.locator('#queueForm [name="reason"]').fill('Complete workflow visit');
  await page.getByRole('button', { name: 'Issue queue token' }).click();
  const queueRow = page.locator('#queueTable tr', { hasText: 'E2E Complete Patient' });
  await expect(queueRow).toContainText('T001');
  await expect(queueRow).toContainText('Emergency');
  await queueRow.getByRole('button', { name: 'Record intake' }).click();
  await page.locator('#nurseIntakeForm [name="chiefComplaint"]').fill('Synthetic symptom entry');
  await page.locator('#nurseIntakeForm [name="symptoms"]').fill('Symptoms recorded by nursing');
  await page.locator('#nurseIntakeForm [name="bloodPressure"]').fill('120/80');
  await page.locator('#nurseIntakeForm [name="temperatureC"]').fill('36.8');
  await page.locator('#nurseIntakeForm [name="pulseBpm"]').fill('72');
  await page.locator('#nurseIntakeForm [name="spo2Percent"]').fill('98');
  await page.locator('#nurseIntakeForm [name="cbgMgDl"]').fill('100');
  await page.locator('#nurseIntakeForm [name="weightKg"]').fill('70');
  await page.locator('#nurseIntakeForm [name="heightCm"]').fill('175');
  await page.getByRole('button', { name: 'Send to doctor' }).click();
  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  const doctorQueueRow = page.locator('#doctorQueueTable tr', { hasText: 'E2E Complete Patient' });
  await doctorQueueRow.getByRole('button', { name: 'Open consultation' }).click();
  await expect(page.locator('#nurseHandoffDetails')).toContainText('Synthetic symptom entry');
  await expect(page.locator('#nurseHandoffDetails')).toContainText('Symptoms recorded by nursing');
  await expect(page.locator('#patientEncounterForm [name="symptoms"]')).toHaveCount(0);
  await expect(page.locator('#patientEncounterForm [name="bloodPressure"]')).toHaveCount(0);
  await page.locator('#patientEncounterForm [name="doctorName"]').fill('Dr. E2E Workflow');
  await page.locator('#patientEncounterForm [name="visitDate"]').fill(today);
  await page.locator('#patientEncounterForm [name="diagnosis"]').fill('E2E test diagnosis');
  await page.locator('#patientEncounterForm [name="consultationNotes"]').fill('Synthetic consultation notes for workflow validation.');
  await page.locator('#patientEncounterForm [name="prescriptions"]').fill('Synthetic prescription note');
  await page.locator('#patientEncounterForm [name="tests"]').fill('CBC workflow test');
  await page.locator('#patientEncounterForm [name="investigationAdvice"]').fill('Synthetic investigation advice');
  await page.locator('#patientEncounterForm [name="referralDetails"]').fill('Synthetic referral details');
  await page.locator('#patientEncounterForm [name="followUpDate"]').fill(futureDate);
  await page.locator('#patientEncounterForm [name="followUpInstructions"]').fill('Synthetic follow-up instruction');
  await page.getByRole('button', { name: '＋ Add medicine' }).click();
  await page.locator('.prescription-medicine').selectOption(medicineId);
  await page.locator('.prescription-dosage').fill('E2E dose');
  await page.locator('.prescription-frequency').fill('E2E frequency');
  await page.locator('.prescription-duration').fill('5');
  await page.locator('.prescription-quantity').fill('10');
  await page.locator('.prescription-instructions').fill('Synthetic administration instruction');
  await page.getByRole('button', { name: '＋ Add report' }).click();
  await page.locator('.patient-report-name').fill('E2E synthetic report');
  await page.locator('.patient-report-date').fill(today);
  await page.locator('.patient-report-notes').fill('Synthetic report result');
  await page.locator('.patient-report-file').setInputFiles({
    name: 'e2e-report.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic report file for automated workflow testing.'),
  });
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('E2E test diagnosis');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Symptoms recorded by nursing');
  await expect(page.locator('#patientRecordsHistory')).toContainText('120/80');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Synthetic report result');

  await page.locator('#patientRecordsModal').getByRole('button', { name: 'Invoice remaining' }).click();
  await expect(page.locator('#invoiceModal')).toBeVisible();
  await expect(page.locator('#invoiceForm [name="patientId"]')).toBeDisabled();
  await page.getByRole('button', { name: '＋ Add item' }).click();
  await page.locator('.invoice-line').nth(1).locator('.line-product').selectOption('consultation');
  await page.locator('#invoiceForm [name="date"]').fill(today);
  await page.locator('#invoiceForm [name="template"]').selectOption('detailed');
  await page.locator('#invoiceForm [name="discount"]').fill('10');
  await page.locator('#invoiceForm [name="taxRate"]').fill('5');
  await page.locator('#invoiceForm [name="paid"]').fill('50');
  await page.locator('#invoiceForm [name="paymentMethod"]').selectOption('UPI');
  await page.locator('#invoiceForm [name="notes"]').fill('Synthetic workflow invoice');
  await page.getByRole('button', { name: 'Save & print invoice' }).click();
  await expect(page.locator('#printRoot')).toContainText('E2E Complete Patient');
  await page.locator('#printRoot [data-close-print-preview]').click();

  const invoiceRow = page.locator('#invoicesTable tr', { hasText: 'E2E Complete Patient' });
  await expect(invoiceRow).toContainText('Part paid');
  await invoiceRow.getByRole('button', { name: 'Receive payment' }).click();
  await page.locator('#paymentForm [name="amount"]').fill('100');
  await page.locator('#paymentForm [name="method"]').selectOption('UPI');
  await page.locator('#paymentForm [name="reference"]').fill('E2E-UPI-001');
  await page.getByRole('button', { name: 'Record & print receipt' }).click();
  await expect(page.locator('#printRoot')).toContainText('PAYMENT RECEIPT');
  await page.locator('#printRoot [data-close-print-preview]').click();
  await expect(invoiceRow).toContainText('Part paid');

  await invoiceRow.getByRole('button', { name: 'Receive payment' }).click();
  const remainingBalance = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    const invoice = records.invoices.find((item: { patientId: string }) => item.patientId === records.patients.find((patient: { name: string }) => patient.name === 'E2E Complete Patient')?.id);
    return (Number(invoice.total) - Number(invoice.paid)).toFixed(2);
  });
  await page.locator('#paymentForm [name="amount"]').fill(remainingBalance);
  await page.locator('#paymentForm [name="method"]').selectOption('Cash');
  await page.locator('#paymentForm [name="reference"]').fill('E2E-FINAL-001');
  await page.getByRole('button', { name: 'Record & print receipt' }).click();
  await expect(page.locator('#printRoot')).toContainText('PAYMENT RECEIPT');
  await page.locator('#printRoot [data-close-print-preview]').click();
  await expect(invoiceRow).toContainText('Paid');

  const finalRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}'));
  expect(finalRecords.medicines.find((medicine: { id: string }) => medicine.id === medicineId)?.quantity).toBe(20);
  expect(finalRecords.invoices.find((invoice: { patientId: string }) => invoice.patientId === patientId)?.payments).toHaveLength(3);

  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'E2E Complete Patient' }).getByRole('button', { name: 'View visits' }).click();
  await page.locator('#patientEncounterForm [name="encounterType"]').selectOption('IPD');
  await page.locator('#patientEncounterForm [name="doctorName"]').fill('Dr. E2E Inpatient');
  await page.locator('#patientEncounterForm [name="visitDate"]').fill(today);
  await page.locator('#patientEncounterForm [name="admittedAt"]').fill(admissionDateTime);
  await page.locator('#patientEncounterForm [name="ward"]').fill('E2E Ward');
  await page.locator('#patientEncounterForm [name="bed"]').fill('E2E-01');
  await page.locator('#patientEncounterForm [name="diagnosis"]').fill('E2E inpatient record');
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  const dischargeButton = page.locator('#patientRecordsHistory [data-discharge-record]');
  await expect(dischargeButton).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await dischargeButton.click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Closed');

  await page.locator('#patientRecordsModal [data-close-modal]').first().click();
  await page.getByRole('link', { name: 'Clinic settings' }).click();
  await page.locator('#settingsForm [name="clinicName"]').fill('CSK Clinic E2E Test');
  await page.locator('#settingsForm [name="phone"]').fill('9000000000');
  await page.locator('#settingsForm [name="address"]').fill('E2E Test Address');
  await page.getByRole('button', { name: 'Save clinic details' }).click();
  await expect(page.locator('#settingsForm [name="clinicName"]')).toHaveValue('CSK Clinic E2E Test');

  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.locator('#reportPatients')).toHaveText('4');
  await expect(page.locator('#reportInvoices')).toHaveText('1');
  const persistedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}').settings);
  expect(persistedSettings.clinicName).toBe('CSK Clinic E2E Test');
});

test.skip('clinical encounter editing workflow has been removed', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: '＋ Add patient' }).click();
  await page.locator('#patientForm [name="name"]').fill('E2E Repeat Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000088');
  await page.getByRole('button', { name: 'Save patient' }).click();

  await page.locator('#patientsTable').getByText('E2E Repeat Patient').waitFor();
  await page.locator('#patientsTable tr', { hasText: 'E2E Repeat Patient' })
    .getByRole('button', { name: 'View visits' })
    .click();
  await expect(page.getByRole('heading', { name: 'Patient visit history' })).toBeVisible();

  await page.locator('#patientEncounterForm [name="doctorName"]').fill('Dr. E2E');
  const visitDate = await page.locator('#patientEncounterForm [name="visitDate"]').inputValue();
  const futureDate = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#patientEncounterForm [name="visitDate"]').fill(futureDate);
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await expect(page.locator('#toast')).toHaveText('Visit date cannot be in the future.');

  await page.locator('#patientEncounterForm [name="visitDate"]').fill(visitDate);
  const pastDate = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#patientEncounterForm [name="followUpDate"]').fill(pastDate);
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await expect(page.locator('#toast')).toHaveText('Follow-up date cannot be earlier than the visit date.');
  await page.locator('#patientEncounterForm [name="followUpDate"]').fill('');

  await page.locator('#patientEncounterForm [name="diagnosis"]').fill('Upper respiratory infection');
  await expect(page.locator('#patientEncounterForm [name="symptoms"]')).toHaveCount(0);
  await expect(page.locator('#patientEncounterForm [name="bloodPressure"]')).toHaveCount(0);
  await expect(page.locator('#patientEncounterForm [name="knownCase"]')).toHaveCount(0);
  await page.locator('#patientEncounterForm [name="investigationAdvice"]').fill('CBC');

  await page.getByRole('button', { name: '＋ Add report' }).click();
  await page.locator('.patient-report-name').fill('CBC');
  await page.locator('.patient-report-notes').fill('Within normal limits');
  await page.locator('.patient-report-file').setInputFiles({
    name: 'malformed.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not a PDF'),
  });
  await expect(page.locator('#toast')).toHaveText('The selected file does not match its allowed file type.');
  await page.locator('.patient-report-file').setInputFiles({
    name: 'cbc-report.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('CBC results: within normal limits'),
  });

  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.locator('#patientsTable tr', { hasText: 'E2E Repeat Patient' })
    .getByRole('button', { name: 'View visits' })
    .click();

  await expect(page.locator('#patientRecordsHistory').getByRole('heading', { name: 'Upper respiratory infection' })).toBeVisible();
  await expect(page.getByText('Within normal limits')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download cbc-report.txt' })).toBeVisible();

  await page.locator('#patientHistorySearch').fill('within normal limits');
  await expect(page.locator('#patientRecordsHistory').getByRole('heading', { name: 'Upper respiratory infection' })).toBeVisible();
  await page.locator('#patientHistorySearch').fill('no such visit');
  await expect(page.getByText('No visits match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await page.locator('#patientHistoryFrom').fill(visitDate);
  await page.locator('#patientHistoryTo').fill(visitDate);
  await expect(page.locator('#patientRecordsHistory').getByRole('heading', { name: 'Upper respiratory infection' })).toBeVisible();
  await page.locator('#patientHistoryFrom').fill(futureDate);
  await expect(page.getByText('Start date must be on or before end date.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^patient-history-.*\.csv$/);
  const csvPath = await download.path();
  if (!csvPath) throw new Error('Patient history CSV was not written to a temporary file.');
  expect(await readFile(csvPath, 'utf8')).toContain('Upper respiratory infection');

  await page.locator('#patientHistoryDoctor').selectOption({ label: 'Dr. E2E' });
  await page.locator('#patientHistoryType').selectOption('OPD');
  await page.locator('#patientHistoryStatus').selectOption('OPEN');
  await page.locator('#patientHistoryContent').selectOption('tests');
  await expect(page.locator('#patientRecordsHistory').getByRole('heading', { name: 'Upper respiratory infection' })).toBeVisible();
  await page.locator('#patientHistoryContent').selectOption('reports');
  await expect(page.locator('#patientRecordsHistory').getByRole('heading', { name: 'Upper respiratory infection' })).toBeVisible();
  await page.locator('#patientHistoryType').selectOption('IPD');
  await expect(page.getByText('No visits match these filters.')).toBeVisible();
  await page.locator('#patientHistoryType').selectOption('OPD');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print filtered history' }).click();
  const printPage = await popupPromise;
  await expect(printPage.locator('body')).toContainText('Within normal limits');
  await expect(printPage.locator('body')).toContainText('Doctor: Dr. E2E');
  await expect(printPage.locator('body')).toContainText('Visit type: OPD');
  await expect(printPage.locator('body')).toContainText('Status: Open / admitted');
  await expect(printPage.locator('body')).toContainText('Includes: Reports / attachments');
});

test('global search finds records across clinic sections', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'csk-clinic-management-v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.demoDataVersion = 1;
    data.invoices = [{
      id: 'search-invoice',
      number: 'CSK-INV-SEARCH-1',
      patientId: 'patient-demo-1',
      date: '2026-11-18',
      total: 250,
      paid: 0,
      payments: [],
      items: [],
      createdAt: '2026-11-18T10:00:00.000Z',
    }];
    data.patients = [{
      id: 'patient-demo-1',
      code: 'CSK-2048',
      name: 'Aisha Nair',
      phone: '98765 43210',
      email: 'aisha@example.com',
      dob: '1992-06-18',
      gender: 'Female',
      bloodGroup: 'O+',
      status: 'Active',
      createdAt: '2026-11-18T10:00:00.000Z',
    }];
    data.appointments = [{
      id: 'appointment-demo-1',
      patientId: 'patient-demo-1',
      doctor: 'Dr. Meera Nair',
      department: 'Cardiology',
      date: '2026-11-19',
      time: '09:30',
      reason: 'Follow-up',
      status: 'Scheduled',
    }];
    data.medicines = [{
      id: 'medicine-demo-1',
      name: 'Amoxicillin 250 mg',
      category: 'Antibiotic',
      batch: 'AMX-2406',
      expiry: '2027-04-01',
      quantity: 18,
      reorder: 20,
      cost: 6,
      price: 9,
    }];
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();

  const search = page.locator('#globalSearch');
  await search.fill('AMX-2406');
  await expect(page.locator('#globalSearchResults [data-global-search-result]').first()).toContainText('Amoxicillin 250 mg');
  await page.locator('#globalSearchResults [data-global-search-result]').first().click();
  await expect(page.locator('#pharmacy')).toHaveClass(/active/);
  await expect(page.locator('#medicinesTable')).toContainText('Amoxicillin 250 mg');

  await search.fill('CSK-INV-SEARCH-1');
  await page.locator('#globalSearchResults [data-global-search-result]').first().click();
  await expect(page.locator('#billing')).toHaveClass(/active/);
  await expect(page.locator('#invoicesTable')).toContainText('CSK-INV-SEARCH-1');

  await search.fill('Aisha Nair');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.locator('#appointments')).toHaveClass(/active/);
  await expect(page.locator('#appointmentsTable')).toContainText('Aisha Nair');
});

test('daily collections use payment dates and dashboard reports print', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'csk-clinic-management-v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.demoDataVersion = 1;
    const asLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    data.invoices = [
      {
        id: 'paid-yesterday',
        number: 'CSK-INV-YESTERDAY',
        patientId: 'patient-demo-1',
        date: asLocalDate(yesterday),
        total: 100,
        paid: 100,
        payments: [{ amount: 100, date: `${asLocalDate(yesterday)}T12:00:00` }],
        items: [],
      },
      {
        id: 'paid-today',
        number: 'CSK-INV-TODAY',
        patientId: 'patient-demo-1',
        date: asLocalDate(yesterday),
        total: 200,
        paid: 50,
        payments: [{ amount: 50, date: today.toISOString() }],
        items: [],
      },
    ];
    data.medicines = [{
      id: 'report-low-stock',
      name: 'Report low stock item',
      category: 'Test',
      quantity: 1,
      reorder: 5,
      expiry: '',
    }];
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();

  await expect(page.locator('#todayRevenue')).toContainText('50');
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'Print report' }).click();
  await expect(page.locator('#printRoot')).toContainText('Clinic activity report');
  await expect(page.locator('#printRoot')).toContainText('Payments received in period');
  await page.getByRole('button', { name: 'Close preview' }).click();

  await page.getByRole('link', { name: 'Reports' }).click();
  const reportToday = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#reportFrom').fill(reportToday);
  await page.locator('#reportTo').fill(reportToday);
  await expect(page.locator('.report-period-presets button.active')).toHaveCount(0);
  await expect(page.locator('#reportInvoiceTotal')).toHaveText('₹0.00');
  await expect(page.locator('#reportPaidTotal')).toContainText('50');
  await expect(page.locator('#reportPaymentMethods')).toContainText('₹50.00');
  await expect(page.locator('#reportActivityTrend .report-trend-day')).toHaveCount(1);
  const reportDownloadPromise = page.waitForEvent('download');
  await page.locator('#reportExport').click();
  const reportDownload = await reportDownloadPromise;
  expect(reportDownload.suggestedFilename()).toMatch(/^csk-clinic-report-.*\.csv$/);
  const reportCsvPath = await reportDownload.path();
  if (!reportCsvPath) throw new Error('Clinic report CSV was not written to a temporary file.');
  const reportCsv = await readFile(reportCsvPath, 'utf8');
  expect(reportCsv).toContain('"Payments received in period"');
  expect(reportCsv).toContain('"Payment"');
  expect(reportCsv).toContain('"Inventory alert"');
  await page.getByRole('button', { name: 'Print report' }).click();
  await expect(page.locator('#printRoot')).toContainText('Outstanding on period invoices');
  await expect(page.locator('#printRoot')).toContainText('Payment register');
});
