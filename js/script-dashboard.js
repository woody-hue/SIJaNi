// script-dashboard.js

// DOM Loaded
document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus();
    showThisWeekMarriageCount();
    initializeDashboard();
    registerServiceWorker();
});

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
    document.getElementById('addScheduleBtn').addEventListener('click', () => openModal('Tambah Jadwal Nikah'));
    document.querySelector('.close').addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('prevMonthBtn').addEventListener('click', () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } updateCalendar(); });
    document.getElementById('nextMonthBtn').addEventListener('click', () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } updateCalendar(); });
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
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= firstDay && itemDate <= lastDay;
    });
    renderScheduleTable(filteredData);
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
            <td>${item.documentStatus}</td>
            <td>${item.notes || '-'}</td>
            <td>
                <button class="edit-btn" data-id="${item.id}">Edit</button>
                <button class="delete-btn" data-id="${item.id}">Hapus</button>
            </td>
        `;
        tbody.appendChild(row);
    });
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
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    for (let i = 0; i < startingDay; i++) calendarBody.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const currentDate = new Date(currentYear, currentMonth, day);
        const formattedDate = formatDateForComparison(currentDate);
        const filtered = scheduleData.filter(item => formatDateForComparison(new Date(item.date)) === formattedDate);
        cell.textContent = day;
        if (filtered.length > 0) {
            cell.classList.add('has-schedule');
            const badge = document.createElement('span');
            badge.className = 'schedule-count';
            badge.textContent = filtered.length;
            cell.appendChild(badge);
            cell.addEventListener('click', () => renderScheduleTable(filtered));
        }
        calendarBody.appendChild(cell);
    }
}

function showThisWeekMarriageCount() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const count = scheduleData.filter(item => {
        const date = new Date(item.date);
        return date >= start && date <= end;
    }).length;
    document.getElementById('thisWeekCount').textContent = `Pernikahan minggu ini: ${count}`;
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
        showNotification('Error', { body: 'Harap isi semua field yang diperlukan', type: 'error' });
        return;
    }

    const sameDateLapangan = scheduleData.some(item =>
        item.date === formData.date && item.location === 'Lapangan' && item.id !== formData.id
    );
    if (formData.location === 'Lapangan' && sameDateLapangan) {
        showNotification('Peringatan', { body: 'Sudah ada jadwal di Lapangan pada hari ini!', type: 'warning' });
        return;
    }

    let schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
    if (document.getElementById('scheduleId').value) {
        schedules = schedules.map(item => item.id == formData.id ? formData : item);
    } else {
        schedules.push(formData);
    }
    localStorage.setItem('weddingSchedules', JSON.stringify(schedules));
    loadScheduleData();
    updateCalendar();
    document.getElementById('scheduleModal').style.display = 'none';
    showNotification('Sukses', { body: `Jadwal nikah ${formData.groomName} & ${formData.brideName} berhasil disimpan`, type: 'success' });
}

function editSchedule(id) {
    const data = scheduleData.find(item => item.id == id);
    if (data) openModal('Edit Jadwal Nikah', data);
}

function deleteSchedule(id) {
    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
        let schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];
        schedules = schedules.filter(item => item.id != id);
        localStorage.setItem('weddingSchedules', JSON.stringify(schedules));
        loadScheduleData();
        updateCalendar();
        showNotification('Sukses', { body: 'Jadwal berhasil dihapus', type: 'success' });
        document.getElementById('scheduleModal').style.display = 'none';
    }
}

function downloadAsPdf() {
    const opt = { margin: 10, filename: `jadwal-nikah-${currentMonth + 1}-${currentYear}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().from(document.getElementById('scheduleTable')).set(opt).save();
}

function downloadAsCsv() {
    const rows = [['Tanggal', 'Waktu', 'Pria', 'Wanita', 'HP', 'Lokasi', 'Status Berkas', 'Keterangan']];
    scheduleData.forEach(item => {
        rows.push([
            formatDate(item.date),
            item.time,
            item.groomName,
            item.brideName,
            item.groomPhone,
            `${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}`,
            item.documentStatus,
            item.notes || ''
        ]);
    });
    const blob = new Blob([rows.map(e => e.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
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
    const date = new Date(dateString);
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
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) showUpdateNotification();
                });
            });
        }).catch(err => console.log('SW registration failed:', err));
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
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
    if (confirm('Versi baru tersedia! Muat ulang sekarang untuk mendapatkan fitur terbaru?')) window.location.reload();
}
