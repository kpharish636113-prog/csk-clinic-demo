import { readFile } from 'node:fs/promises';
import { expect, test, type Route } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('overview navigation and patient registration work', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
  await expect(page.locator('#overview .welcome-row .muted')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await expect(page.getByRole('heading', { name: 'Register patient' })).toBeVisible();
  await expect(page.locator('#patientModal .patient-modal-description')).toHaveCSS('color', 'rgb(0, 0, 0)');

  await page.locator('#patientForm [name="firstName"]').fill('E2E History Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000099');
  await page.locator('#patientForm [name="dob"]').fill('1992-05-10');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: 'Save patient' }).click();

  await page.getByRole('link', { name: /Patients/ }).click();
  await expect(page.locator('#patientsTable').getByText('E2E History Patient')).toBeVisible();
});

test('sidebar collapses, expands, and remembers its state in both app copies', async ({ page }) => {
  for (const path of ['/index.html', '/apps/web/public/prototype/index.html']) {
    await page.goto(path);
    await page.evaluate(() => localStorage.removeItem('csk-clinic-sidebar-collapsed-v1'));
    await page.reload();

    const sidebar = page.locator('#sidebar');
    const main = page.locator('.main');
    const expandedWidth = await sidebar.evaluate((element) => getComputedStyle(element).width);
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toHaveCSS('width', '76px');
    await expect(main).toHaveCSS('margin-left', '76px');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await expect(sidebar).toHaveCSS('width', '76px');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(sidebar).toHaveCSS('width', expandedWidth);
    await expect(main).toHaveCSS('margin-left', expandedWidth);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#sidebarToggle')).toBeHidden();
    await expect(page.locator('#mobileMenu')).toBeVisible();
    await page.locator('#mobileMenu').click();
    await expect(sidebar).toHaveClass(/open/);
    await page.locator('#sidebar .nav-link[data-section="overview"]').click();
    await expect(sidebar).not.toHaveClass(/open/);
    await page.setViewportSize({ width: 1280, height: 720 });
  }
});

test('header notifications and account shortcuts work in both app copies', async ({ page }) => {
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html`);
    const notifications = page.getByRole('button', { name: 'Notifications' });
    await expect(notifications.locator('i')).toBeVisible();
    await notifications.click();
    await expect(page.locator('#notificationsPanel')).toBeVisible();
    await expect(page.locator('#notificationsPanel')).toContainText('Medicine inventory');
    await expect(page.locator('#notificationsPanel')).toContainText('Clinical supplies');

    await page.locator('#notificationsPanel [data-header-popover-action="pharmacy"]').click();
    await expect(page.locator('#pharmacy')).toHaveClass(/active/);
    await expect(notifications).toHaveAttribute('aria-expanded', 'false');

    const accountOptions = page.getByRole('button', { name: 'More account options' });
    await accountOptions.click();
    await expect(page.locator('#accountOptionsPanel')).toBeVisible();
    await page.locator('#accountOptionsPanel [data-header-popover-action="settings"]').click();
    await expect(page.locator('#settings')).toHaveClass(/active/);
    await expect(accountOptions).toHaveAttribute('aria-expanded', 'false');

    await notifications.click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#notificationsPanel')).toBeHidden();
    await expect(notifications).toBeFocused();
  }
});

test('notification panel surfaces upcoming appointment reminders for clinic staff', async ({ page }) => {
  const appointment = await page.evaluate(() => {
    const time = new Date(Date.now() + 60 * 60 * 1000);
    return {
      date: `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`,
      time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
    };
  });
  await page.evaluate((when) => {
    const key = 'csk-clinic-management-v1';
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    state.appointments = [...(state.appointments || []), {
      id: 'appointment-reminder-e2e',
      patientId: 'patient-demo-1',
      doctor: 'Dr. Reminder Test',
      date: when.date,
      time: when.time,
      status: 'Scheduled',
    }];
    localStorage.setItem(key, JSON.stringify(state));
  }, appointment);
  await page.reload();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.locator('#notificationsPanel')).toContainText('Upcoming appointments');
  await expect(page.locator('#notificationsPanel')).toContainText(/appointment.*in the next 24 hours/);
});

test('workspace switcher keeps dedicated workspaces easy to reach in both app copies', async ({ page }) => {
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html?workspace=front-office#patients`);
    await expect(page.locator('#activeWorkspaceName')).toHaveText('Front Office');
    await expect(page.locator('#workspaceSwitcherToggle')).toBeVisible();
    await page.locator('#workspaceSwitcherToggle').click();
    await expect(page.locator('#workspaceSwitcherMenu')).toBeVisible();
    await page.locator('#doctorWorkspaceOption').click();
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=doctor#doctor$`));
    await expect(page.locator('#doctor')).toHaveClass(/active/);
    await expect(page.locator('#activeWorkspaceName')).toHaveText('Doctor Workspace');
    await expect(page.locator('#workspaceSwitcherToggle')).toBeVisible();
    await expect(page.locator('#doctorApiConnectButton')).toBeVisible();

    await page.locator('#workspaceSwitcherToggle').click();
    await page.locator('#workspaceSwitcherMenu [data-workspace-url="front-office.html"]').click();
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=front-office#patients$`));
    await expect(page.locator('#patients')).toHaveClass(/active/);
    await expect(page.locator('#activeWorkspaceName')).toHaveText('Front Office');

    await page.locator('#workspaceSwitcherToggle').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#workspaceSwitcherMenu')).toBeHidden();
  }
});

test('pharmacy sidebar opens the dashboard and its inventory, sales, and POS tabs', async ({ page }) => {
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html`);
    await page.getByRole('link', { name: 'Pharmacy' }).click();

    await expect(page.locator('#pharmacyDashboard')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pharmacy — Overview' })).toBeVisible();
    await expect(page.locator('#pharmacyTotalMedicines')).not.toHaveText('0');

    await page.locator('#pharmacy [data-pharmacy-tab="inventory"]').first().click();
    await expect(page.locator('#pharmacyInventory')).toBeVisible();
    await expect(page.locator('#medicinesTable')).toContainText('Amoxicillin 250 mg');

    await page.locator('#pharmacy [data-pharmacy-tab="sales"]').first().click();
    await expect(page.locator('#pharmacySales')).toBeVisible();
    await expect(page.locator('#pharmacySalesCount')).not.toHaveText('');

    await page.locator('#pharmacy [data-pharmacy-tab="pos"]').first().click();
    await expect(page.locator('#pharmacyPos')).toBeVisible();
    await expect(page.getByPlaceholder('Search patient by name / mobile / UHID')).toBeVisible();
    await expect(page.getByRole('button', { name: '℞ Load prescription' })).toBeVisible();
    await expect(page.locator('#pharmacyPosCollect')).toBeDisabled();
  }
});

test('each pharmacy report card prints its matching report in both app copies', async ({ page }) => {
  const reportCases = [
    ['overall', 'Overall Pharmacy Report', 'Current medicine stock'],
    ['sales', 'Sales Register', 'Medicine sales register'],
    ['profit', 'Profit & Loss', 'Product profitability'],
    ['stock', 'Stock Statement', 'Current medicine stock'],
    ['expiry', 'Expiry Report', 'Expired or expiring medicine batches'],
    ['purchases', 'Purchase Register', 'Purchase orders'],
    ['suppliers', 'Supplier Ledger', 'Supplier directory and purchase history'],
    ['gst', 'GST Summary', 'Medicine tax summary'],
    ['customers', 'Customer Report', 'Medicine purchase history'],
  ];
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html`);
    await page.getByRole('link', { name: 'Pharmacy' }).click();
    await page.locator('#pharmacy [data-pharmacy-tab="reports"]').first().click();
    await expect(page.locator('#pharmacyReports')).toBeVisible();
    await expect(page.locator('[data-pharmacy-report-print]')).toHaveCount(reportCases.length);
    await page.evaluate(() => { window.print = () => {}; });

    for (const [type, title, section] of reportCases) {
      await page.locator(`[data-pharmacy-report-print="${type}"]`).click();
      await expect(page.locator('#printRoot')).toContainText(title);
      await expect(page.locator('#printRoot')).toContainText(section);
      await page.getByRole('button', { name: 'Print report' }).last().click();
      await page.getByRole('button', { name: 'Close preview' }).click();
    }
  }
});

test('collapsed Doctor sidebar keeps search controls within its width', async ({ page }) => {
  await page.goto('/index.html?workspace=doctor#doctor');
  await page.evaluate(() => localStorage.setItem('csk-clinic-sidebar-collapsed-v1', 'true'));
  await page.reload();

  const sidebar = page.locator('#sidebar');
  await expect(sidebar).toHaveCSS('width', '76px');
  await expect(page.locator('#doctorSearchGoogle')).toBeVisible();
  await expect(page.locator('#doctorSearchChatGPT')).toBeVisible();
  const overflowingSidebarItems = await page.evaluate(() => {
    const sidebarBounds = document.querySelector('#sidebar')!.getBoundingClientRect();
    return [...document.querySelectorAll('#doctorWorkspaceNav, #doctorSearchNav, #doctorSearchGoogle, #doctorSearchChatGPT')]
      .filter((element) => element.getBoundingClientRect().right > sidebarBounds.right + 1)
      .map((element) => element.id);
  });
  expect(overflowingSidebarItems).toEqual([]);
});

test('dedicated front office and doctor pages restrict navigation in both app copies', async ({ page }) => {
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}front-office.html`);
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=front-office#patients$`));
    await expect(page.locator('body')).toHaveClass(/workspace-front-office/);
    await expect(page.locator('#patients')).toBeVisible();
    await expect(page.locator('#doctor')).toBeHidden();
    await expect(page.locator('#doctorWorkspaceNav')).toBeHidden();
    await expect(page.locator('#workspaceSwitcherToggle')).toBeVisible();
    await page.locator('#workspaceSwitcherToggle').click();
    await page.locator('#doctorWorkspaceOption').click();
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=doctor#doctor$`));

    await page.goto(`${basePath}index.html?workspace=front-office#doctor`);
    await expect(page.locator('#patients')).toHaveClass(/active/);
    await expect(page.locator('#doctor')).toBeHidden();

    await page.goto(`${basePath}doctor-workspace.html`);
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=doctor#doctor$`));
    await expect(page.locator('body')).toHaveClass(/workspace-doctor/);
    await expect(page.locator('#doctor')).toBeVisible();
    await expect(page.locator('#patients')).toBeHidden();
    await expect(page.locator('#appointments')).toBeHidden();
    await expect(page.locator('#doctorWorkspaceNav')).toBeVisible();
    await expect(page.locator('#workspaceSwitcherToggle')).toBeVisible();
    await expect(page.locator('#doctorApiConnectButton')).toBeVisible();

    await page.goto(`${basePath}index.html?workspace=doctor#patients`);
    await expect(page.locator('#doctor')).toHaveClass(/active/);
    await expect(page.locator('#patients')).toBeHidden();
  }
});

test('legacy management URLs open the supported clinic workspace in both app copies', async ({ page }) => {
  const routes = [
    ['patient_management.html', 'index.html?workspace=front-office#patients', 'patients'],
    ['appointment_management.html', 'index.html?workspace=front-office#appointments', 'appointments'],
    ['file_admin.html', 'index.html#overview', 'overview'],
  ];

  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    for (const [legacyPage, destination, activeView] of routes) {
      await page.goto(`${basePath}${legacyPage}`);
      await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expect(page.locator(`#${activeView}`)).toHaveClass(/active/);
    }
  }
});

test('doctor-only page shows an access-denied message for non-doctor API roles', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Unauthorized' }),
  }));
  await page.addInitScript(() => {
    localStorage.setItem('csk-clinic-api-token', 'test-token');
    localStorage.setItem('csk-clinic-api-user', JSON.stringify({ role: 'RECEPTIONIST' }));
  });
  await page.goto('/index.html?workspace=doctor#doctor');

  await expect(page.getByRole('heading', { name: 'Doctor Workspace access required' })).toBeVisible();
  await expect(page.locator('#workspaceAccessDenied')).toBeVisible();
  await expect(page.locator('#doctor')).toBeHidden();
});

