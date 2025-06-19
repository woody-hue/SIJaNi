document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  initializeDashboard();
  registerServiceWorker();
});

function initializeDashboard() {
  displayUserInfo();
  setupEventListeners();
  loadScheduleData();
  updateCalendar();
  showThisWeekMarriageCount();
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
  document.getElementById('addScheduleBtn').addEventListener('click', () => openModal('Tambah Jadwal Nikah'));
  document.querySelector('.close').addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateCalendar();
  });
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updateCalendar();
  });
  document.getElementById('locationFilter').addEventListener('change', loadScheduleData);
  document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPdf);
  document.getElementById('downloadCsvBtn').addEventListener('click', downloadAsCsv);
  document.getElementById('location').addEventListener('change', function () {
    document.getElementById('locationDetailGroup').style.display = this.value === 'Lapangan' ? 'block' : 'none';
  });
}

let scheduleData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function loadScheduleData() {
  scheduleData = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const filter = document.getElementById('locationFilter').value;
  let filtered = scheduleData;
  if (filter !== 'all') filtered = scheduleData.filter(item => item.location === filter);

  const first = new Date(currentYear, currentMonth, 1);
  const last = new Date(currentYear, currentMonth + 1, 0);
  filtered = filtered.filter(item => {
    const date = new Date(item.date);
    return date >= first && date <= last;
  });

  renderScheduleTable(filtered);
}

function renderScheduleTable(data) {
  const tbody = document.getElementById('scheduleTableBody');
  tbody.innerHTML = '';
  let count = 1;

  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${count++}</td>
      <td>${formatDate(item.date)}</td>
      <td>${item.time}</td>
      <td>${item.groomName}</td>
      <td>${item.brideName}</td>
      <td>${item.groomPhone}</td>
      <td>${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}</td>
      <td>${item.documentStatus}</td>
      <td>${item.notes || '-'}</td>
      <td>
        <button class="edit-btn" data-id="${item.id}">Edit</button>
        <button class="delete-btn" data-id="${item.id}">Hapus</button>
      </td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editSchedule(btn.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteSchedule(btn.dataset.id)));
}

function updateCalendar() {
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  document.getElementById('currentMonthYear').textContent = `${monthNames[currentMonth]} ${currentYear}`;
  const calendarBody = document.getElementById('calendarBody');
  calendarBody.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) calendarBody.appendChild(document.createElement('div'));

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    const formatted = formatDateForComparison(dateObj);
    const schedules = scheduleData.filter(item => formatDateForComparison(new Date(item.date)) === formatted);

    const cell = document.createElement('div');
    cell.textContent = day;
    if (schedules.length) {
      cell.classList.add('has-schedule');
      const countLabel = document.createElement('span');
      countLabel.className = 'schedule-count';
      countLabel.textContent = schedules.length;
      cell.appendChild(countLabel);
      cell.addEventListener('click', () => renderScheduleTable(schedules));
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
    document.getElementById('scheduleId').value = data.id;
    document.getElementById('groomName').value = data.groomName;
    document.getElementById('brideName').value = data.brideName;
    document.getElementById('groomPhone').value = data.groomPhone;
    document.getElementById('bridePhone').value = data.bridePhone;
    document.getElementById('weddingDate').value = data.date;
    document.getElementById('weddingTime').value = data.time;
    document.getElementById('location').value = data.location;
    document.getElementById('locationDetail').value = data.locationDetail || '';
    document.getElementById('documentStatus').value = data.documentStatus;
    document.getElementById('notes').value = data.notes || '';
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
    documentStatus: document.getElementById('documentStatus').value,
    notes: document.getElementById('notes').value
  };
  if (!formData.groomName || !formData.brideName || !formData.date || !formData.time) {
    alert('Harap isi semua field yang diperlukan');
    return;
  }
  let schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const existing = schedules.findIndex(item => item.id == formData.id);
  if (existing >= 0) schedules[existing] = formData;
  else schedules.push(formData);
  localStorage.setItem('weddingSchedules', JSON.stringify(schedules));
  loadScheduleData();
  updateCalendar();
  document.getElementById('scheduleModal').style.display = 'none';
}

function editSchedule(id) {
  const schedule = scheduleData.find(item => item.id == id);
  if (schedule) openModal('Edit Jadwal Nikah', schedule);
}

function deleteSchedule(id) {
  if (confirm('Hapus jadwal ini?')) {
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
  const opt = { margin: 10, filename: `jadwal-nikah-${currentMonth + 1}-${currentYear}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
  html2pdf().from(element).set(opt).save();
}

function downloadAsCsv() {
  const rows = [[ 'Tanggal', 'Waktu', 'Pria', 'Wanita', 'HP', 'Lokasi', 'Status Berkas', 'Keterangan' ]];
  scheduleData.forEach(item => rows.push([
    formatDate(item.date), item.time, item.groomName, item.brideName,
    item.groomPhone, `${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}`,
    item.documentStatus, item.notes || ''
  ]));
  const csv = rows.map(r => r.map(val => `"${val}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `jadwal-nikah-${currentMonth + 1}-${currentYear}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

function formatDateForComparison(date) {
  return date.toISOString().split('T')[0];
}

function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) window.location.href = 'login.html';
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('ServiceWorker registered');
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('Versi baru tersedia. Muat ulang?')) window.location.reload();
          }
        });
      });
    }).catch(err => console.log('SW gagal:', err));
  }
}

function showThisWeekMarriageCount() {
  const today = new Date();
  const start = new Date(today.setDate(today.getDate() - today.getDay()));
  const end = new Date(today.setDate(start.getDate() + 6));
  const count = scheduleData.filter(item => {
    const d = new Date(item.date);
    return d >= start && d <= end;
  }).length;

  const el = document.createElement('div');
  el.className = 'weekly-info';
  el.textContent = `Jumlah nikah minggu ini: ${count}`;
  document.querySelector('header').appendChild(el);
}
