// Report class to handle report generation and PDF download
class Report {
    constructor(taskScheduler) {
        this.taskScheduler = taskScheduler;
        this.init();
    }

    init() {
        // Initialize DOM elements
        this.reportPeriod = document.getElementById('report-period');
        this.customDateRange = document.getElementById('custom-date-range');
        this.startDate = document.getElementById('start-date');
        this.endDate = document.getElementById('end-date');
        this.generateReportBtn = document.getElementById('generate-report');
        this.downloadReportBtn = document.getElementById('download-report');
        this.reportPreview = document.getElementById('report-preview');

        // Set default dates for custom range
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        
        this.startDate.value = lastWeek.toISOString().split('T')[0];
        this.endDate.value = today.toISOString().split('T')[0];

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.reportPeriod.addEventListener('change', () => this.handlePeriodChange());
        this.generateReportBtn.addEventListener('click', () => this.generateReport());
        this.downloadReportBtn.addEventListener('click', () => this.downloadPDF());
    }

    handlePeriodChange() {
        if (this.reportPeriod.value === 'custom') {
            this.customDateRange.style.display = 'flex';
        } else {
            this.customDateRange.style.display = 'none';
        }
    }

    getDateRange() {
        const today = new Date();
        let startDate, endDate;

        switch (this.reportPeriod.value) {
            case 'weekly':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                endDate = today;
                break;
            case 'monthly':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'custom':
                startDate = new Date(this.startDate.value);
                endDate = new Date(this.endDate.value);
                break;
            default:
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                endDate = today;
        }

        return { startDate, endDate };
    }

    generateReport() {
        const { startDate, endDate } = this.getDateRange();
        const tasks = this.taskScheduler.tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= startDate && taskDate <= endDate;
        });

        const completedTasks = tasks.filter(task => task.completed);
        const pendingTasks = tasks.filter(task => !task.completed);
        const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

        // Generate report HTML
        const reportHTML = `
            <h3>Task Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h3>
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${tasks.length}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completedTasks.length}</div>
                    <div class="stat-label">Completed Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${pendingTasks.length}</div>
                    <div class="stat-label">Pending Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
            </div>
            <div class="report-tasks">
                <h4>Task Details</h4>
                <ul class="task-list">
                    ${tasks.map(task => `
                        <li class="task-item">
                            <div class="task-info">
                                <div>${task.title}</div>
                                <div class="task-meta">Due: ${task.dueDate} ${task.dueTime || ''}</div>
                            </div>
                            <span class="task-status ${task.completed ? 'status-completed' : 'status-pending'}">
                                ${task.completed ? 'Completed' : 'Pending'}
                            </span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        this.reportPreview.innerHTML = reportHTML;
        this.downloadReportBtn.disabled = false;
    }

    async downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Task Report', 20, 20);

        // Add date range
        const { startDate, endDate } = this.getDateRange();
        doc.setFontSize(12);
        doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, 30);

        // Add statistics
        const tasks = this.taskScheduler.tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= startDate && taskDate <= endDate;
        });

        const completedTasks = tasks.filter(task => task.completed);
        const pendingTasks = tasks.filter(task => !task.completed);
        const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

        doc.text('Statistics:', 20, 40);
        doc.text(`Total Tasks: ${tasks.length}`, 20, 50);
        doc.text(`Completed Tasks: ${completedTasks.length}`, 20, 60);
        doc.text(`Pending Tasks: ${pendingTasks.length}`, 20, 70);
        doc.text(`Completion Rate: ${completionRate.toFixed(1)}%`, 20, 80);

        // Add task list
        doc.text('Task Details:', 20, 90);
        let y = 100;
        tasks.forEach((task, index) => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${index + 1}. ${task.title}`, 20, y);
            doc.text(`   Due: ${task.dueDate} ${task.dueTime || ''}`, 20, y + 5);
            doc.text(`   Status: ${task.completed ? 'Completed' : 'Pending'}`, 20, y + 10);
            y += 20;
        });

        // Save the PDF
        doc.save('task_report.pdf');
    }
}

// Initialize report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for taskScheduler to be initialized
    const checkTaskScheduler = setInterval(() => {
        if (window.taskScheduler) {
            clearInterval(checkTaskScheduler);
            const report = new Report(window.taskScheduler);
        }
    }, 100);

    // Timeout after 5 seconds if taskScheduler is not initialized
    setTimeout(() => {
        if (!window.taskScheduler) {
            console.error('TaskScheduler initialization timed out');
        }
    }, 5000);
}); 