// script-dashboard.js

document.addEventListener('DOMContentLoaded', function () {
  checkLoginStatus();
  initializeDashboard();
  registerServiceWorker();
  showThisWeekMarriageCount();
});

let scheduleData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function initializeDashboard() {
  displayUserInfo();
  setupEventListeners();
  loadScheduleData();
  updateCalendar();
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function displayUserInfo() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (userData) {
    document.getElementById('loggedInUser').textContent = `${userData.name} (${userData.role})`;
  }
}

function setupEventListeners() {
  const modal = document.getElementById('scheduleModal');
  const addBtn = document.getElementById('addScheduleBtn');
  const closeBtn = document.querySelector('.close');

  addBtn.addEventListener('click', () => openModal('Tambah Jadwal Nikah'));
  closeBtn.addEventListener('click', () => modal.style.display = 'none');

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentMonth = (currentMonth - 1 + 12) % 12;
    if (currentMonth === 11) currentYear--;
    updateCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentMonth = (currentMonth + 1) % 12;
    if (currentMonth === 0) currentYear++;
    updateCalendar();
  });

  document.getElementById('locationFilter').addEventListener('change', loadScheduleData);
  document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPdf);
  document.getElementById('downloadCsvBtn').addEventListener('click', downloadAsCsv);
  document.getElementById('location').addEventListener('change', function () {
    document.getElementById('locationDetailGroup').style.display = this.value === 'Lapangan' ? 'block' : 'none';
  });
}

function loadScheduleData() {
  scheduleData = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const locationFilter = document.getElementById('locationFilter').value;

  let filtered = scheduleData.filter(item => {
    const [year, month, day] = item.date.split('-').map(Number);
    const itemDate = new Date(item.date + 'T00:00:00');
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    return itemDate >= firstDay && itemDate <= lastDay;
  });

  if (locationFilter !== 'all') {
    filtered = filtered.filter(item => item.location === locationFilter);
  }

  renderScheduleTable(filtered);
}

function renderScheduleTable(data) {
  const tbody = document.getElementById('scheduleTableBody');
  tbody.innerHTML = '';
  data.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(item.date)}</td>
      <td>${item.time}</td>
      <td>${item.groomName}</td>
      <td>${item.brideName}</td>
      <td>${item.groomPhone}</td>
      <td>${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}</td>
      <td>${item.notes || '-'}</td>
      <td>
        <button class="edit-btn" data-id="${item.id}">Edit</button>
        <button class="delete-btn" data-id="${item.id}">Hapus</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editSchedule(btn.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteSchedule(btn.dataset.id)));
}

function updateCalendar() {
  const calendarBody = document.getElementById('calendarBody');
  calendarBody.innerHTML = '';
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  document.getElementById('currentMonthYear').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarBody.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= lastDay; day++) {
    const cell = document.createElement('div');
    cell.textContent = day;
    const currentDate = new Date(Date.UTC(currentYear, currentMonth, day));
    const formattedDate = formatDateForComparison(currentDate);
    
    const matches = scheduleData.filter(item => formatDateForComparison(new Date(...item.date.split('-').map(Number))) === formattedDate);
    if (matches.length > 0) {
      cell.classList.add('has-schedule');
      const badge = document.createElement('span');
      badge.className = 'date-badge';
      badge.textContent = matches.length;
      cell.appendChild(badge);
      cell.addEventListener('click', () => renderScheduleTable(matches));
    }
    calendarBody.appendChild(cell);
  }
}

function openModal(title, data = null) {
  const modal = document.getElementById('scheduleModal');
  document.getElementById('modalTitle').textContent = title;
  const form = document.getElementById('scheduleForm');
  const deleteBtn = document.getElementById('deleteBtn');

  if (data) {
    Object.entries(data).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (el) el.value = val;
    });
    deleteBtn.style.display = 'inline-block';
    deleteBtn.onclick = () => deleteSchedule(data.id);
  } else {
    form.reset();
    document.getElementById('scheduleId').value = '';
    deleteBtn.style.display = 'none';
    document.getElementById('weddingDate').valueAsDate = new Date();
  }

  modal.style.display = 'block';
}

function handleFormSubmit(e) {
  e.preventDefault();
  const formData = {
    id: document.getElementById('scheduleId').value || Date.now(),
    groomName: document.getElementById('groomName').value,
    brideName: document.getElementById('brideName').value,
    groomPhone: document.getElementById('groomPhone').value,
    bridePhone: document.getElementById('bridePhone').value,
    date: document.getElementById('weddingDate').value,
    time: document.getElementById('weddingTime').value,
    location: document.getElementById('location').value,
    locationDetail: document.getElementById('location').value === 'Lapangan' ? document.getElementById('locationDetail').value : '',
    notes: document.getElementById('notes').value
  };

  let schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const sameDateLapangan = schedules.find(item => item.date === formData.date && item.location === 'Lapangan' && item.id != formData.id);

  if (sameDateLapangan) {
    alert('⚠️ Sudah ada jadwal nikah di Lapangan pada hari ini.');
  }

  if (formData.id && schedules.some(item => item.id == formData.id)) {
    schedules = schedules.map(item => item.id == formData.id ? formData : item);
  } else {
    schedules.push(formData);
  }

  localStorage.setItem('weddingSchedules', JSON.stringify(schedules));
  loadScheduleData();
  updateCalendar();
  document.getElementById('scheduleModal').style.display = 'none';
}

function editSchedule(id) {
  const item = scheduleData.find(i => i.id == id);
  if (item) openModal('Edit Jadwal Nikah', item);
}

function deleteSchedule(id) {
  if (confirm('Yakin ingin menghapus jadwal ini?')) {
    let schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
    schedules = schedules.filter(item => item.id != id);
    localStorage.setItem('weddingSchedules', JSON.stringify(schedules));
    loadScheduleData();
    updateCalendar();
    document.getElementById('scheduleModal').style.display = 'none';
  }
}

function downloadAsPdf() {
  const element = document.getElementById('scheduleTable');
  html2pdf().from(element).set({ margin: 10, filename: `jadwal-nikah-${currentMonth + 1}-${currentYear}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).save();
}

function downloadAsCsv() {
  const rows = [['Tanggal', 'Waktu', 'Pria', 'Wanita', 'HP', 'Lokasi', 'Keterangan']];
  scheduleData.forEach(item => rows.push([
    formatDate(item.date), item.time, item.groomName, item.brideName, item.groomPhone,
    `${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}`, item.notes || ''
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `jadwal-nikah-${currentMonth + 1}-${currentYear}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
}

function checkLoginStatus() {
  if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('Versi baru tersedia. Muat ulang?')) window.location.reload();
          }
        });
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  }
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}

function formatDateForComparison(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return date.toISOString().split('T')[0];
}

function showThisWeekMarriageCount() {
  const now = new Date();
  const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  const data = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const count = data.filter(item => {
    const d = new Date(...item.date.split('-').map(Number));
    return d >= firstDay && d <= lastDay;
  }).length;
  const counter = document.createElement('div');
  counter.className = 'weekly-counter';
  counter.textContent = `👰 Jumlah Pernikahan Minggu Ini: ${count}`;
  document.querySelector('header').appendChild(counter);
}