test('doctor sidebar opens Google and ChatGPT searches in separate windows', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeOpen = window.open.bind(window);
    window.open = (url, target, features) => {
      localStorage.setItem('clinic-search-window-features', String(features || ''));
      return nativeOpen(url, target, features);
    };
  });
  await page.context().route('https://www.google.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<title>Google test results</title>',
  }));
  await page.context().route('https://chatgpt.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<title>ChatGPT test page</title>',
  }));

  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html?workspace=doctor#doctor`);
    await expect(page.locator('#doctorWebSearch')).toHaveCount(0);
    await expect(page.locator('#doctorSearchNav')).toBeVisible();
    await expect(page.locator('#doctorSearchGoogle')).toBeVisible();
    await expect(page.locator('#doctorSearchChatGPT')).toBeVisible();

    const googlePopupPromise = page.waitForEvent('popup');
    await page.locator('#doctorSearchGoogle').click();
    const googlePopup = await googlePopupPromise;
    await expect(googlePopup).toHaveURL('https://www.google.com/');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('clinic-search-window-features') || ''))
      .toMatch(/popup=yes.*left=\d+/);
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=doctor#doctor$`));
    await expect(page.locator('#doctor')).toBeVisible();
    await googlePopup.close();

    const chatGptPopupPromise = page.waitForEvent('popup');
    await page.locator('#doctorSearchChatGPT').click();
    const chatGptPopup = await chatGptPopupPromise;
    await expect(chatGptPopup).toHaveURL('https://chatgpt.com/');
    await expect(page.locator('#doctor')).toBeVisible();
    await chatGptPopup.close();
  }
});

test('workspace selector opens read-only doctor medicines and Front Office stock views', async ({ page }) => {
  for (const basePath of ['/', '/apps/web/public/prototype/']) {
    await page.goto(`${basePath}index.html?workspace=doctor#doctor`);
    await page.locator('#workspaceSwitcherToggle').click();
    await expect(page.locator('#doctorMedicinesOption')).toBeVisible();
    await page.locator('#doctorMedicinesOption').click();

    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=doctor#pharmacy$`));
    await expect(page.locator('#pharmacy')).toHaveClass(/active/);
    await expect(page.locator('#pharmacy h1')).toHaveText('Medicines');
    await expect(page.locator('#addMedicineButton')).toBeHidden();
    await expect(page.locator('#pharmacy table th').nth(5)).toBeHidden();
    await expect(page.locator('#pharmacy table th').nth(7)).toBeHidden();

    await page.locator('#workspaceSwitcherToggle').click();
    await page.locator('#workspaceSwitcherMenu [data-workspace-url="index.html?workspace=front-office#pharmacy"]').click();
    await expect(page).toHaveURL(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}index\\.html\\?workspace=front-office#pharmacy$`));
    await page.locator('#pharmacy [data-pharmacy-tab="inventory"]').first().click();
    await expect(page.locator('#pharmacy h1')).toHaveText('Inventory & Stock');
    await expect(page.locator('#addMedicineButton')).toBeVisible();
  }
});

test('patient IDs are sequential, stable on edits, and not reused after deletion', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await expect(page.locator('#patientCodePreview')).toHaveText('A01 · preview');
  await page.locator('#patientForm [name="firstName"]').fill('E2E Sequential Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000098');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');
  await page.getByRole('button', { name: 'Save patient' }).click();

  const patientRow = page.locator('#patientsTable tr', { hasText: 'E2E Sequential Patient' });
  await expect(patientRow).toContainText('A01');
  await page.locator('#patientSearch').fill('A01');
  await expect(patientRow).toBeVisible();
  await page.locator('#patientSearch').fill('');
  await patientRow.locator('[data-edit-patient]').click();
  await expect(page.locator('#patientCodePreview')).toHaveText('A01');
  await page.locator('#patientForm').getByRole('button', { name: 'Save patient' }).click();

  await page.evaluate(() => {
    const storageKey = 'csk-clinic-management-v1';
    const records = JSON.parse(localStorage.getItem(storageKey) || '{}');
    records.patients = records.patients.filter((patient: { code: string }) => patient.code !== 'A01');
    localStorage.setItem(storageKey, JSON.stringify(records));
  });
  await page.reload();
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await expect(page.locator('#patientCodePreview')).toHaveText('A02 · preview');
});

test('demo data upgrade adds complete patient charts without overwriting local records', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('csk-clinic-management-v1', JSON.stringify({
      demoDataVersion: 1,
      patients: [
        {
          id: 'patient-demo-1',
          code: 'CSK-2048',
          name: 'Aisha Nair',
          phone: '98765 43210',
          address: 'Custom saved address',
          allergies: 'User-entered allergy',
          status: 'Active',
        },
        {
          id: 'patient-user-1',
          code: 'CSK-9999',
          name: 'Local User',
          phone: '9000000001',
          status: 'Active',
        },
      ],
      patientVitals: [{ id: 'vital-user-1', patientId: 'patient-user-1' }],
      patientRecords: [{ id: 'visit-user-1', patientId: 'patient-user-1', diagnosis: 'User-entered visit' }],
      patientHistoryRecords: [
        {
          patientId: 'patient-demo-1',
          medicalConditions: [],
          familyHistoryMembers: [],
          personalHistory: null,
          femaleHistory: null,
        },
        {
          patientId: 'patient-user-1',
          medicalConditions: [{ id: 'condition-user-1', condition: 'User-entered condition' }],
          familyHistoryMembers: [],
          personalHistory: null,
          femaleHistory: null,
        },
      ],
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await page.locator('#patientForm [name="firstName"]').fill('Migration Save Check');
  await page.locator('#patientForm [name="phone"]').fill('9000000097');
  await page.locator('#patientForm [name="gender"]').selectOption('Male');
  await page.getByRole('button', { name: 'Save patient' }).click();

  const savedData = await page.evaluate(() => JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}'));
  expect(savedData.demoDataVersion).toBe(2);
  expect(savedData.patientVitals).toHaveLength(15);
  expect(savedData.patientRecords).toHaveLength(15);
  expect(savedData.patientHistoryRecords).toHaveLength(8);
  for (let number = 1; number <= 7; number += 1) {
    const patientId = `patient-demo-${number}`;
    expect(savedData.patientVitals.filter((record: { patientId: string }) => record.patientId === patientId)).toHaveLength(2);
    expect(savedData.patientRecords.filter((record: { patientId: string }) => record.patientId === patientId)).toHaveLength(2);
    expect(savedData.patientHistoryRecords.some((history: { patientId: string }) => history.patientId === patientId)).toBe(true);
  }
  expect(savedData.patients.find((patient: { id: string }) => patient.id === 'patient-demo-1')).toMatchObject({
    address: 'Custom saved address',
    allergies: 'User-entered allergy',
    currentMedications: 'Amlodipine 5 mg once daily (sample).',
  });
  expect(savedData.patients.find((patient: { id: string }) => patient.id === 'patient-user-1').name).toBe('Local User');
  expect(savedData.patientRecords.find((record: { id: string }) => record.id === 'visit-user-1').diagnosis).toBe('User-entered visit');
  expect(savedData.patientHistoryRecords.find((history: { patientId: string }) => history.patientId === 'patient-user-1').medicalConditions[0].condition)
    .toBe('User-entered condition');
  expect(savedData.patientHistoryRecords.find((history: { patientId: string }) => history.patientId === 'patient-demo-1').medicalConditions[0].condition)
    .toBe('Hypertension');

  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' }).getByRole('button', { name: 'View' }).click();
  const profile = page.locator('#patientProfileContent');
  await profile.getByRole('tab', { name: 'Medical history' }).click();
  await expect(profile).toContainText('Hypertension');
  await profile.getByRole('tab', { name: 'Vitals' }).click();
  await expect(profile.locator('.patient-vitals-history-table tbody tr')).not.toHaveCount(0);
  await expect(profile.locator('.patient-vitals-history-table tbody tr')).toHaveCount(4);
});

test('medical history choices keep checkboxes aligned and inside the form', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' }).getByRole('button', { name: 'View' }).click();
  const profile = page.locator('#patientProfileContent');
  await profile.getByRole('tab', { name: 'Medical history' }).click();

  const form = profile.locator('[data-patient-history-form="condition"]');
  const checkbox = form.locator('.history-choice-grid input[type="checkbox"]').first();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const labelLayout = await checkbox.evaluate((checkboxInput) => {
      const label = checkboxInput.closest('label')!;
      const text = label.querySelector('span');
      const inputBounds = checkboxInput.getBoundingClientRect();
      const textBounds = text!.getBoundingClientRect();
      return {
        inputWidth: inputBounds.width,
        inputHeight: inputBounds.height,
        textGap: textBounds.left - inputBounds.right,
        formWidth: label.closest('form')!.clientWidth,
        formScrollWidth: label.closest('form')!.scrollWidth,
      };
    });
    expect(labelLayout.inputWidth).toBe(16);
    expect(labelLayout.inputHeight).toBe(16);
    expect(labelLayout.textGap).toBeGreaterThanOrEqual(0);
    expect(labelLayout.textGap).toBeLessThan(12);
    expect(labelLayout.formScrollWidth).toBeLessThanOrEqual(labelLayout.formWidth);
  }
});

test('patient directory exports the currently filtered patients as CSV', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientSearch').fill('Aisha Nair');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^csk-patient-directory-.*\.csv$/);
  const csvPath = await download.path();
  if (!csvPath) throw new Error('Patient directory CSV was not written to a temporary file.');
  const csv = await readFile(csvPath, 'utf8');
  expect(csv).toContain('"Aisha Nair"');
  expect(csv).not.toContain('"Rohan Mehta"');
  await expect(page.locator('#toast')).toHaveText('1 patient record exported.');
});

test('prescription empty state ignores whitespace-only current medication notes', async ({ page }) => {
  await page.getByRole('button', { name: '＋ Register patient' }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Persistence Trigger');
  await page.locator('#patientForm [name="phone"]').fill('9000000098');
  await page.locator('#patientForm [name="dob"]').fill('1992-05-10');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.getByRole('button', { name: 'Save patient' }).click();

  await page.evaluate(() => {
    const storageKey = 'csk-clinic-management-v1';
    const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const patient = state.patients?.find((item: { code: string }) => item.code === 'CSK-1880');
    if (!patient) throw new Error('Expected seeded patient was not found.');
    patient.currentMedications = '   ';
    localStorage.setItem(storageKey, JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Pooja Iyer' }).getByRole('button', { name: 'View' }).click();
  await page.getByRole('tab', { name: 'Prescriptions' }).click();

  const profile = page.locator('#patientProfileContent');
  await expect(profile).toContainText('No prescription history');
  await expect(profile).toContainText('No prescribed medicines have been recorded.');
  await expect(profile).not.toContainText('Recorded current medicines:');
});

test('display preferences persist and full screen toggles on and off', async ({ page }) => {
  const increaseFontSize = page.getByRole('button', { name: 'Increase font size' });
  const fullscreenToggle = page.locator('#fullscreenToggle');
  await expect(fullscreenToggle).toBeHidden();
  await increaseFontSize.click();
  await increaseFontSize.click();
  await expect.poll(() => page.locator('.app').evaluate((app) => getComputedStyle(app).zoom)).toBe('1.2');
  await expect(page.locator('#fontSizeValue')).toHaveText('120%');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('csk-clinic-ui-font-scale-v1'))).toBe('1.2');

  await page.reload();
  await expect.poll(() => page.locator('.app').evaluate((app) => getComputedStyle(app).zoom)).toBe('1.2');
  await page.setViewportSize({ width: 360, height: 844 });
  const mobilePageFits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(mobilePageFits).toBe(true);
  const decreaseFontSize = page.getByRole('button', { name: 'Decrease font size' });
  await decreaseFontSize.click();
  await expect.poll(() => page.locator('.app').evaluate((app) => getComputedStyle(app).zoom)).toBe('1.1');
  await increaseFontSize.click();

  await page.goto('/index.html?workspace=front-office#patients');
  await expect(page.locator('#patients')).toBeVisible();
  await expect(fullscreenToggle).toBeVisible();
  await fullscreenToggle.click();
  await expect(fullscreenToggle).toHaveAttribute('aria-label', 'Exit full screen');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await fullscreenToggle.click();
  await expect(fullscreenToggle).toHaveAttribute('aria-label', 'Enter full screen');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/index.html?workspace=doctor#doctor');
  await expect(page.locator('#doctor')).toBeVisible();
  await expect(increaseFontSize).toBeVisible();
  await expect(page.locator('#fontSizeValue')).toHaveText('120%');
  await decreaseFontSize.click();
  await expect(page.locator('#fontSizeValue')).toHaveText('110%');
  await increaseFontSize.click();

  await expect(fullscreenToggle).toBeVisible();
  await fullscreenToggle.click();
  await expect(fullscreenToggle).toHaveAttribute('aria-label', 'Exit full screen');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await fullscreenToggle.click();
  await expect(fullscreenToggle).toHaveAttribute('aria-label', 'Enter full screen');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
});

test('font size plus and minus controls stop at 10% and 200%', async ({ page }) => {
  const decreaseFontSize = page.getByRole('button', { name: 'Decrease font size' });
  const increaseFontSize = page.getByRole('button', { name: 'Increase font size' });

  for (let step = 0; step < 9; step += 1) await decreaseFontSize.click();
  await expect(page.locator('#fontSizeValue')).toHaveText('10%');
  await expect(decreaseFontSize).toBeDisabled();
  await expect.poll(() => page.locator('.app').evaluate((app) => getComputedStyle(app).zoom)).toBe('0.1');

  for (let step = 0; step < 19; step += 1) await increaseFontSize.click();
  await expect(page.locator('#fontSizeValue')).toHaveText('200%');
  await expect(increaseFontSize).toBeDisabled();
  await expect.poll(() => page.locator('.app').evaluate((app) => getComputedStyle(app).zoom)).toBe('2');
});

test('reception check-in creates one visit per queue entry for walk-ins and appointments', async ({ page }) => {
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.locator('#checkInForm [name="reason"]').fill('Walk-in check-in verification');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  const walkInRow = page.locator('#patientQueueTable tr', { hasText: 'Rohan Mehta' });
  await expect(walkInRow.locator('.patient-queue-token')).toHaveText('T1');
  await expect(walkInRow).toContainText('Waiting');
  await walkInRow.getByRole('button', { name: 'Call' }).click();
  await expect(walkInRow).toContainText('Called');

  const appointmentRow = page.locator('#appointmentsTable tr', { hasText: 'Aisha Nair' })
    .filter({ hasText: 'Blood pressure follow-up' });
  await appointmentRow.getByRole('button', { name: 'Check in' }).click();
  await expect(page.locator('#checkInPatient')).toHaveValue('patient-demo-1');
  await expect(page.locator('#checkInDoctor')).toHaveValue('Dr. Meera Nair');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  const appointmentQueueRow = page.locator('#patientQueueTable tr', { hasText: 'Aisha Nair' });
  await expect(appointmentQueueRow.locator('.patient-queue-token')).toHaveText('T2');
  await expect(appointmentRow).toContainText('Checked in');

  const savedQueueEntries = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return {
      queueTokens: saved.queueTokens || [],
      patientRecords: saved.patientRecords || [],
      appointments: saved.appointments || [],
    };
  });
  expect(savedQueueEntries.queueTokens).toHaveLength(2);
  for (const queueEntry of savedQueueEntries.queueTokens) {
    expect(savedQueueEntries.patientRecords.some((visit: { id: string; patientId: string }) =>
      visit.id === queueEntry.encounterId && visit.patientId === queueEntry.patientId)).toBe(true);
  }
  expect(savedQueueEntries.appointments.find((appointment: { id: string }) =>
    appointment.id === 'appointment-demo-1')?.status).toBe('Checked in');
});

