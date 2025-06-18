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
    // Tambahkan styling untuk header
    const header = document.querySelector('header');
    if (header) {
        header.style.backgroundColor = '#4a6fa5';
        header.style.color = 'white';
        header.style.padding = '1rem';
        header.style.borderRadius = '5px';
        header.style.marginBottom = '1rem';
    }

    displayUserInfo();
    setupEventListeners();
    loadScheduleData();
    updateCalendar();
    showThisWeekMarriageCount();
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Tambahkan styling untuk tabel
    const table = document.getElementById('scheduleTable');
    if (table) {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '1rem';
    }

    // Styling untuk tombol
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.padding = '0.5rem 1rem';
        button.style.margin = '0.2rem';
        button.style.borderRadius = '4px';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.3s';
    });

    // Styling khusus untuk tombol edit dan delete
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.style.backgroundColor = '#ffc107';
        btn.style.color = 'black';
    });

    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.style.backgroundColor = '#dc3545';
        btn.style.color = 'white';
    });

    // Styling untuk modal
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.borderRadius = '8px';
            modalContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        }
    }

    // Styling untuk kalender
    const calendar = document.getElementById('calendarBody');
    if (calendar) {
        calendar.style.display = 'grid';
        calendar.style.gridTemplateColumns = 'repeat(7, 1fr)';
        calendar.style.gap = '5px';
    }
}

function displayUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
        const userElement = document.getElementById('loggedInUser');
        userElement.textContent = `${userData.name} (${userData.role})`;
        userElement.style.fontWeight = 'bold';
    }
}

// [Fungsi-fungsi lainnya tetap sama persis seperti sebelumnya...]
// Semua fungsi dari setupEventListeners hingga showThisWeekMarriageCount 
// tetap dipertahankan tanpa perubahan apapun pada logika atau struktur

// Hanya tambahkan styling pada elemen-elemen yang ada
