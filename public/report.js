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
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
                endDate.setHours(23, 59, 59, 999); // Set to end of day
                break;
            case 'custom':
                startDate = new Date(this.startDate.value);
                startDate.setHours(0, 0, 0, 0); // Set to beginning of day
                endDate = new Date(this.endDate.value);
                endDate.setHours(23, 59, 59, 999); // Set to end of day
                break;
            default:
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                endDate = today;
                endDate.setHours(23, 59, 59, 999);
        }

        return { startDate, endDate };
    }

    generateReport() {
        // Access tasks from the global taskScheduler instance
        if (!this.taskScheduler || !this.taskScheduler.tasks) {
            console.error('TaskScheduler or tasks not available for report generation.');
            this.reportPreview.innerHTML = '<p>Error: Could not retrieve tasks for the report.</p>';
            this.downloadReportBtn.disabled = true;
            return;
        }

        const { startDate, endDate } = this.getDateRange();
        // Convert dueDate string to Date object for comparison
        const tasks = this.taskScheduler.tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= startDate && taskDate <= endDate;
        }).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Sort by date for consistent reporting

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
                ${tasks.length > 0 ? `<ul class="task-list">
                    ${tasks.map(task => `
                        <li class="task-item">
                            <div class="task-info">
                                <div>${this.taskScheduler.escapeHtml(task.title)}</div>
                                <div class="task-meta">Due: ${this.taskScheduler.formatDate(task.dueDate)} ${task.dueTime || ''}</div>
                            </div>
                            <span class="task-status ${task.completed ? 'status-completed' : 'status-pending'}">
                                ${task.completed ? 'Completed' : 'Pending'}
                            </span>
                        </li>
                    `).join('')}
                </ul>` : '<p class="empty-report">No tasks found for the selected period.</p>'}
            </div>
        `;

        this.reportPreview.innerHTML = reportHTML;
        this.downloadReportBtn.disabled = tasks.length === 0; // Disable download if no tasks
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
        if (tasks.length === 0) {
            doc.text('No tasks found for the selected period.', 20, y);
            y += 10;
        } else {
            tasks.forEach((task, index) => {
                if (y > 270) { // Adjust y threshold if needed
                    doc.addPage();
                    y = 20; // Reset y for new page
                    doc.setFontSize(12);
                    doc.text('Task Details (continued):', 20, 20); // Add a header for continuation pages
                    y += 10;
                }
                const status = task.completed ? 'Completed' : 'Pending';
                const taskText = `${index + 1}. ${this.taskScheduler.escapeHtml(task.title)} (Due: ${this.taskScheduler.formatDate(task.dueDate)}${task.dueTime ? ` ${task.dueTime}` : ''}, Priority: ${task.priority}, Status: ${status})`;
                
                doc.text(taskText, 20, y, { maxWidth: 170 }); // maxWidth to wrap long titles
                y += (doc.getTextDimensions(taskText, { maxWidth: 170 }).h + 2); // Dynamically adjust line height
            });
        }


        // Save the PDF
        doc.save(`Task_Report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.pdf`);
    }
}

// Initialize report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for taskScheduler to be initialized
    const checkTaskScheduler = setInterval(() => {
        if (window.taskScheduler && window.taskScheduler.tasks !== undefined) {
            clearInterval(checkTaskScheduler);
            const report = new Report(window.taskScheduler);
        }
    }, 100);

    // Timeout after 5 seconds if taskScheduler is not initialized
    setTimeout(() => {
        if (!window.taskScheduler || window.taskScheduler.tasks === undefined) {
            console.error('TaskScheduler initialization for Report timed out or tasks not yet available.');
            // Provide a visual indication if needed, or handle graceully.
            document.getElementById('report-preview').innerHTML = '<p>Loading tasks for report... (If this persists, refresh the page)</p>';
            document.getElementById('download-report').disabled = true;
        }
    }, 5000);
});