test('patient vitals convert units, calculate BMI, and persist per visit', async ({ page }) => {
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  await page.getByRole('link', { name: /Patients/ }).click();
  const patientRow = page.locator('#patientsTable tr', { hasText: 'Rohan Mehta' });
  await patientRow.getByRole('button', { name: 'View' }).click();
  await page.getByRole('tab', { name: 'Vitals' }).click();

  const form = page.locator('#patientVitalsForm');
  const encounterId = await form.locator('[name="encounterId"]').inputValue();
  await form.locator('[name="temperatureValue"]').fill('38');
  await expect(form.locator('#patientVitalsTemperaturePreview')).toHaveText('38 °C = 100.4 °F');
  await form.locator('[name="temperatureUnit"]').selectOption('FAHRENHEIT');
  await form.locator('[name="temperatureValue"]').fill('98.6');
  await expect(form.locator('#patientVitalsTemperaturePreview')).toHaveText('98.6 °F = 37 °C');
  await form.locator('[name="temperatureUnit"]').selectOption('CELSIUS');
  await form.locator('[name="temperatureValue"]').fill('37');
  await form.locator('[name="heightCm"]').fill('170');
  await form.locator('[name="weightKg"]').fill('68');
  await expect(form.locator('#patientVitalsBmiPreview')).toHaveText('Calculated BMI: 23.53');

  await form.locator('[name="systolicMmHg"]').fill('120');
  await form.locator('[name="diastolicMmHg"]').fill('80');
  await form.locator('[name="pulseBpm"]').fill('84');
  await form.locator('[name="spo2Percent"]').fill('98');
  await form.locator('[name="cbgMgDl"]').fill('105');
  await form.getByRole('button', { name: 'Save vitals to visit' }).click();

  await form.locator('[name="respiratoryRateBpm"]').fill('17');
  await form.getByRole('button', { name: 'Save vitals to visit' }).click();
  await expect(page.locator('.patient-vitals-history-table')).toContainText('120/80');
  await expect(page.locator('.patient-vitals-history-table')).toContainText('23.53');
  const patientVitalsChart = page.locator('.patient-vitals-chart').first().locator('svg');
  await expect(patientVitalsChart).toHaveAttribute('aria-label', /line history graph/);
  await page.getByRole('button', { name: 'Bar graph' }).click();
  await expect(patientVitalsChart).toHaveAttribute('aria-label', /bar history graph/);
  await expect(patientVitalsChart.locator('rect').first()).toBeVisible();
  const savedVitals = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return (saved.patientVitals || []).filter((record: { patientId: string }) => record.patientId === 'patient-demo-2');
  });
  const sameVisitReadings = savedVitals.filter((record: { encounterId: string }) => record.encounterId === encounterId);
  expect(sameVisitReadings).toHaveLength(2);
  expect(new Set(sameVisitReadings.map((record: { id: string }) => record.id)).size).toBe(2);
  expect(sameVisitReadings.find((record: { respiratoryRateBpm?: number }) => record.respiratoryRateBpm === 17)).toBeTruthy();
  expect(savedVitals.find((record: { systolicMmHg: number }) => record.systolicMmHg === 120)).toMatchObject({
    patientId: 'patient-demo-2',
    systolicMmHg: 120,
    diastolicMmHg: 80,
    temperatureC: 37,
    temperatureF: 98.6,
    heightCm: 170,
    weightKg: 68,
    bmi: 23.53,
  });
});

test('front office check-in saves converted vitals to the doctor workspace', async ({ page }) => {
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  const form = page.locator('#checkInForm');
  await form.locator('[name="systolicMmHg"]').fill('120');
  await form.locator('[name="diastolicMmHg"]').fill('80');
  await form.locator('[name="respiratoryRateBpm"]').fill('18');
  await form.locator('[name="temperatureUnit"]').selectOption('FAHRENHEIT');
  await form.locator('[name="temperatureValue"]').fill('98.6');
  await form.locator('[name="heightUnit"]').selectOption('FEET_INCHES');
  await form.locator('[name="heightFeet"]').fill('5');
  await form.locator('[name="heightInches"]').fill('8');
  await form.locator('[name="weightUnit"]').selectOption('POUNDS');
  await form.locator('[name="weightValue"]').fill('150');
  await expect(form.locator('#checkInBmi')).not.toHaveText('—');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  const workspace = page.locator('#doctorWorkspacePatient');
  await expect(workspace).toContainText('Front office registration & assignment');
  await expect(workspace).toContainText('18 breaths/min');
  await expect(workspace).toContainText('120/80');
  await expect(workspace).toContainText('Vitals history & trends');

  const savedVitals = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return (saved.patientVitals || []).find((record: { respiratoryRateBpm?: number }) => record.respiratoryRateBpm === 18);
  });
  expect(savedVitals).toMatchObject({
    respiratoryRateBpm: 18,
    systolicMmHg: 120,
    diastolicMmHg: 80,
    temperatureC: 37,
    temperatureF: 98.6,
  });
  expect(savedVitals.heightCm).toBeCloseTo(172.72, 1);
  expect(savedVitals.weightKg).toBeCloseTo(68.04, 1);
});

test('front office check-in rejects out-of-range readings without misleading conversions', async ({ page }) => {
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });

  const form = page.locator('#checkInForm');
  await form.locator('[name="reason"]').fill('Invalid vitals must not be saved');
  await form.locator('[name="heightValue"]').fill('1222');
  await form.locator('[name="heightUnit"]').selectOption('FEET_INCHES');
  await form.locator('[name="heightFeet"]').fill('5');
  await form.locator('[name="heightInches"]').fill('8');
  const activeHeightValidity = await form.evaluate((element) => {
    const formElement = element as HTMLFormElement;
    return {
      centimetersDisabled: (formElement.elements.namedItem('heightValue') as HTMLInputElement).disabled,
      valid: formElement.checkValidity(),
    };
  });
  expect(activeHeightValidity).toEqual({ centimetersDisabled: true, valid: true });

  await form.locator('[name="pulseBpm"]').fill('84');
  await form.locator('[name="diastolicMmHg"]').fill('1221');
  await form.locator('[name="temperatureValue"]').fill('1222');
  await form.locator('[name="spo2Percent"]').fill('122');
  await form.locator('[name="weightValue"]').fill('1222');

  await expect(form.locator('[data-vital-status="diastolicMmHg"]')).toHaveText('Check value');
  await expect(form.locator('[data-vital-status="temperatureC"]')).toHaveText('Check value');
  await expect(form.locator('[data-vital-status="spo2Percent"]')).toHaveText('Check value');
  await expect(form.locator('[data-vital-status="weightKg"]')).toHaveText('Check value');
  await expect(form.locator('[data-vital-status="bmi"]')).toHaveText('Check inputs');
  await expect(form.locator('#checkInBmi')).toHaveText('—');
  await expect(form.locator('#checkInTemperatureConversion')).toHaveText('Check value.');
  await expect(form.locator('#checkInWeightConversion')).toHaveText('Check value.');
  await expect(form.locator('#checkInVitalReferenceNotice')).toContainText('No clinic-approved reference ranges');
  await expect(form.locator('[data-vital-status="pulseBpm"]')).toBeHidden();

  const inputLimits = await form.evaluate((element) => {
    const formElement = element as HTMLFormElement;
    return {
      temperatureMax: (formElement.elements.namedItem('temperatureValue') as HTMLInputElement).max,
      weightMax: (formElement.elements.namedItem('weightValue') as HTMLInputElement).max,
      valid: formElement.checkValidity(),
    };
  });
  expect(inputLimits).toEqual({ temperatureMax: '60', weightMax: '1000', valid: false });

  await form.locator('[name="temperatureUnit"]').selectOption('FAHRENHEIT');
  await form.locator('[name="weightUnit"]').selectOption('POUNDS');
  const convertedUnitLimits = await form.evaluate((element) => {
    const formElement = element as HTMLFormElement;
    return {
      temperatureMin: (formElement.elements.namedItem('temperatureValue') as HTMLInputElement).min,
      temperatureMax: (formElement.elements.namedItem('temperatureValue') as HTMLInputElement).max,
      weightMax: (formElement.elements.namedItem('weightValue') as HTMLInputElement).max,
    };
  });
  expect(convertedUnitLimits).toEqual({ temperatureMin: '32', temperatureMax: '140', weightMax: '2204.62' });

  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();
  await expect(page.locator('#checkInModal')).toBeVisible();
  const invalidCheckIn = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return (saved.queueTokens || []).some((entry: { reason: string }) =>
      entry.reason === 'Invalid vitals must not be saved');
  });
  expect(invalidCheckIn).toBe(false);
});

test('new patient registration continues directly into doctor assignment', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Front Office');
  await page.locator('#patientForm [name="lastName"]').fill('Workflow');
  await page.locator('#patientForm [name="phone"]').fill('9000000096');
  await page.locator('#patientForm [name="dob"]').fill('1990-04-12');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.locator('#patientForm [name="address"]').fill('12 Demo Street');
  await page.getByRole('button', { name: 'Save & assign doctor' }).click();

  await expect(page.locator('#checkInModal')).toBeVisible();
  const patientId = await page.locator('#checkInPatient').inputValue();
  expect(patientId).toBeTruthy();
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.locator('#checkInForm [name="respiratoryRateBpm"]').fill('16');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  const workspace = page.locator('#doctorWorkspacePatient');
  await expect(workspace).toContainText('E2E Front Office Workflow');
  await expect(workspace).toContainText('16 breaths/min');
  await expect(workspace).toContainText('12 Demo Street');
});

test('public prototype copy renders the reception check-in queue', async ({ page }) => {
  await page.goto('/apps/web/public/prototype/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/apps/web/public/prototype/index.html#appointments');
  await page.reload();
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();
  await expect(page.locator('#patientQueueTable tr', { hasText: 'Rohan Mehta' })).toContainText('T1');
});

