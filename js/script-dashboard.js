document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    initializeDashboard();
    registerServiceWorker();
});

// Variabel global
let scheduleData = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function initializeDashboard() {
    displayUserInfo();
    setupEventListeners();
    loadScheduleData();
    updateCalendar();
    showThisWeekMarriageCount(); // ← tambahan
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function displayUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
        document.getElementById('loggedInUser').textContent = 
            `${userData.name} (${userData.role})`;
    }
}

function setupEventListeners() {
    const modal = document.getElementById('scheduleModal');
    const addBtn = document.getElementById('addScheduleBtn');
    const closeBtn = document.querySelector('.close');

    addBtn.addEventListener('click', () => openModal('Tambah Jadwal Nikah'));
    closeBtn.addEventListener('click', () => modal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('scheduleForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        if (currentMonth === 11) currentYear--;
        updateCalendar();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        if (currentMonth === 0) currentYear++;
        updateCalendar();
    });

    document.getElementById('locationFilter').addEventListener('change', loadScheduleData);
    document.getElementById('location').addEventListener('change', function() {
        document.getElementById('locationDetailGroup').style.display = 
            this.value === 'Lapangan' ? 'block' : 'none';
    });

    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPdf);
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadAsCsv);
}

function loadScheduleData() {
    scheduleData = JSON.parse(localStorage.getItem('weddingSchedules')) || [];

    const locationFilter = document.getElementById('locationFilter').value;
    let filteredData = locationFilter === 'all' 
        ? scheduleData 
        : scheduleData.filter(item => item.location === locationFilter);

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
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                        "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('currentMonthYear').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    for (let i = 0; i < startingDay; i++) {
        calendarBody.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const currentDate = new Date(currentYear, currentMonth, day);
        const formattedDate = formatDateForComparison(currentDate);
        const sameDaySchedules = scheduleData.filter(item => 
            formatDateForComparison(new Date(item.date)) === formattedDate
        );

        if (sameDaySchedules.length > 0) {
            cell.classList.add('has-schedule');
            cell.style.backgroundColor = '#fff3b0';
            cell.innerHTML = `<div class="calendar-date">${day}</div>
                              <div class="schedule-count">${sameDaySchedules.length}</div>`;
            cell.addEventListener('click', () => renderScheduleTable(sameDaySchedules));
        } else {
            cell.textContent = day;
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
        locationDetail: document.getElementById('location').value === 'Lapangan' 
            ? document.getElementById('locationDetail').value 
            : '',
        documentStatus: document.getElementById('documentStatus').value,
        notes: document.getElementById('notes').value
    };

    if (!formData.groomName || !formData.brideName || !formData.date || !formData.time) {
        showNotification('Error', { body: 'Harap isi semua field yang diperlukan', type: 'error' });
        return;
    }

    const schedules = JSON.parse(localStorage.getItem('weddingSchedules')) || [];

    // Periksa konflik untuk Lapangan
    const conflict = schedules.find(s => 
        s.id !== formData.id &&
        s.date === formData.date &&
        s.location === 'Lapangan'
    );

    if (formData.location === 'Lapangan' && conflict) {
        showNotification('Peringatan', { body: 'Sudah ada jadwal di Lapangan pada tanggal tersebut!', type: 'warning' });
        return;
    }

    const updatedSchedules = document.getElementById('scheduleId').value
        ? schedules.map(item => item.id == formData.id ? formData : item)
        : [...schedules, formData];

    localStorage.setItem('weddingSchedules', JSON.stringify(updatedSchedules));

    loadScheduleData();
    updateCalendar();
    document.getElementById('scheduleModal').style.display = 'none';
    showNotification('Sukses', { 
        body: `Jadwal nikah ${formData.groomName} & ${formData.brideName} berhasil disimpan`, 
        type: 'success' 
    });
}

function editSchedule(id) {
    const schedule = scheduleData.find(item => item.id == id);
    if (schedule) openModal('Edit Jadwal Nikah', schedule);
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
    const element = document.getElementById('scheduleTable');
    const opt = {
        margin: 10,
        filename: `jadwal-nikah-${currentMonth + 1}-${currentYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
}

function downloadAsCsv() {
    const rows = [['Tanggal', 'Waktu', 'Pria', 'Wanita', 'HP', 'Lokasi', 'Status Berkas', 'Keterangan']];
    scheduleData.forEach(item => {
        rows.push([
            formatDate(item.date), item.time, `"${item.groomName}"`, `"${item.brideName}"`,
            item.groomPhone, `"${item.location}${item.locationDetail ? ' - ' + item.locationDetail : ''}"`,
            item.documentStatus, `"${item.notes || ''}"`
        ]);
    });
    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) window.location.href = 'login.html';
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('ServiceWorker registered');
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(err => console.log('SW registration failed:', err));
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
    if (confirm('Versi baru tersedia! Muat ulang sekarang?')) window.location.reload();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
}

function formatDateForComparison(date) {
    return date.toISOString().split('T')[0];
}

function showThisWeekMarriageCount() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const count = scheduleData.filter(item => {
        const date = new Date(item.date);
        return date >= startOfWeek && date <= endOfWeek;
    }).length;

    if (count > 0) {
        showNotification('Info', {
            body: `Ada ${count} pernikahan minggu ini.`,
            type: 'info'
        });
    }
}
