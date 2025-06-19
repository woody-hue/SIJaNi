// script-dashboard.js

document.addEventListener('DOMContentLoaded', function () {
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
  const addBtn = document.getElementById('addScheduleBtn');
  const closeBtn = document.querySelector('.close');

  addBtn.addEventListener('click', () => openModal('Tambah Jadwal Nikah'));
  closeBtn.addEventListener('click', () => modal.style.display = 'none');

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
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
  const locationFilter = document.getElementById('locationFilter').value;
  let filteredData = scheduleData;

  if (locationFilter !== 'all') {
    filteredData = scheduleData.filter(item => item.location === locationFilter);
  }

  const firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
  const lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0));

  filteredData = filteredData.filter(item => {
    const itemDate = new Date(item.date + 'T00:00:00');
    return itemDate >= firstDay && itemDate <= lastDay;
  });

  renderScheduleTable(filteredData);
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
            </td>
        `;
        tbody.appendChild(row);
    });

    // Tambah event listener untuk tombol
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editSchedule(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSchedule(btn.dataset.id));
    });
}

function updateCalendar() {
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  document.getElementById('currentMonthYear').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
  const lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
  const daysInMonth = lastDay.getUTCDate();
  const startingDay = firstDay.getUTCDay();

  const calendarBody = document.getElementById('calendarBody');
  calendarBody.innerHTML = '';

  for (let i = 0; i < startingDay; i++) {
    calendarBody.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.textContent = day;

    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const match = scheduleData.filter(item => item.date === dateStr);

    if (match.length > 0) {
      cell.classList.add('has-schedule');
      const countLabel = document.createElement('span');
      countLabel.className = 'schedule-count';
      countLabel.textContent = match.length;
      cell.appendChild(countLabel);
      cell.addEventListener('click', () => renderScheduleTable(match));
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
    documentStatus: document.getElementById('documentStatus').value,
    locationDetail: document.getElementById('location').value === 'Lapangan' ? document.getElementById('locationDetail').value : '',
    notes: document.getElementById('notes').value
  };

  if (!formData.groomName || !formData.brideName || !formData.date || !formData.time) {
    showNotification('Error', { body: 'Harap isi semua field yang diperlukan', type: 'error' });
    return;
  }

  const schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
  const sameDateLapangan = schedules.find(item => item.date === formData.date && item.location === 'Lapangan' && item.id != formData.id);
  if (sameDateLapangan) {
    alert('Peringatan: Sudah ada jadwal nikah di Lapangan pada tanggal yang sama!');
  }

  const newSchedules = document.getElementById('scheduleId').value
    ? schedules.map(item => item.id == formData.id ? formData : item)
    : [...schedules, formData];

  localStorage.setItem('weddingSchedules', JSON.stringify(newSchedules));
  loadScheduleData();
  updateCalendar();
  document.getElementById('scheduleModal').style.display = 'none';
  showNotification('Sukses', { body: `Jadwal nikah ${formData.groomName} & ${formData.brideName} berhasil disimpan`, type: 'success' });
}

function editSchedule(id) {
  const schedule = scheduleData.find(item => item.id == id);
  if (schedule) openModal('Edit Jadwal Nikah', schedule);
}

function deleteSchedule(id) {
  if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
    const schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
    const updated = schedules.filter(item => item.id != id);
    localStorage.setItem('weddingSchedules', JSON.stringify(updated));
    loadScheduleData();
    updateCalendar();
    showNotification('Sukses', { body: 'Jadwal berhasil dihapus', type: 'success' });
    document.getElementById('scheduleModal').style.display = 'none';
  }
}

function downloadAsPdf() {
  const originalTable = document.getElementById('scheduleTable');
  const clonedTable = originalTable.cloneNode(true);

  // Hapus kolom aksi (kolom ke-10, index ke-9)
  clonedTable.querySelectorAll('tr').forEach(row => {
    if (row.cells.length >= 10) {
      row.deleteCell(9);
    }
  });

  const container = document.createElement('div');
  container.appendChild(clonedTable);

  const opt = {
    margin: 10,
    filename: `jadwal-nikah-${currentMonth + 1}-${currentYear}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().from(container).set(opt).save();
}

    const bodyRows = clonedTable.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        if (row.children.length > 9) {
            row.removeChild(row.lastElementChild);
        }
    });

    const container = document.createElement('div');
    container.appendChild(clonedTable);

    const opt = {
        margin: 10,
        filename: `jadwal-nikah-${currentMonth+1}-${currentYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().from(container).set(opt).save();
}

function downloadAsCsv() {
  const rows = [];
  const headers = ['Tanggal', 'Waktu', 'Pria', 'Wanita', 'HP', 'Lokasi', 'Keterangan'];
  rows.push(headers.join(','));

  scheduleData.forEach(item => {
    const row = [
      formatDate(item.date),
      item.time,
      `"${item.groomName}"`,
      `"${item.brideName}"`,
      item.groomPhone,
      `"${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}"`,
      `"${item.notes || ''}"`
    ];
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `jadwal-nikah-${currentMonth + 1}-${currentYear}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
}

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');
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
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch(err => console.log('SW registration failed:', err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

function showNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    alert(`${title}: ${options.body}`);
  }
}

function showUpdateNotification() {
  if (confirm('Versi baru tersedia! Muat ulang sekarang?')) {
    window.location.reload();
  }
}

function showThisWeekMarriageCount() {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(start.setDate(diff));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const count = scheduleData.filter(item => {
    const d = new Date(item.date + 'T00:00:00');
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  const header = document.querySelector('.header-title');
  const info = document.createElement('p');
  info.className = 'weekly-marriage-info';
  info.textContent = `Jumlah pernikahan minggu ini: ${count}`;
  header.appendChild(info);
}