test('public prototype records patient vitals against the active visit', async ({ page }) => {
  await page.goto('/apps/web/public/prototype/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/apps/web/public/prototype/index.html#appointments');
  await page.reload();
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Rohan Mehta' }).getByRole('button', { name: 'View' }).click();
  await page.getByRole('tab', { name: 'Vitals' }).click();
  const form = page.locator('#patientVitalsForm');
  const encounterId = await form.locator('[name="encounterId"]').inputValue();
  await form.locator('[name="heightCm"]').fill('180');
  await form.locator('[name="weightKg"]').fill('75');
  await expect(form.locator('#patientVitalsBmiPreview')).toHaveText('Calculated BMI: 23.15');
  await form.locator('[name="temperatureUnit"]').selectOption('FAHRENHEIT');
  await form.locator('[name="temperatureValue"]').fill('98.6');
  await form.getByRole('button', { name: 'Save vitals to visit' }).click();
  await form.locator('[name="respiratoryRateBpm"]').fill('17');
  await form.getByRole('button', { name: 'Save vitals to visit' }).click();
  await expect(page.locator('.patient-vitals-history-table')).toContainText('37 °C / 98.6 °F');
  const readingsForVisit = await page.evaluate((activeEncounterId) => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return (saved.patientVitals || []).filter((record: { encounterId: string }) => record.encounterId === activeEncounterId);
  }, encounterId);
  expect(readingsForVisit).toHaveLength(2);
});

test('doctor workspace receives check-ins and saves consultation history', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not create the camera test image.');
          context.fillStyle = '#4c8b83';
          context.fillRect(0, 0, canvas.width, canvas.height);
          return canvas.captureStream(10);
        },
      },
    });
  });
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.locator('#checkInForm [name="reason"]').fill('Headache and fever');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  await expect(page.locator('#doctorWorkspaceQueue')).toContainText('Rohan Mehta');
  await expect(page.locator('#doctorQueueCounts')).toContainText('1 waiting');
  await expect(page.locator('#doctorDashboard')).toBeHidden();
  await page.locator('#doctorDashboardNav').click();
  await expect(page.locator('#doctorDashboard')).toBeVisible();
  await expect(page.locator('#doctorKpiAssigned')).not.toHaveText('—');
  await expect(page.locator('#doctorHourlyArrivals')).toBeVisible();
  await expect(page.locator('#doctorStatusDistribution')).toBeVisible();
  const dashboardTextColors = await page.locator('#doctorDashboard').evaluate((dashboard) =>
    [...dashboard.querySelectorAll('p, small, span, .doctor-chart-label')]
      .map((element) => getComputedStyle(element).color),
  );
  expect(new Set(dashboardTextColors)).toEqual(new Set(['rgb(0, 0, 0)']));
  await page.locator('#doctorWorkspaceNav').click();
  await expect(page.locator('#doctor .doctor-workspace-layout')).toHaveCSS('display', 'grid');
  await expect(page.locator('#doctor .doctor-queue-item')).toHaveCSS('border-radius', '10px');
  await expect(page.locator('#doctor .doctor-queue-item.active')).toContainText('Rohan Mehta');
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('Rohan Mehta');
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('Headache and fever');
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('Osteoarthritis');
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('Family medical history');
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('Age at diagnosis: 62');
  const doctorVitalsTrends = page.locator('#doctorWorkspacePatient .doctor-vitals-history');
  const doctorVitalsTrendGrid = doctorVitalsTrends.locator('.doctor-vitals-trend-grid');
  await expect(doctorVitalsTrendGrid).not.toBeVisible();
  await doctorVitalsTrends.locator('summary').click();
  await expect(doctorVitalsTrendGrid).toBeVisible();
  await expect(doctorVitalsTrendGrid.locator('svg').first()).toHaveAttribute('aria-label', /line trend/);
  await doctorVitalsTrends.getByRole('button', { name: 'Bar graph' }).click();
  await expect(doctorVitalsTrendGrid.locator('svg').first()).toHaveAttribute('aria-label', /bar trend/);
  await page.getByRole('button', { name: 'Call patient' }).click();
  await expect(page.locator('#doctor .doctor-queue-item.active')).toContainText('Called');
  await page.getByRole('button', { name: 'Start consultation' }).click();
  await expect(page.locator('#consultationPrescriptionModal')).toBeVisible();
  const prescriptionModalBounds = await page.locator('#consultationPrescriptionModal').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const sidebarWidth = window.innerWidth > 820
      ? document.querySelector('.sidebar')?.getBoundingClientRect().width || 0
      : 0;
    return {
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
      sidebarWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(prescriptionModalBounds.left).toBe(prescriptionModalBounds.sidebarWidth);
  expect(prescriptionModalBounds.width).toBe(prescriptionModalBounds.viewportWidth - prescriptionModalBounds.sidebarWidth);
  expect(prescriptionModalBounds.height).toBe(prescriptionModalBounds.viewportHeight);
  await expect(page.locator('#consultationPatientHeader')).toContainText('Rohan Mehta');
  await expect(page.locator('#consultationPrescriptionModal .consultation-prescription-modal')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('#consultationPatientHeader')).toContainText('Token #1');
  await expect(page.locator('.consultation-allergy-alert')).toBeVisible();
  await expect(page.locator('[data-consultation-panel="clinical"]')).toBeVisible();
  await expect(page.locator('.consultation-form-footer')).toBeVisible();
  await page.locator('#consultationPatientHeader').getByRole('button', { name: 'Queue' }).click();
  await expect(page.locator('#consultationPrescriptionModal')).toBeHidden();
  await page.getByRole('button', { name: 'Continue consultation' }).click();
  await expect(page.locator('#consultationPrescriptionModal')).toBeVisible();
  await expect(page.locator('#consultationPatientHeader')).toContainText('Rohan Mehta');
  await expect(page.locator('[data-consultation-panel="clinical"]')).toBeVisible();
  const vitals = page.locator('#consultationVitalsPanel [data-patient-vitals-form]');
  await vitals.locator('[name="systolicMmHg"]').fill('120');
  await vitals.locator('[name="diastolicMmHg"]').fill('80');
  await vitals.locator('[name="temperatureValue"]').fill('37');
  await vitals.locator('[name="pulseBpm"]').fill('72');
  await vitals.locator('[data-save-consultation-vitals]').click();
  await expect(page.locator('#consultationVitalsPanel')).toContainText('Vitals saved');
  await expect(page.locator('#consultationVitalsPanel')).toContainText('120/80');
  await expect(page.locator('#consultationVitalsPanel [data-patient-vitals-form]')).toHaveClass(/is-readonly/);
  await expect(page.locator('#consultationVitalsPanel [name="systolicMmHg"]')).toBeDisabled();

  const form = page.locator('#consultationPrescriptionForm');
  await form.locator('[name="doctorName"]').fill('Dr. E2E Doctor');
  await form.locator('[name="diagnosisName"]').fill('E2E doctor diagnosis');
  await form.locator('[name="symptomName"]').fill('E2E headache symptoms');
  await form.locator('[name="clinicalObservations"]').fill('Alert and responsive');
  await expect(form.locator('[data-consultation-tab="clinical"]')).toHaveAttribute('aria-selected', 'true');
  await form.locator('[data-consultation-main-tab="history"]').click();
  await expect(form.locator('#consultationHistoryMainPanel')).toBeVisible();
  await form.locator('[data-consultation-main-tab="prescription"]').click();
  await expect(form.locator('#consultationPrescriptionMainPanel')).toBeVisible();
  await form.locator('[data-consultation-tab="prescription"]').click();
  await expect(form.locator('[data-consultation-panel="prescription"]')).toBeVisible();
  await expect(form.locator('[name="advice"]')).toBeVisible();
  await expect(form.locator('[name="dietaryAdvice"]')).toBeVisible();
  await expect(form.getByRole('button', { name: '＋ Add injection / procedure' })).toBeVisible();
  await page.locator('[data-rx-custom="tablets"]').click();
  const tablet = page.locator('[data-rx-rows="tablets"] .rx-medication-row').first();
  await tablet.locator('[name="name"]').fill('E2E prescribed tablet');
  await tablet.locator('[name="dosage"]').fill('1 tablet');
  await tablet.locator('[name="frequencyMorning"]').selectOption('1');
  await expect(tablet.locator('[data-rx-frequency-preview]')).toHaveText('1-0-0');
  await tablet.locator('[name="durationPreset"]').selectOption('5');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('5');
  await tablet.locator('[name="foodTiming"]').selectOption('After Food (PC)');
  await form.locator('[data-consultation-tab="documents"]').click();
  await form.locator('.consultation-document-menu summary').click();
  await expect(form.locator('[data-consultation-document-source="camera"]')).toBeVisible();
  await expect(form.locator('[data-consultation-document-source="files"]')).toBeVisible();
  const documentChooser = page.waitForEvent('filechooser');
  await form.locator('[data-consultation-document-source="files"]').click();
  await (await documentChooser).setFiles({
    name: 'E2E consultation note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic consultation attachment for automated testing.'),
  });
  await expect(form.locator('#consultationDocumentSummary')).toContainText('E2E consultation note.txt');
  for (let capture = 0; capture < 2; capture += 1) {
    await form.locator('.consultation-document-menu summary').click();
    await form.locator('[data-consultation-document-source="camera"]').click();
    const cameraModal = page.locator('#consultationCameraModal');
    await expect(cameraModal).toBeVisible();
    await expect(cameraModal.locator('#consultationCameraCapture')).toBeEnabled();
    await cameraModal.locator('#consultationCameraCapture').click();
    await expect(cameraModal).toBeHidden();
  }
  await expect(form.locator('#consultationDocumentSummary')).toContainText('consultation-photo-');
  await expect(form.locator('#consultationDocumentSummary .patient-document-month')).toHaveCount(1);
  await expect(form.locator('#consultationDocumentSummary .patient-document-month')).toContainText('3 files');
  await expect(form.locator('#consultationDocumentSummary .patient-document-thumbnail')).toHaveCount(2);
  const documentGallery = form.locator('#consultationDocumentSummary [data-patient-document-gallery]');
  await documentGallery.locator('[data-document-search]').fill('consultation-photo');
  await expect(documentGallery.locator('.patient-document-card:visible')).toHaveCount(2);
  await documentGallery.locator('[data-document-search]').fill('');
  await documentGallery.locator('[data-document-filter="image"]').click();
  await expect(documentGallery.locator('.patient-document-card:visible')).toHaveCount(2);
  await form.getByRole('button', { name: 'Save & print prescription' }).click();

  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await expect(page.locator('#patientRecordsHistory')).toContainText('E2E doctor diagnosis');
  await expect(page.locator('#patientRecordsHistory')).toContainText('E2E prescribed tablet');
  const savedEncounter = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return (saved.patientRecords || []).find((record: { patientId: string; prescriptionVersions?: unknown[] }) =>
      record.patientId === 'patient-demo-2' && record.prescriptionVersions?.length);
  });
  expect(savedEncounter).toBeTruthy();
  expect(savedEncounter.reports).toHaveLength(3);

  await page.locator('#patientRecordsModal [data-close-modal]').click();
  await page.locator('#doctorWorkspacePatient').getByRole('button', { name: 'Patient profile' }).click();
  await expect(page.locator('#patientProfileModal')).toBeVisible();
  await page.getByRole('tab', { name: /Documents/ }).click();
  await expect(page.locator('#patientProfileContent .patient-document-month')).toHaveCount(1);
  await expect(page.locator('#patientProfileContent .patient-document-thumbnail')).toHaveCount(2);
  await expect(page.locator('#patientProfileContent')).toContainText('E2E consultation note.txt');
  await page.locator('#patientProfileModal [data-close-modal]').click();
  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  await page.getByRole('button', { name: 'Complete visit' }).click();
  await page.getByRole('button', { name: '＋ New consultation' }).click();
  await expect(page.locator('#checkInModal')).toBeVisible();
  await expect(page.locator('#checkInPatient')).toHaveValue('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.locator('#checkInForm [name="reason"]').fill('E2E follow-up visit');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();
  await expect(page.locator('#doctorWorkspacePatient')).toContainText('E2E follow-up visit');
  const patientVisitIds = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    const visitIds = (saved.patientRecords || [])
      .filter((record: { patientId: string }) => record.patientId === 'patient-demo-2')
      .map((record: { id: string }) => record.id);
    const queueEncounterIds = (saved.queueTokens || [])
      .filter((entry: { patientId: string }) => entry.patientId === 'patient-demo-2')
      .map((entry: { encounterId: string }) => entry.encounterId);
    return { visitIds, queueEncounterIds };
  });
  expect(patientVisitIds.queueEncounterIds).toHaveLength(2);
  expect(new Set(patientVisitIds.queueEncounterIds).size).toBe(2);
  expect(patientVisitIds.queueEncounterIds.every((id: string) => patientVisitIds.visitIds.includes(id))).toBe(true);
});

