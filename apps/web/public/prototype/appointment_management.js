const appointmentStats = [
  { label: 'Booked today', value: 86, delta: '+14.6%', trend: 'up', icon: '📅' },
  { label: 'Available slots', value: 32, delta: '+5.2%', trend: 'up', icon: '🕒' },
  { label: 'No-shows', value: 7, delta: '-1.9%', trend: 'down', icon: '⚠️' },
  { label: 'Follow-ups', value: 24, delta: '+8.1%', trend: 'up', icon: '✅' }
];

const scheduleBlocks = [
  { day: 'Mon', slots: [{ text: '09:00', tone: 'default' }, { text: '12:30', tone: 'red' }] },
  { day: 'Tue', slots: [{ text: '10:15', tone: 'default' }, { text: '14:00', tone: 'amber' }] },
  { day: 'Wed', slots: [{ text: '11:00', tone: 'default' }, { text: '15:15', tone: 'red' }] },
  { day: 'Thu', slots: [{ text: '09:45', tone: 'default' }, { text: '16:00', tone: 'amber' }] },
  { day: 'Fri', slots: [{ text: '08:30', tone: 'default' }, { text: '13:15', tone: 'default' }] },
  { day: 'Sat', slots: [{ text: '10:00', tone: 'amber' }, { text: '15:30', tone: 'red' }] },
  { day: 'Sun', slots: [{ text: 'Closed', tone: 'red' }] }
];

const appointments = [
  { patient: 'Aisha Nair', doctor: 'Dr. Meera Nair', department: 'Cardiology', date: '15 Nov 2026', time: '10:30 AM', status: 'Confirmed' },
  { patient: 'Rohan Mehta', doctor: 'Dr. Anjali Menon', department: 'Orthopedics', date: '15 Nov 2026', time: '11:45 AM', status: 'Pending' },
  { patient: 'Pooja Iyer', doctor: 'Dr. Rohan Sethi', department: 'General Medicine', date: '15 Nov 2026', time: '01:30 PM', status: 'Review' },
  { patient: 'Diya Sen', doctor: 'Dr. Vishal Joshi', department: 'Dermatology', date: '16 Nov 2026', time: '09:00 AM', status: 'Confirmed' }
];

function renderStats() {
  const container = document.getElementById('appointmentStats');
  container.innerHTML = appointmentStats.map((stat) => `
    <div class="stat-card">
      <div class="stat-head">
        <span class="stat-label">${stat.label}</span>
        <span class="stat-icon">${stat.icon}</span>
      </div>
      <div class="stat-value">${stat.value}</div>
      <div class="stat-meta">
        <span class="delta ${stat.trend}">${stat.delta}</span>
        <span>vs last week</span>
      </div>
    </div>
  `).join('');
}

function renderSchedule() {
  const container = document.getElementById('doctorSchedule');
  container.innerHTML = scheduleBlocks.map((day) => `
    <div class="day-block">
      <span class="day-label">${day.day}</span>
      ${day.slots.map((slot) => `<span class="slot ${slot.tone === 'red' ? 'red' : slot.tone === 'amber' ? 'amber' : ''}">${slot.text}</span>`).join('')}
    </div>
  `).join('');
}

function renderAppointments() {
  const container = document.getElementById('appointmentsTable');
  container.innerHTML = appointments.map((item) => {
    const badgeClass = item.status === 'Confirmed' ? 'confirmed' : item.status === 'Pending' ? 'pending' : 'review';
    return `
      <tr>
        <td>${item.patient}</td>
        <td>${item.doctor}</td>
        <td>${item.department}</td>
        <td>${item.date}</td>
        <td>${item.time}</td>
        <td><span class="badge ${badgeClass}">${item.status}</span></td>
      </tr>
    `;
  }).join('');
}

renderStats();
renderSchedule();
renderAppointments();
