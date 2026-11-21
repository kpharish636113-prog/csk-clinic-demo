const patientStats = [
  { label: 'Active patients', value: 6432, delta: '+9.8%', trend: 'up', icon: '👥' },
  { label: 'New this month', value: 286, delta: '+12.2%', trend: 'up', icon: '🩺' },
  { label: 'Follow-ups due', value: 194, delta: '-4.1%', trend: 'down', icon: '📌' },
  { label: 'Critical alerts', value: 18, delta: '+2.7%', trend: 'up', icon: '⚠️' }
];

const patients = [
  { name: 'Aisha Nair', id: 'CSK-2048', age: 34, gender: 'Female', lastVisit: '12 Nov', department: 'Cardiology', status: 'Active' },
  { name: 'Rohan Mehta', id: 'CSK-3191', age: 42, gender: 'Male', lastVisit: '10 Nov', department: 'Orthopedics', status: 'Follow-up' },
  { name: 'Pooja Iyer', id: 'CSK-1880', age: 29, gender: 'Female', lastVisit: '08 Nov', department: 'General Medicine', status: 'Active' },
  { name: 'Sanjay Rao', id: 'CSK-4055', age: 58, gender: 'Male', lastVisit: '04 Nov', department: 'Neurology', status: 'Critical' },
  { name: 'Diya Sen', id: 'CSK-2791', age: 25, gender: 'Female', lastVisit: '03 Nov', department: 'Dermatology', status: 'Active' }
];

const schedule = [
  { time: '09:30 AM', title: 'Cardiology review' },
  { time: '11:15 AM', title: 'Lab follow-up' },
  { time: '02:00 PM', title: 'Medication review' },
  { time: '04:40 PM', title: 'Physiotherapy consult' }
];

function renderStats() {
  const container = document.getElementById('patientStats');
  container.innerHTML = patientStats.map((stat) => `
    <div class="stat-card">
      <div class="stat-head">
        <span class="stat-label">${stat.label}</span>
        <span class="stat-icon">${stat.icon}</span>
      </div>
      <div class="stat-value">${stat.value}</div>
      <div class="stat-meta">
        <span class="delta ${stat.trend}">${stat.delta}</span>
        <span>vs last month</span>
      </div>
    </div>
  `).join('');
}

function renderPatients() {
  const container = document.getElementById('patientTable');
  container.innerHTML = patients.map((patient) => {
    const badgeClass = patient.status.toLowerCase().replace(/\s+/g, '-');
    return `
      <tr>
        <td>
          <div class="patient-name">${patient.name}</div>
          <small>${patient.id}</small>
        </td>
        <td>${patient.age} / ${patient.gender}</td>
        <td>${patient.lastVisit}</td>
        <td>${patient.department}</td>
        <td><span class="badge ${badgeClass}">${patient.status}</span></td>
        <td><a class="action-link" href="#">View</a></td>
      </tr>
    `;
  }).join('');
}

function renderSchedule() {
  const container = document.getElementById('scheduleList');
  container.innerHTML = schedule.map((item) => `
    <li>
      <div>
        <strong>${item.title}</strong>
      </div>
      <span class="time-tag">${item.time}</span>
    </li>
  `).join('');
}

renderStats();
renderPatients();
renderSchedule();