test('nurse workspace shows the current visit prescription and deducts linked stock when given', async ({ page }) => {
  const visitDate = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.evaluate((date) => {
    const key = 'csk-clinic-management-v1';
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    const patient = {
      id: 'nurse-e2e-patient',
      code: 'CSK-NURSE-E2E',
      name: 'E2E Nurse Patient',
      phone: '9000000066',
      gender: 'Female',
      createdAt: new Date().toISOString(),
    };
    const medicine = {
      id: 'nurse-e2e-medicine',
      name: 'E2E clinic stock medicine',
      category: 'Tablet',
      quantity: 20,
      reorder: 2,
      price: 10,
      expiry: '',
    };
    state.patients = [patient];
    state.medicines = [medicine];
    state.patientRecords = [...(state.patientRecords || []), {
      id: 'nurse-e2e-old-encounter',
      patientId: patient.id,
      visitDate: '2020-01-01',
      prescriptionVersions: [{
        id: 'nurse-e2e-old-version',
        revision: 1,
        medications: [{ id: 'nurse-e2e-old-medication', name: 'Old prescription medicine' }],
      }],
    }, {
      id: 'nurse-e2e-encounter',
      patientId: patient.id,
      visitDate: date,
      doctorName: 'Dr. E2E',
      diagnosis: 'Test diagnosis',
      encounterType: 'OPD',
      status: 'COMPLETED',
      prescriptionVersions: [{
        id: 'nurse-e2e-version',
        revision: 1,
        visitDate: date,
        doctorName: 'Dr. E2E',
        medications: [{
          id: 'nurse-e2e-medication',
          name: 'E2E prescribed medicine',
          medicineId: medicine.id,
          dosage: '1 tablet',
          frequency: 'Twice daily',
          route: 'Oral',
          durationDays: 3,
          quantity: 3,
          section: 'TABLET',
          dispenses: [],
        }, {
          id: 'nurse-e2e-custom-injection',
          name: 'E2E custom injection',
          section: 'INJECTION',
          quantity: 1,
          dispenses: [],
        }],
      }],
    }];
    state.queueTokens = [...(state.queueTokens || []), {
      id: 'nurse-e2e-token',
      patientId: patient.id,
      patientName: patient.name,
      tokenNumber: 77,
      priority: 'NORMAL',
      queueDate: date,
      status: 'COMPLETED',
      encounterId: 'nurse-e2e-encounter',
      encounterType: 'OPD',
      doctor: 'Dr. E2E',
    }];
    localStorage.setItem(key, JSON.stringify(state));
  }, visitDate);
  await page.reload();

  await page.getByRole('link', { name: 'Nurse workspace' }).click();
  await expect(page.locator('.nurse-overview-strip')).toHaveCSS('display', 'grid');
  await page.locator('#nurseQueueSearch').fill('CSK-NURSE-E2E');
  await expect(page.locator('#nurseWorkspaceQueue [data-nurse-select-token]')).toHaveCount(1);
  await page.locator('#nurseQueueSearch').fill('no matching patient');
  await expect(page.locator('#nurseQueueEmpty')).toBeVisible();
  await page.locator('#nurseQueueSearch').clear();
  await page.locator('[data-nurse-select-token="nurse-e2e-token"]').click();
  const prescription = page.locator('#nurseWorkspacePatient');
  await expect(prescription).toContainText('E2E prescribed medicine');
  await expect(prescription).not.toContainText('Old prescription medicine');
  await expect(prescription).toContainText('E2E custom injection');
  await expect(prescription).toContainText('No linked clinic inventory item');
  await expect(prescription.getByRole('button', { name: /Record administration/ })).toHaveCount(2);
  await expect(prescription).toContainText('Prescribed quantity: 3');
  await prescription.getByRole('button', { name: /Record administration/ }).first().click();
  await page.locator('#medicationAdministrationForm [name="quantity"]').fill('2');
  await page.getByRole('button', { name: 'Save nursing record' }).click();
  await expect(prescription).toContainText('Administered 2 · 1 remaining');
  const updatedInventory = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return state.medicines[0].quantity;
  });
  expect(updatedInventory).toBe(18);
  await prescription.getByRole('button', { name: /Record administration/ }).last().click();
  await page.locator('#medicationAdministrationForm [name="status"]').selectOption('HELD');
  await page.locator('#medicationAdministrationForm [name="reason"]').fill('Dose held for clinician review');
  await page.getByRole('button', { name: 'Save nursing record' }).click();
  await expect(prescription).toContainText('HELD');
  const inventoryAfterHeldDose = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return state.medicines[0].quantity;
  });
  expect(inventoryAfterHeldDose).toBe(18);

  await page.goto('/apps/web/public/prototype/index.html');
  await expect(page.getByRole('link', { name: 'Nurse workspace' })).toBeVisible();
  await page.getByRole('link', { name: 'Nurse workspace' }).click();
  await expect(page.locator('.nurse-overview-strip')).toHaveCSS('display', 'grid');
  await page.locator('[data-nurse-select-token="nurse-e2e-token"]').click();
  await expect(page.locator('#nurseWorkspacePatient')).toContainText('Administered 2 · 1 remaining');
});

