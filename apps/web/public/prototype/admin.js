const stats = [
  { label: 'Total Patients', value: 4824, delta: '+12.4%', trend: 'up', icon: '👥' },
  { label: 'Today\'s Appointments', value: 186, delta: '+8.1%', trend: 'up', icon: '📅' },
  { label: 'Total Doctors', value: 94, delta: '+3.2%', trend: 'up', icon: '🩺' },
  { label: 'Today\'s Revenue', value: '₹2.8L', delta: '-1.7%', trend: 'down', icon: '₹' }
];

const revenueBars = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 72 },
  { label: 'Thu', value: 51 },
  { label: 'Fri', value: 86 },
  { label: 'Sat', value: 68 },
  { label: 'Sun', value: 92 }
];

const departmentData = [
  { name: 'General Medicine', value: 86 },
  { name: 'Cardiology', value: 71 },
  { name: 'Orthopedics', value: 68 },
  { name: 'Pediatrics', value: 53 },
  { name: 'Dermatology', value: 47 }
];

const appointments = [
  { patient: 'Aarav Sharma', doctor: 'Dr. Meera Nair', department: 'Cardiology', status: 'Confirmed' },
  { patient: 'Isha Verma', doctor: 'Dr. Rohan Sethi', department: 'General Medicine', status: 'Pending' },
  { patient: 'Nikhil Rao', doctor: 'Dr. Anjali Menon', department: 'Orthopedics', status: 'Review' },
  { patient: 'Diya Hassan', doctor: 'Dr. Vishal Joshi', department: 'Pediatrics', status: 'Confirmed' }
];

const patients = [
  { name: 'Pooja Iyer', age: 29, gender: 'Female', blood: 'A+' },
  { name: 'Karan Shetty', age: 51, gender: 'Male', blood: 'O+' },
  { name: 'Mehul Shah', age: 42, gender: 'Male', blood: 'B+' },
  { name: 'Aditi Nair', age: 34, gender: 'Female', blood: 'AB-' }
];

const pharmacyData = [
  { label: 'Inventory value', value: '₹18.4L' },
  { label: 'Low stock alerts', value: '12 items' },
  { label: 'Pending invoices', value: '27' }
];

const labData = [
  { label: 'Reports pending', value: '19' },
  { label: 'Samples today', value: '76' },
  { label: 'Turnaround time', value: '5.2 hrs' }
];

const billingData = [
  { label: 'Collected revenue', value: '₹3.6L' },
  { label: 'Pending payments', value: '₹1.1L' },
  { label: 'Claims verified', value: '94%' }
];

function renderStats() {
  const container = document.getElementById('adminStats');
  container.innerHTML = stats.map((stat) => {
    const trendClass = stat.trend === 'up' ? 'up' : 'down';
    return `
      <div class="stat-card">
        <div class="stat-head">
          <div class="stat-label">${stat.label}</div>
          <div class="stat-icon">${stat.icon}</div>
        </div>
        <div class="stat-value">${stat.value}</div>
        <div class="stat-meta">
          <span class="delta ${trendClass}">${stat.delta}</span>
          <span>vs last week</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRevenueChart() {
  const container = document.getElementById('adminRevenueChart');
  const max = Math.max(...revenueBars.map((day) => day.value));

  container.innerHTML = revenueBars.map((day) => `
    <div class="bar-col">
      <div class="bar" style="height:${(day.value / max) * 100}%"></div>
      <span class="bar-label">${day.label}</span>
    </div>
  `).join('');
}

function renderDepartmentChart() {
  const container = document.getElementById('adminDepartmentChart');

  container.innerHTML = departmentData.map((department) => `
    <div class="department-item">
      <span class="department-name">${department.name}</span>
      <span class="department-value">${department.value}%</span>
      <div class="progress-track">
        <div class="progress-fill" style="width:${department.value}%"></div>
      </div>
    </div>
  `).join('');
}

function renderAppointments() {
  const container = document.getElementById('adminAppointments');

  container.innerHTML = appointments.map((appointment) => {
    const badgeClass = appointment.status === 'Confirmed' ? 'confirmed' : appointment.status === 'Pending' ? 'pending' : 'review';
    return `
      <tr>
        <td>${appointment.patient}</td>
        <td>${appointment.doctor}</td>
        <td>${appointment.department}</td>
        <td><span class="badge ${badgeClass}">${appointment.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderPatients() {
  const container = document.getElementById('adminPatients');

  container.innerHTML = patients.map((patient) => `
    <tr>
      <td>${patient.name}</td>
      <td>${patient.age}</td>
      <td>${patient.gender}</td>
      <td>${patient.blood}</td>
    </tr>
  `).join('');
}

function renderMetrics(targetId, items) {
  const container = document.getElementById(targetId);
  container.innerHTML = items.map((item) => `
    <div class="metric-item">
      <strong>${item.label}</strong>
      <span class="metric-value">${item.value}</span>
    </div>
  `).join('');
}

renderStats();
renderRevenueChart();
renderDepartmentChart();
renderAppointments();
renderPatients();
renderMetrics('adminPharmacy', pharmacyData);
renderMetrics('adminLab', labData);
renderMetrics('adminBilling', billingData);