test('doctor saves immutable consultation prescription revisions and exports a PDF', async ({ page }) => {
  const patientId = 'patient-demo-1';
  const consultationId = '00000000-0000-4000-8000-000000000101';
  let encounter: Record<string, unknown> | null = null;
  const versions: Record<string, unknown>[] = [];

  const recordsRoute = async (route: Route) => {
    await route.fulfill({ json: encounter ? [encounter] : [] });
  };
  const intakesRoute = async (route: Route) => {
    await route.fulfill({ json: [] });
  };
  const createConsultationRoute = async (route: Route) => {
    const input = route.request().postDataJSON();
    const version = {
      ...input,
      id: 'prescription-version-1',
      revision: 1,
      createdAt: new Date().toISOString(),
      createdBy: { email: 'doctor@cskclinic.example' },
      medications: [
        ...input.injections.map((item: Record<string, unknown>) => ({ ...item, section: 'INJECTION' })),
        ...input.nebulizations.map((item: Record<string, unknown>) => ({ ...item, section: 'NEBULIZATION' })),
        ...input.tablets.map((item: Record<string, unknown>) => ({ ...item, section: 'TABLET' })),
      ],
    };
    versions.push(version);
    encounter = {
      id: consultationId,
      patientId,
      encounterType: 'OPD',
      status: 'OPEN',
      visitDate: input.visitDate,
      doctorName: input.doctorName,
      diagnosis: input.diagnosisName,
      symptoms: input.symptoms,
      prescriptionItems: [],
      vitalsRecords: [{
        systolicMmHg: 120,
        diastolicMmHg: 80,
        pulseBpm: 72,
        temperatureC: 37,
        spo2Percent: null,
        cbgMgDl: 97,
        heightCm: 170,
        weightKg: 65,
        bmi: null,
      }],
      reports: [],
      prescriptionVersions: versions,
    };
    await route.fulfill({ json: version });
  };
  const updatePrescriptionRoute = async (route: Route) => {
    const input = route.request().postDataJSON();
    const version = {
      ...input,
      id: 'prescription-version-2',
      revision: 2,
      createdAt: new Date().toISOString(),
      createdBy: { email: 'doctor@cskclinic.example' },
      medications: [
        ...input.injections.map((item: Record<string, unknown>) => ({ ...item, section: 'INJECTION' })),
        ...input.nebulizations.map((item: Record<string, unknown>) => ({ ...item, section: 'NEBULIZATION' })),
        ...input.tablets.map((item: Record<string, unknown>) => ({ ...item, section: 'TABLET' })),
      ],
    };
    versions.unshift(version);
    if (encounter) encounter = { ...encounter, prescriptionVersions: versions };
    await route.fulfill({ json: version });
  };
  const installRoutes = async () => {
    await page.route(`**/api/patients/${patientId}/records`, recordsRoute);
    await page.route(`**/api/patients/${patientId}/intakes`, intakesRoute);
    await page.route(`**/api/patients/${patientId}/consultations`, createConsultationRoute);
    await page.route(`**/api/consultations/${consultationId}/prescriptions`, updatePrescriptionRoute);
  };
  await installRoutes();

  await page.evaluate(() => {
    localStorage.setItem('csk-clinic-api-token', 'e2e-doctor-token');
    localStorage.setItem('csk-clinic-api-user', JSON.stringify({
      id: 'e2e-doctor',
      email: 'doctor@cskclinic.example',
      role: 'DOCTOR',
    }));
  });
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' })
    .locator('[data-open-patient-records]').click();
  await page.getByRole('button', { name: '＋ New consultation' }).click();
  await page.locator('#consultationPrescriptionForm [name="doctorName"]').fill('Dr. E2E');
  await page.locator('#consultationPrescriptionForm [name="diagnosisName"]').fill('Acute review');
  await page.locator('#consultationPrescriptionForm [name="symptomName"]').fill('Headache');
  await page.locator('#consultationPrescriptionForm [name="clinicalObservations"]').fill('Alert and oriented');
  await page.locator('#consultationPrescriptionForm [name="otherNotes"]').fill('Review symptoms in five days');

  await page.locator('[data-consultation-tab="prescription"]').click();
  await page.locator('#prescriptionOutputLanguage').selectOption('english');
  await page.locator('[data-rx-custom="tablets"]').click();
  const tablet = page.locator('[data-rx-rows="tablets"] .rx-medication-row');
  const medicineName = tablet.locator('[name="name"]');
  await medicineName.fill('para');
  await expect(tablet.locator('.rx-medicine-autocomplete [role="option"]').first()).toContainText('Paracetamol 500 mg');
  await medicineName.press('ArrowDown');
  await medicineName.press('Enter');
  await expect(medicineName).toHaveValue('Paracetamol 500 mg');
  await medicineName.fill('Custom tablet');
  await tablet.locator('[name="genericName"]').fill('Example generic');
  await tablet.locator('[name="brand"]').fill('Example brand');
  await tablet.locator('[name="manufacturer"]').fill('Example company');
  await tablet.locator('[name="dosage"]').fill('650 mg');
  await tablet.locator('[name="frequencyFormat"]').selectOption('3');
  await tablet.locator('[name="frequencyMorning"]').selectOption('1');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('0');
  await tablet.locator('[name="frequencyNight"]').selectOption('1');
  await expect(tablet.locator('[data-rx-frequency-preview]')).toHaveText('1-0-1');
  await tablet.locator('[name="durationPreset"]').selectOption('5');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('10');
  await tablet.locator('[name="frequencyMorning"]').selectOption('½');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('0');
  await tablet.locator('[name="frequencyNight"]').selectOption('½');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('5');
  await tablet.locator('[name="frequencyMorning"]').selectOption('¼');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('¾');
  await tablet.locator('[name="frequencyNight"]').selectOption('1½');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('13');
  await tablet.locator('[name="frequencyFormat"]').selectOption('4');
  await tablet.locator('[name="frequencyMorning"]').selectOption('1');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('1');
  await tablet.locator('[name="frequencyEvening"]').selectOption('1');
  await tablet.locator('[name="frequencyNight"]').selectOption('1');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('20');
  await tablet.locator('[name="frequencyMorning"]').selectOption('1');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('0');
  await tablet.locator('[name="frequencyEvening"]').selectOption('0');
  await tablet.locator('[name="frequencyNight"]').selectOption('1');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('10');
  await tablet.locator('[name="frequencyMorning"]').selectOption('0');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('0');
  await tablet.locator('[name="frequencyEvening"]').selectOption('0');
  await tablet.locator('[name="frequencyNight"]').selectOption('1');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('5');
  await tablet.locator('[name="frequencyMode"]').selectOption('custom');
  await tablet.locator('[name="frequencyCustom"]').fill('As needed');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('');
  await tablet.locator('[name="frequencyCustom"]').fill('Once daily');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('5');
  await tablet.locator('[name="dosage"]').fill('1 tablet');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('5');
  await tablet.locator('[name="frequencyMode"]').selectOption('slots');
  await tablet.locator('[name="frequencyFormat"]').selectOption('4');
  await tablet.locator('[name="frequencyMorning"]').selectOption('1');
  await tablet.locator('[name="frequencyAfternoon"]').selectOption('1');
  await tablet.locator('[name="frequencyEvening"]').selectOption('1');
  await tablet.locator('[name="frequencyNight"]').selectOption('1');
  await tablet.locator('[name="route"]').selectOption('Oral');
  await tablet.locator('[name="foodTiming"]').selectOption('After Food (PC)');
  await tablet.locator('[name="startFromPreset"]').selectOption('Tomorrow');
  await expect(tablet.locator('[name="quantity"]')).toHaveValue('20');

  await page.locator('.rx-additional-orders summary').click();
  await page.locator('#addIvFluid').click();
  const fluid = page.locator('#ivFluidRows .rx-structured-row');
  await fluid.locator('[name="type"]').selectOption('RL');
  await fluid.locator('[name="quantityMl"]').fill('500');
  await fluid.locator('[name="flowRate"]').fill('60 ml/hour');
  await fluid.locator('[name="duration"]').fill('4 hours');
  await page.locator('[data-consultation-tab="investigations"]').click();
  await page.locator('#addInvestigation').click();
  const investigation = page.locator('#investigationRows .rx-structured-row');
  await investigation.locator('[name="category"]').selectOption('Blood test');
  await investigation.locator('[name="name"]').fill('Complete blood count');
  await page.locator('[data-consultation-tab="prescription"]').click();
  await page.locator('#consultationPrescriptionForm [name="advice"]').fill('Rest and monitor symptoms');
  await page.locator('#consultationPrescriptionForm [name="dietaryAdvice"]').fill('Maintain hydration');
  await page.locator('#consultationPrescriptionForm [name="nextVisitDate"]').fill('2026-11-29');
  await page.locator('#consultationPrescriptionForm [name="followUpType"]').selectOption('Telehealth');
  await page.locator('#consultationPrescriptionForm [name="followUpInstructions"]').fill('Return if symptoms worsen');
  await page.getByRole('button', { name: '＋ Add injection / procedure' }).click();
  const injection = page.locator('[data-rx-rows="injections"] .rx-medication-row');
  await injection.locator('[name="name"]').fill('Example injection');
  await injection.locator('[name="dosage"]').fill('1 mL');
  await injection.locator('[name="route"]').selectOption('IM');
  await injection.locator('[name="frequency"]').selectOption('Once');
  for (let index = 1; index <= 18; index += 1) {
    await page.locator('[data-rx-custom="tablets"]').click();
    const additionalTablet = page.locator('[data-rx-rows="tablets"] .rx-medication-row').nth(index);
    await additionalTablet.locator('[name="name"]').fill(`Continuation medicine ${index}`);
    await additionalTablet.locator('[name="dosage"]').fill('1 tablet');
    await additionalTablet.locator('[name="frequencyMorning"]').selectOption('1');
    await additionalTablet.locator('[name="durationPreset"]').selectOption('3');
    await additionalTablet.locator('[name="foodTiming"]').selectOption('With food');
  }
  await page.locator('[data-consultation-tab="advice"]').click();
  await page.locator('#consultationPrescriptionForm [name="referralHospitalName"]').fill('CSK General Hospital');
  await page.getByRole('button', { name: 'Save prescription' }).click();

  await expect(page.locator('#patientRecordsHistory')).toContainText('Prescription history');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Custom tablet');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Complete blood count');
  await page.unrouteAll({ behavior: 'wait' });
  const templateResponse = await page.context().request.get(new URL('/assets/csk-prescription-template.png', page.url()).toString());
  expect(templateResponse.ok()).toBe(true);
  expect(templateResponse.headers()['content-type']).toContain('image/png');
  const viewPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-prescription-view="prescription-version-1"]').click();
  const viewPopup = await viewPopupPromise;
  await viewPopup.bringToFront();
  await expect(viewPopup).toHaveTitle(/Aisha Nair - Prescription/);
  await expect(viewPopup.locator('body')).toContainText('Evening');
  const templateImage = viewPopup.locator('.prescription-page').first().locator('.template-image');
  await expect(templateImage).toHaveAttribute('src', /assets\/csk-prescription-template\.png/);
  await templateImage.evaluate((image: HTMLImageElement) => image.decode());
  await expect(templateImage).toHaveJSProperty('naturalWidth', 1054);
  await expect(viewPopup.locator('.vital-bp').first()).toHaveText('120/80');
  await expect(viewPopup.locator('.vital-temperature').first()).toHaveText('98.6 / 37');
  await expect(viewPopup.locator('.vital-bmi').first()).toHaveText('22.5');
  await expect(viewPopup.locator('.vital-spo2')).toHaveCount(0);
  await expect(viewPopup.locator('body')).toContainText('Custom tablet');
  await expect(viewPopup.locator('body')).toContainText('Example injection');
  await expect(viewPopup.locator('body')).toContainText('After Food (PC)');
  await expect(viewPopup.locator('body')).toContainText('Oral');
  await expect(viewPopup.locator('.investigations').first()).toContainText('Complete blood count');
  await expect(viewPopup.locator('.referral-details').first()).toContainText('CSK General Hospital');
  await expect(viewPopup.locator('.rx-instructions')).toContainText('Advice: Rest and monitor symptoms');
  expect(await viewPopup.locator('.prescription-page').count()).toBeGreaterThan(1);
  const recordingPath = process.env.CSK_PRESCRIPTION_VIDEO_PATH;
  if (recordingPath) {
    expect(await viewPopup.evaluate(() => document.visibilityState)).toBe('visible');
    const viewport = viewPopup.viewportSize() || { width: 1280, height: 800 };
    const scale = Math.min(1, 1280 / viewport.width);
    const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);
    await viewPopup.screencast.start({
      path: recordingPath,
      size: { width: even(viewport.width * scale), height: even(viewport.height * scale) },
    });
    try {
      await viewPopup.screencast.showActions();
      await viewPopup.screencast.showChapter('Original template with patient data', { duration: 1800 });
      await viewPopup.waitForTimeout(2000);
      await viewPopup.screencast.showChapter('Prescription continuation', { duration: 1800 });
      await viewPopup.locator('.prescription-page').nth(1).scrollIntoViewIfNeeded();
      await viewPopup.waitForTimeout(2000);
      await viewPopup.screencast.showChapter('Instructions and follow-up', { duration: 1800 });
      await viewPopup.locator('.rx-instructions').scrollIntoViewIfNeeded();
      await viewPopup.waitForTimeout(2000);
    } finally {
      await viewPopup.screencast.stop();
    }
  }
  await viewPopup.close();
  await installRoutes();
  expect(versions).toHaveLength(1);
  expect(versions[0].tablets[0]).toMatchObject({
    name: 'Custom tablet',
    genericName: 'Example generic',
    frequency: '1-1-1-1',
    morning: true,
    afternoon: true,
    evening: true,
    night: true,
    foodTiming: 'After Food (PC)',
    route: 'Oral',
    startFrom: 'Tomorrow',
    quantity: 20,
  });
  expect(versions[0].injections).toEqual([expect.objectContaining({
    name: 'Example injection',
    dosage: '1 mL',
    route: 'IM',
    frequency: 'Once',
  })]);
  expect(versions[0].doctorNotes).toContain('Advice: Rest and monitor symptoms');
  expect(versions[0].doctorNotes).toContain('Dietary advice: Maintain hydration');
  expect(versions[0].followUpInstructions).toBe('Telehealth — Return if symptoms worsen');

  await expect(page.locator('[data-prescription-revision="prescription-version-1"]')).toHaveText('Edit');
  await page.locator('[data-prescription-revision="prescription-version-1"]').click();
  await expect(page.locator('#consultationPrescriptionTitle')).toHaveText('Edit prescription · revision 2');
  await page.locator('#consultationPrescriptionForm [name="otherNotes"]').fill('Updated follow-up note');
  const savedPrintPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Save & print prescription' }).click();
  const savedPrintPopup = await savedPrintPopupPromise;
  await expect(savedPrintPopup).toHaveTitle(/Aisha Nair - Prescription/);
  await savedPrintPopup.close();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Version 1');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Version 2');
  await expect(page.locator('#patientRecordsHistory')).toContainText('Updated follow-up note');
  expect(versions).toHaveLength(2);

  const downloadPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-prescription-download="prescription-version-2"]').click();
  const downloadPopup = await downloadPopupPromise;
  await expect(downloadPopup).toHaveTitle(/Aisha Nair - Prescription/);
  await expect(downloadPopup.locator('body')).toContainText('Custom tablet');
  await downloadPopup.close();
  const printPromise = page.waitForEvent('popup');
  await page.locator('[data-prescription-print="prescription-version-2"]').click();
  const printPage = await printPromise;
  await expect(printPage).toHaveTitle(/Aisha Nair - Prescription/);
  await printPage.close();

  await page.getByRole('button', { name: '＋ New consultation' }).click();
  await page.locator('#consultationPrescriptionForm [name="doctorName"]').fill('Dr. Unsaved');
  const cancelDialogPromise = page.waitForEvent('dialog').then(async (dialog) => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  await expect(page.locator('#toast')).toBeHidden();
  await page.locator('#consultationPrescriptionModal').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await cancelDialogPromise).toContain('Discard unsaved consultation changes');
  await expect(page.locator('#consultationPrescriptionModal')).toBeHidden();
  expect(versions).toHaveLength(2);
});

test('patient, appointment, billing, and inventory screens fit required viewport sizes', async ({ page }) => {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ];
  for (const { width, height } of viewports) {
    await page.setViewportSize({ width, height });

    for (const section of ['overview', 'patients', 'appointments', 'billing', 'pharmacy', 'consumables', 'reports', 'settings']) {
      if (section === 'appointments') {
        await page.goto('/#appointments');
        await page.reload();
      } else {
        await page.evaluate((sectionId) => {
          document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.click();
        }, section);
      }
      await expect(page.locator(`#${section}`)).toHaveClass(/active/);
      if (section === 'pharmacy') {
        await page.locator('#pharmacy [data-pharmacy-tab="inventory"]').first().click();
      }

      const table = page.locator(`#${section} .table-scroll table:visible`).first();
      if (await table.count()) {
        await expect(table).toBeVisible();
        const tableContainer = table.locator('xpath=..');
        const tableLayout = await tableContainer.evaluate((element) => ({
          fits: element.scrollWidth <= element.clientWidth,
          overflowX: getComputedStyle(element).overflowX,
        }));
        if (width <= 430) {
          expect(tableLayout.fits, `${section} table should fit at ${width}px`).toBe(true);
        } else if (!tableLayout.fits) {
          expect(['auto', 'scroll']).toContain(tableLayout.overflowX);
        }

        if (section === 'patients') {
          const labeledCellCount = await table.locator('tbody td[data-label]').count();
          expect(labeledCellCount, `patient cells should have mobile labels at ${width}px`).toBeGreaterThan(0);
        }
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

    for (const [url, section] of [
      ['/index.html?workspace=doctor#doctor', 'doctor'],
      ['/index.html#nurse', 'nurse'],
    ]) {
      await page.goto(url);
      await expect(page.locator(`#${section}`)).toHaveClass(/active/);
      const workspaceFits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(workspaceFits, `${section} workspace should not overflow at ${width}px`).toBe(true);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.nav-link[data-section="patients"]').evaluate((element) => element.click());
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  const registrationModal = page.locator('#patientModal .patient-registration-modal');
  const registrationFits = await registrationModal.evaluate((element) =>
    element.getBoundingClientRect().right <= window.innerWidth && element.scrollWidth <= element.clientWidth + 1);
  expect(registrationFits).toBe(true);
  await page.locator('#patientModal').getByRole('button', { name: 'Cancel' }).click();

  await page.locator('#patientsTable tr').first().getByRole('button', { name: 'View' }).click();
  await expect(page.locator('.patient-profile-dashboard')).toBeVisible();
  const profileFits = await page.locator('.patient-profile-dashboard').evaluate((element) =>
    element.scrollWidth <= element.clientWidth + 1);
  expect(profileFits).toBe(true);
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
    .getByRole('button', { name: 'Visits' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Hypertension follow-up');
  await expect(page.locator('#patientIntakeHistory')).toContainText('Headache and high home BP readings');
  await page.locator('#patientRecordsModal [data-close-modal]').first().click();

  await page.reload();
  await page.getByRole('link', { name: /Patients/ }).click();
  await expect(page.locator('#patientsTable tr', { hasText: 'Maya Krishnan' })).toHaveCount(1);
});

test('patient registration blocks whitespace-only names and mobile numbers', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  const name = page.locator('#patientForm [name="firstName"]');
  const phone = page.locator('#patientForm [name="phone"]');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');

  await name.fill('   ');
  await phone.fill('9000000012');
  await page.getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#patientNameError')).toHaveText('Enter the patient first name.');

  await name.fill('E2E Valid Patient');
  await phone.fill('       ');
  await page.getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#patientPhoneError')).toHaveText('Enter the patient mobile number.');

  await phone.fill('9000000012');
  await page.getByRole('button', { name: 'Save patient' }).click();
  await expect(page.locator('#patientsTable')).toContainText('E2E Valid Patient');
});

test('patient registration saves and resumes a draft, then shows the patient profile', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Draft Patient');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');
  await expect(page.locator('#patientAgePreview')).toContainText('Age calculated');
  await page.locator('#patientForm [name="dob"]').fill('1990-01-01');
  await expect(page.locator('#patientAgePreview')).toContainText('Age');
  await expect(page.locator('#patientCodePreview')).toContainText('A01 · preview');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('#toast')).toHaveText('Patient registration draft saved.');
  await page.locator('#openPatientDrafts').click();
  await expect(page.locator('#patientDraftList')).toContainText('E2E Draft Patient');
  await page.locator('#patientDraftList').getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('#patientForm [name="firstName"]')).toHaveValue('E2E');
  await expect(page.locator('#patientForm [name="lastName"]')).toHaveValue('Draft Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000021');
  await page.locator('#patientForm [name="dob"]').fill('1990-01-01');
  await page.locator('#patientForm [name="emergencyContactName"]').fill('E2E Contact');
  await page.locator('#patientForm [name="emergencyPhone"]').fill('9000000022');
  await page.locator('#patientForm [name="notes"]').fill('E2E allergy detail');
  await page.locator('#patientForm [name="medicalHistory"]').fill('E2E condition and surgical history');
  await page.locator('#patientForm [name="surgicalHistory"]').fill('E2E prior procedure history');
  await page.locator('#patientForm [name="familyHistory"]').fill('E2E family health history');
  await page.locator('#patientForm [name="currentMedications"]').fill('E2E current medicine and dose');
  await page.getByRole('button', { name: 'Save & open profile' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Draft Patient', level: 3 })).toBeVisible();
  await expect(page.locator('.patient-profile-dashboard')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Personal details', level: 3 })).toBeVisible();
  await expect(page.locator('#patientProfileContent')).toContainText('E2E Contact');
  await expect(page.locator('#patientProfileContent')).toContainText('9000000022');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E allergy detail');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E condition and surgical history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E prior procedure history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E family health history');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E current medicine and dose');
  await page.getByRole('tab', { name: /Visit history/ }).click();
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
  await page.locator('#patientsTable tr', { hasText: 'E2E Draft Patient' }).getByRole('button', { name: 'View' }).click();
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
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Existing Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000031');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const beforeCount = await page.locator('#patientsTable tr').count();

  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Possible Duplicate');
  await page.locator('#patientForm [name="phone"]').fill('9000000031');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');
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

test('patient deletion archives history and supports restoring the record', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  const patientRow = page.locator('#patientsTable tr', { hasText: 'Rohan Mehta' });
  page.on('dialog', (dialog) => dialog.accept());

  await patientRow.getByRole('button', { name: 'Delete' }).click();
  await expect(patientRow).toContainText('Archived');
  await expect(patientRow.getByRole('button', { name: 'Restore' })).toBeVisible();
  await expect(patientRow.getByRole('button', { name: 'Check in' })).toHaveCount(0);

  await page.locator('#patientStatusFilter').selectOption('Inactive');
  await expect(page.locator('#patientsTable tr')).toHaveCount(1);
  await patientRow.getByRole('button', { name: 'Restore' }).click();
  await expect(page.locator('#patientsTable tr')).toHaveCount(0);
  await page.locator('#patientStatusFilter').selectOption('Active');
  await expect(page.locator('#patientsTable tr')).toHaveCount(7);
  await expect(page.locator('#patientsTable tr', { hasText: 'Rohan Mehta' })).not.toContainText('Archived');
});

test('outside-provider history supports structured records, attachments, edits, and doctor review', async ({ page }) => {
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.getByRole('button', { name: 'Add patient', exact: true }).click();
  await page.locator('#patientForm [name="firstName"]').fill('E2E Outside History Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000042');
  await page.locator('#patientForm [name="gender"]').selectOption('Unspecified');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const patientRow = page.locator('#patientsTable tr', { hasText: 'E2E Outside History Patient' });
  await expect(patientRow.locator('td').first().locator('small')).toContainText(/[A-Z]+\d+/);
  await expect(page.getByRole('columnheader', { name: 'Medical alerts' })).toBeVisible();
  await patientRow.locator('[data-open-patient-records]').click();
  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await page.locator('#patientRecordsModal [data-close-modal]').first().click();
  await patientRow.locator('[data-open-patient-external-records]').click();

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

  await page.getByRole('button', { name: 'Edit all details' }).click();
  await expect(page.locator('#externalRecordCurrentFile')).toContainText('outside-report.txt');
  await expect(page.locator('#externalMedicalRecordForm [name="recordDate"]')).toHaveValue('2023-02-14');
  await expect(page.locator('#externalMedicalRecordForm [name="recordType"]')).toHaveValue('Discharge summary');
  await expect(page.locator('#externalMedicalRecordForm [name="doctorName"]')).toHaveValue('Dr. E2E Previous');
  await expect(page.locator('#externalMedicalRecordForm [name="facilityName"]')).toHaveValue('E2E Outside Hospital');
  await expect(page.locator('#externalMedicalRecordForm [name="diagnosis"]')).toHaveValue('Outside diagnosis');
  await expect(page.locator('#externalMedicalRecordForm [name="treatment"]')).toHaveValue('Outside treatment plan');
  await expect(page.locator('#externalMedicalRecordForm [name="medications"]')).toHaveValue('Medicine X, once daily');
  await expect(page.locator('#externalMedicalRecordForm [name="investigations"]')).toHaveValue('CBC report');
  await expect(page.locator('#externalMedicalRecordForm [name="notes"]')).toHaveValue('History supplied by previous provider');
  await page.locator('#externalMedicalRecordForm [name="recordDate"]').fill('2023-02-13');
  await page.locator('#externalMedicalRecordForm [name="recordType"]').selectOption('Consultation');
  await page.locator('#externalMedicalRecordForm [name="doctorName"]').fill('Dr. E2E Updated');
  await page.locator('#externalMedicalRecordForm [name="facilityName"]').fill('E2E Updated Hospital');
  await page.locator('#externalMedicalRecordForm [name="diagnosis"]').fill('Updated outside diagnosis');
  await page.locator('#externalMedicalRecordForm [name="treatment"]').fill('Updated outside treatment');
  await page.locator('#externalMedicalRecordForm [name="medications"]').fill('Medicine Y, twice daily');
  await page.locator('#externalMedicalRecordForm [name="investigations"]').fill('Updated CBC and imaging');
  await page.locator('#externalMedicalRecordForm [name="notes"]').fill('Updated outside provider history');
  await page.locator('#externalMedicalRecordForm [name="attachment"]').setInputFiles({
    name: 'outside-report-updated.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Updated synthetic outside provider report.'),
  });
  await page.getByRole('button', { name: 'Update outside record' }).click();
  await expect(page.locator('#toast')).toHaveText('Outside-provider record updated.');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated outside diagnosis');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated outside treatment');
  await expect(page.locator('#patientProfileContent')).toContainText('Medicine Y, twice daily');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated CBC and imaging');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated outside provider history');
  await expect(page.locator('#patientProfileContent')).toContainText('Dr. E2E Updated');
  await expect(page.locator('#patientProfileContent')).toContainText('E2E Updated Hospital');
  await expect(page.locator('#patientProfileContent')).toContainText('outside-report-updated.txt');
  const updatedOutsideRecord = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    const patient = data.patients.find((item: { name: string }) => item.name === 'E2E Outside History Patient');
    return data.externalMedicalRecords.find((record: { patientId: string }) => record.patientId === patient?.id);
  });
  expect(updatedOutsideRecord).toMatchObject({
    recordDate: '2023-02-13',
    recordType: 'Consultation',
    doctorName: 'Dr. E2E Updated',
    facilityName: 'E2E Updated Hospital',
    diagnosis: 'Updated outside diagnosis',
    treatment: 'Updated outside treatment',
    medications: 'Medicine Y, twice daily',
    investigations: 'Updated CBC and imaging',
    notes: 'Updated outside provider history',
    fileName: 'outside-report-updated.txt',
  });

  await page.getByRole('button', { name: 'Edit all details' }).click();
  await expect(page.locator('#externalRecordCurrentFile')).toContainText('outside-report-updated.txt');
  await page.locator('#externalRecordRemoveFileLabel input').check();
  await page.getByRole('button', { name: 'Update outside record' }).click();
  await expect(page.locator('#toast')).toHaveText('Outside-provider record updated.');
  await expect(page.locator('#patientProfileContent')).toContainText('Updated outside diagnosis');
  await expect(page.locator('#patientProfileContent')).toContainText('No attachment');

  await page.getByRole('tab', { name: /Visit history/ }).click();
  await expect(page.locator('#patientProfileContent')).toContainText('No visits recorded');
  await page.getByRole('button', { name: 'Review clinical timeline' }).click();
  await expect(page.locator('#patientRecordsModal')).toBeVisible();
  await expect(page.locator('#patientRecordsHistory')).toContainText('No visit records');
  await expect(page.locator('#patientRecordsModal')).not.toContainText('Updated outside diagnosis');
});

test('doctor workspace is available while patient history remains read-only', async ({ page }) => {
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

  await expect(page.getByRole('link', { name: 'Doctor workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nursing workspace' })).toHaveCount(0);
  await page.getByRole('link', { name: /Patients/ }).click();
  await page.locator('#patientsTable tr', { hasText: 'Aisha Nair' })
    .getByRole('button', { name: 'Visits' }).click();
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
  await page.locator('#clearPatientHistoryFilters').click();
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

test.skip('legacy nursing handoff flow is pending migration', async ({ page }) => {
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
  await row.getByRole('button', { name: 'Use' }).click();
  await page.locator('#consumableUseForm [name="patientId"]').selectOption('patient-demo-1');
  await page.locator('#consumableUseForm [name="quantity"]').fill('2');
  await page.locator('#consumableUseForm').getByRole('button', { name: 'Record usage' }).click();
  await expect(row).toContainText('24');
  await row.getByRole('button', { name: 'History' }).click();
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Opening stock');
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Stock received from dashboard');
  await expect(page.locator('#inventoryHistoryModal')).toContainText('Used for patient care');
  await expect(page.locator('#inventoryHistoryTable')).toContainText('+6');
  await expect(page.locator('#inventoryHistoryTable')).toContainText('-2');
});

test('appointments and walk-ins share one check-in queue and visit', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Token queue' })).toHaveCount(0);
  await expect(page.locator('#queue')).toHaveCount(0);
  await expect(page.locator('#queueModal')).toHaveCount(0);
  await page.goto('/#appointments');
  await expect(page.getByRole('heading', { name: 'Appointments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today’s patient queue' })).toBeVisible();
  await expect(page.locator('#openWalkInCheckIn')).toBeVisible();
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
  const appointmentRow = page.locator('#appointmentsTable tr', { hasText: 'Demo appointment without queue' });
  await expect(appointmentRow).toContainText('Scheduled');
  const appointmentId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.appointments.find((appointment: { reason: string }) =>
      appointment.reason === 'Demo appointment without queue')?.id;
  });
  expect(appointmentId).toBeTruthy();

  await appointmentRow.getByRole('button', { name: 'Check in' }).click();
  await expect(page.locator('#checkInModal')).toBeVisible();
  await expect(page.locator('#checkInForm [name="appointmentId"]')).toHaveValue(appointmentId);
  await expect(page.locator('#checkInPatient')).toHaveValue('patient-demo-4');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  const workflow = await page.evaluate((id) => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    const queueEntries = (records.queueTokens || []).filter(
      (entry: { appointmentId: string }) => entry.appointmentId === id,
    );
    return {
      queueCount: queueEntries.length,
      visitCount: (records.patientRecords || []).filter((visit: { queueTokenId: string }) =>
        queueEntries.some((entry: { id: string }) => entry.id === visit.queueTokenId)).length,
      appointmentStatus: records.appointments.find((appointment: { id: string }) =>
        appointment.id === id)?.status,
    };
  }, appointmentId);
  expect(workflow).toEqual({ queueCount: 1, visitCount: 1, appointmentStatus: 'Checked in' });
  await expect(page.locator('#patientQueueTable tr')).toContainText('Waiting');
});

test('unpaid invoices can be voided with a reason and stop contributing to balances', async ({ page }) => {
  await page.goto('/#billing');
  const invoiceRow = page.locator('#invoicesTable tr', { hasText: 'CSK-DEMO-0003' });
  await expect(invoiceRow).toContainText('Unpaid');
  await expect(page.locator('#billingOutstanding')).toHaveText('₹1,250.00');
  await invoiceRow.getByRole('button', { name: 'Void' }).click();
  await expect(page.locator('#invoiceVoidModal')).toBeVisible();
  await page.locator('#invoiceVoidForm [name="reason"]').fill('Duplicate demo invoice');
  await page.getByRole('button', { name: 'Void invoice' }).click();
  await expect(invoiceRow).toContainText('Voided');
  await expect(invoiceRow).toContainText('Reason: Duplicate demo invoice');
  await expect(invoiceRow.getByRole('button', { name: 'Receive payment' })).toHaveCount(0);
  await expect(invoiceRow.getByRole('button', { name: 'Receipt' })).toHaveCount(0);
  await expect(page.locator('#billingOutstanding')).toHaveText('₹600.00');
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
  await page.locator('#patientForm [name="firstName"]').fill('E2E Complete Patient');
  await page.locator('#patientForm [name="phone"]').fill('9000000012');
  await page.locator('#patientForm [name="dob"]').fill('1988-03-20');
  await page.locator('#patientForm [name="gender"]').selectOption('Female');
  await page.locator('#patientForm [name="email"]').fill('complete.patient@example.test');
  await page.locator('#patientForm [name="bloodGroup"]').selectOption('O+');
  await page.locator('#patientForm [name="address"]').fill('12 Test Street, Thammampatti');
  await page.locator('#patientForm [name="emergencyContactName"]').fill('E2E Emergency');
  await page.locator('#patientForm [name="emergencyPhone"]').fill('9000000013');
  await page.locator('#patientForm [name="notes"]').fill('Synthetic E2E allergy and history notes');
  await page.locator('#patientForm [name="medicalHistory"]').fill('Synthetic E2E medical history');
  await page.getByRole('button', { name: 'Save patient' }).click();
  const patientId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return records.patients.find((patient: { name: string }) => patient.name === 'E2E Complete Patient')?.id;
  });
  expect(patientId).toBeTruthy();

  await page.getByRole('link', { name: 'Pharmacy' }).click();
  await page.locator('#pharmacy [data-pharmacy-tab="inventory"]').first().click();
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

  await page.goto('/#appointments');
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
  await page.locator('#patientsTable tr', { hasText: 'E2E Complete Patient' }).getByRole('button', { name: 'Visits' }).click();
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

test('pharmacy suppliers, partial goods receipts, and purchase reports work', async ({ page }) => {
  await page.getByRole('link', { name: 'Pharmacy' }).click();
  await page.locator('#pharmacy [data-pharmacy-tab="purchases"]').first().click();

  await page.getByRole('button', { name: '＋ Add supplier' }).click();
  await page.locator('#supplierForm [name="name"]').fill('E2E Medical Supplier');
  await page.locator('#supplierForm [name="contactName"]').fill('E2E Contact');
  await page.locator('#supplierForm [name="phone"]').fill('9000000021');
  await page.getByRole('button', { name: 'Save supplier' }).click();
  await expect(page.locator('#suppliersTable')).toContainText('E2E Medical Supplier');

  await page.getByRole('button', { name: '＋ New purchase order' }).click();
  await page.locator('#purchaseOrderForm [name="supplierId"]').selectOption({ label: 'E2E Medical Supplier' });
  await page.locator('#purchaseOrderLines .purchase-line-medicine').selectOption('medicine-demo-1');
  await page.locator('#purchaseOrderLines .purchase-line-quantity').fill('3');
  await page.locator('#purchaseOrderLines .purchase-line-cost').fill('2.50');
  await page.getByRole('button', { name: 'Create purchase order' }).click();
  const purchaseRow = page.locator('#purchaseOrdersTable tr', { hasText: 'PO-000001' });
  await expect(purchaseRow).toContainText('ordered');

  await purchaseRow.getByRole('button', { name: 'Receive' }).click();
  await page.locator('#purchaseReceiptForm [data-receipt-item]').fill('2');
  await page.locator('#purchaseReceiptForm [name="supplierDocumentNumber"]').fill('E2E-GRN-1');
  await page.getByRole('button', { name: 'Receive selected quantities' }).click();
  await expect(purchaseRow).toContainText('partially received');

  await purchaseRow.getByRole('button', { name: 'Receive' }).click();
  await expect(page.locator('#purchaseReceiptForm [data-receipt-item]')).toHaveValue('1');
  await page.locator('#purchaseReceiptForm [name="supplierDocumentNumber"]').fill('E2E-GRN-2');
  await page.getByRole('button', { name: 'Receive selected quantities' }).click();
  await expect(purchaseRow).toContainText('received');
  await expect(page.locator('#medicinesTable')).toContainText('123 units');

  await page.locator('#pharmacy [data-pharmacy-tab="reports"]').click();
  await page.locator('#pharmacyReports [data-pharmacy-report-print="purchases"]').click();
  await expect(page.locator('#printRoot')).toContainText('Purchase Register');
  await expect(page.locator('#printRoot')).toContainText('E2E Medical Supplier');
  await expect(page.locator('#printRoot')).toContainText('E2E-GRN-2');
});

test('staff-entered pharmacy orders follow fulfillment status without duplicating billing stock changes', async ({ page }) => {
  await page.getByRole('link', { name: 'Pharmacy' }).click();
  await page.locator('#pharmacy [data-pharmacy-tab="orders"]').click();
  await page.getByRole('button', { name: '＋ Record order' }).click();
  await expect(page.locator('#pharmacyOrderModal')).toContainText('Stock is not reserved or deducted');
  await page.locator('#pharmacyOrderForm [name="patientId"]').selectOption('patient-demo-1');
  await page.locator('#pharmacyOrderForm [name="channel"]').selectOption('WEBSITE');
  await page.locator('#pharmacyOrderLines .purchase-line-medicine').selectOption('medicine-demo-1');
  await page.locator('#pharmacyOrderLines .purchase-line-quantity').fill('2');
  await page.getByRole('button', { name: 'Record order', exact: true }).click();

  const orderRow = page.locator('#pharmacyOrdersTable tr', { hasText: 'PH-000001' });
  await expect(orderRow).toContainText('Aisha Nair');
  await expect(orderRow).toContainText('WEBSITE');
  await orderRow.getByRole('button', { name: 'Confirm' }).click();
  await orderRow.getByRole('button', { name: 'Mark ready' }).click();
  await orderRow.getByRole('button', { name: 'Complete' }).click();
  await expect(orderRow).toContainText('completed');
  const stock = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    return saved.medicines.find((medicine: { id: string }) => medicine.id === 'medicine-demo-1')?.quantity;
  });
  expect(stock).toBe(120);
});

test('queue-linked nursing intake and manual inpatient encounter workflows work', async ({ page }) => {
  await page.goto('/#appointments');
  await page.getByRole('button', { name: '＋ Walk-in check-in' }).click();
  await page.locator('#checkInPatient').selectOption('patient-demo-2');
  await page.locator('#checkInDoctor').selectOption({ label: 'Dr. Meera Nair' });
  await page.locator('#checkInForm [name="reason"]').fill('E2E intake and doctor handoff');
  await page.getByRole('button', { name: 'Save vitals & assign to doctor' }).click();

  const queueRow = page.locator('#patientQueueTable tr', { hasText: 'Rohan Mehta' });
  await queueRow.getByRole('button', { name: 'Record intake' }).click();
  await page.locator('#nurseIntakeForm [name="chiefComplaint"]').fill('Headache and fever');
  await page.locator('#nurseIntakeForm [name="allergyStatus"]').selectOption('CONFIRMED_NONE');
  await page.locator('#nurseIntakeForm [name="medicationsReviewed"]').selectOption('true');
  await page.locator('#nurseIntakeForm [name="weightKg"]').fill('70');
  await page.locator('#nurseIntakeForm [name="heightCm"]').fill('175');
  await expect(page.locator('#nurseIntakeForm [name="bmi"]')).toHaveValue('22.86');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(queueRow).toContainText('Intake in progress');

  await queueRow.getByRole('button', { name: 'Resume intake' }).click();
  await expect(page.locator('#nurseIntakeForm [name="chiefComplaint"]')).toHaveValue('Headache and fever');
  await page.getByRole('button', { name: 'Send to doctor' }).click();
  await expect(queueRow).toContainText('Ready for doctor');

  await page.getByRole('link', { name: 'Doctor workspace' }).click();
  const handoff = page.locator('#doctorWorkspacePatient #nurseHandoffDetails');
  await expect(handoff).toContainText('Headache and fever');
  await handoff.getByRole('button', { name: 'Mark intake reviewed' }).click();
  await expect(queueRow).toContainText('Reviewed by doctor');

  await page.getByRole('link', { name: /Patients/ }).click();
  const patientRow = page.locator('#patientsTable tr', { hasText: 'Rohan Mehta' });
  await patientRow.getByRole('button', { name: 'Visits' }).click();
  await page.getByRole('button', { name: '＋ Add OPD / IPD visit' }).click();
  await page.locator('#patientEncounterForm [name="encounterType"]').selectOption('IPD');
  await page.locator('#patientEncounterForm [name="visitDate"]').fill(await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }));
  await page.locator('#patientEncounterForm [name="doctorName"]').fill('Dr. E2E Inpatient');
  await page.locator('#patientEncounterForm [name="admittedAt"]').fill('2026-11-27T09:00');
  await page.locator('#patientEncounterForm [name="ward"]').fill('E2E Ward');
  await page.locator('#patientEncounterForm [name="bed"]').fill('E2E-01');
  await page.locator('#patientEncounterForm [name="diagnosis"]').fill('E2E inpatient record');
  await page.getByRole('button', { name: 'Save doctor visit' }).click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('E2E inpatient record');
  const discharge = page.locator('#patientRecordsHistory [data-discharge-record]');
  await expect(discharge).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await discharge.click();
  await expect(page.locator('#patientRecordsHistory')).toContainText('Closed');
});

test('prescription list opens the matching patient and medicines in pharmacy checkout', async ({ page }) => {
  for (const appPath of ['/index.html', '/apps/web/public/prototype/index.html']) {
    await page.goto(appPath);
    await page.getByRole('link', { name: /Prescriptions/ }).click();
    const prescriptionRow = page.locator('#prescriptionsTable tr', { hasText: 'Aisha Nair' })
      .filter({ hasText: 'Paracetamol 500 mg' });
    await expect(prescriptionRow).toBeVisible();
    await expect(prescriptionRow.getByRole('button', { name: 'Bill' })).toBeVisible();

    await prescriptionRow.getByRole('button', { name: 'View' }).click();
    await expect(page.locator('#prescriptionDetailsModal')).toContainText('Paracetamol 500 mg');
    await page.locator('#prescriptionDetailsModal [data-close-modal]').click();

    await prescriptionRow.getByRole('button', { name: 'Bill' }).click();
    await expect(page.locator('#pharmacyPosPatientSummary')).toContainText('Aisha Nair');
    await expect(page.locator('#pharmacyPosItemsTable')).toContainText('Paracetamol 500 mg');
    await expect(page.locator('#pharmacyPosCollect')).toBeEnabled();
  }
});

test('collecting a prescription bill creates the patient invoice and decrements stock', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Pharmacy' }).click();
  await page.locator('#pharmacy [data-pharmacy-tab="inventory"]').first().click();
  const stockRow = page.locator('#medicinesTable tr', { hasText: 'Paracetamol 500 mg' });
  const stockBeforeText = await stockRow.innerText();
  const stockBefore = Number(/(\d+) units/.exec(stockBeforeText)?.[1]);
  expect(Number.isFinite(stockBefore)).toBe(true);

  await page.getByRole('link', { name: /Prescriptions/ }).click();
  const prescriptionRow = page.locator('#prescriptionsTable tr', { hasText: 'Aisha Nair' })
    .filter({ hasText: 'Paracetamol 500 mg' });
  await prescriptionRow.getByRole('button', { name: 'Bill' }).click();
  await page.locator('[data-pos-payment="UPI"]').click();
  await page.locator('#pharmacyPosCollect').click();

  await expect(page.locator('#billing')).toHaveClass(/active/);
  await expect(page.locator('#invoicesTable')).toContainText('Aisha Nair');
  const result = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('csk-clinic-management-v1') || '{}');
    const prescription = saved.patientRecords.find((record: { id: string }) => record.id === 'visit-demo-1')
      ?.prescriptionItems?.find((item: { id: string }) => item.id === 'prescription-demo-1');
    const invoice = [...(saved.invoices || [])].reverse().find((item: { encounterId: string; items: Array<{ medicineId: string }> }) =>
      item.encounterId === 'visit-demo-1' && item.items.some((line) => line.medicineId === 'medicine-demo-1')
    );
    return {
      billedQuantity: prescription?.billedQuantity,
      invoiceMethod: invoice?.paymentMethod,
      invoiceItemQuantity: invoice?.items.find((line: { medicineId: string }) => line.medicineId === 'medicine-demo-1')?.quantity,
      remainingStock: saved.medicines.find((medicine: { id: string }) => medicine.id === 'medicine-demo-1')?.quantity,
    };
  });
  expect(result.billedQuantity).toBe(6);
  expect(result.invoiceMethod).toBe('UPI');
  expect(result.invoiceItemQuantity).toBe(4);
  expect(result.remainingStock).toBe(stockBefore - 4);

  await page.locator('#printRoot [data-close-print-preview]').click();
  await page.getByRole('link', { name: /Prescriptions/ }).click();
  const billedPrescription = page.locator('#prescriptionsTable tr', { hasText: 'Aisha Nair' })
    .filter({ hasText: 'Paracetamol 500 mg' });
  await expect(billedPrescription.getByRole('button', { name: 'Bill' })).toHaveCount(0);
});
