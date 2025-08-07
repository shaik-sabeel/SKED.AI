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

        // Chart instances
        this.categoryChartInstance = null;
        this.completionTrendChartInstance = null;
        this.priorityChartInstance = null;

        // Set default dates for custom range
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        this.startDate.value = this.formatDateForInput(lastWeek);
        this.endDate.value = this.formatDateForInput(today);

        // Setup event listeners
        this.setupEventListeners();
        this.requestNotificationPermission(); // Request notification permission on init
        this.scheduleDailyNotifications(); // Schedule daily notifications
    }

    setupEventListeners() {
        this.reportPeriod.addEventListener('change', () => this.handlePeriodChange());
        this.generateReportBtn.addEventListener('click', () => this.generateReport());
        this.downloadReportBtn.addEventListener('click', () => this.downloadPDF());
    }

    // Helper to format date for input (YYYY-MM-DD) - duplicated from TaskScheduler for clarity
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999); // Set end date to end of day for proper filtering
        return { startDate, endDate };
    }

    // NEW: Fetch data from the analytics API endpoint
    async generateReport() {
        this.reportPreview.innerHTML = '<p>Generating report...</p>'; // Loading state
        this.downloadReportBtn.disabled = true;
        this.destroyCharts(); // Clear previous charts

        const { startDate, endDate } = this.getDateRange();
        const apiUrl = this.taskScheduler.apiUrl; // Get API base URL from taskScheduler
        const authHeader = this.taskScheduler.getAuthHeader(); // Get auth header

        try {
            const response = await fetch(`${apiUrl}/analytics/tasks?startDate=${this.formatDateForInput(startDate)}&endDate=${this.formatDateForInput(endDate)}`, {
                headers: authHeader,
            });

            if (response.ok) {
                const data = await response.json();
                this.displayReport(data, startDate, endDate);
                this.downloadReportBtn.disabled = data.totalTasks === 0;
            } else if (response.status === 401 || response.status === 403) {
                this.taskScheduler.auth.logout(); // Redirect to login if unauthorized
            } else {
                console.error('Failed to fetch report data:', response.statusText);
                this.reportPreview.innerHTML = '<p class="error-message">Failed to load report. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            this.reportPreview.innerHTML = '<p class="error-message">An error occurred while connecting to the server for report data.</p>';
        }
    }

    // NEW: Display report and render charts
    displayReport(data, startDate, endDate) {
        const reportHTML = `
            <h3>Task Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h3>
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${data.totalTasks}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.completedTasks}</div>
                    <div class="stat-label">Completed Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.pendingTasks}</div>
                    <div class="stat-label">Pending Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
            </div>
            <div class="report-charts">
                <div class="chart-container">
                    <h3>Tasks by Category</h3>
                    <canvas id="categoryChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Completion Trend</h3>
                    <canvas id="completionTrendChart"></canvas>
                </div>
                 <div class="chart-container">
                    <h3>Priority Distribution</h3>
                    <canvas id="priorityChart"></canvas>
                </div>
            </div>
            <div class="report-tasks">
                <h4>Task Details</h4>
                ${data.tasksInPeriod.length > 0 ? `<ul class="task-list">
                    ${data.tasksInPeriod.map(task => `
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

        // Render Charts after DOM is updated
        this.renderCategoryChart(data.categoryBreakdown);
        this.renderCompletionTrendChart(data.completionTrend, startDate, endDate);
        this.renderPriorityChart(data.tasksInPeriod); // Pass tasksInPeriod to deduce priority breakdown
    }

    // NEW: Render Category Chart
    renderCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;

        const labels = Object.keys(categoryData);
        const values = Object.values(categoryData);

        const backgroundColors = labels.map((_, i) => `hsl(${i * 60 % 360}, 70%, 50%, 0.7)`); // Dynamic colors
        const borderColors = labels.map((_, i) => `hsl(${i * 60 % 360}, 70%, 50%, 1)`);

        this.categoryChartInstance = new Chart(ctx, {
            type: 'pie', // Pie chart for distribution
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                let label = tooltipItem.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += tooltipItem.raw;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // NEW: Render Completion Trend Chart (e.g., bar chart)
    renderCompletionTrendChart(completionTrendData, startDate, endDate) {
        const ctx = document.getElementById('completionTrendChart')?.getContext('2d');
        if (!ctx) return;

        // Generate all dates within the range for consistent axis
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const dataPoints = dates.map(date => completionTrendData[date] || 0);

        this.completionTrendChartInstance = new Chart(ctx, {
            type: 'bar', // Bar chart for trend
            data: {
                labels: dates,
                datasets: [{
                    label: 'Tasks Completed',
                    data: dataPoints,
                    backgroundColor: 'var(--primary)',
                    borderColor: 'var(--primary-hover)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Date',
                            color: 'var(--text-secondary)'
                        },
                        ticks: { color: 'var(--text-secondary)' },
                        grid: { color: 'var(--border)' }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Tasks',
                            color: 'var(--text-secondary)'
                        },
                        ticks: { color: 'var(--text-secondary)', stepSize: 1 },
                        grid: { color: 'var(--border)' }
                    }
                },
                plugins: {
                    legend: {
                        display: false // No legend for a single dataset
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(tooltipItem) {
                                return `Completed: ${tooltipItem.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // NEW: Render Priority Distribution Chart (e.g., doughnut chart)
    renderPriorityChart(tasks) {
        const ctx = document.getElementById('priorityChart')?.getContext('2d');
        if (!ctx) return;

        const priorityBreakdown = tasks.reduce((acc, task) => {
            const priority = task.priority || 'Unknown'; // Fallback
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, { 'High': 0, 'Medium': 0, 'Low': 0 }); // Ensure all priorities are in data

        const labels = ['High', 'Medium', 'Low'];
        const values = labels.map(p => priorityBreakdown[p]);

        const backgroundColors = [
            'var(--priority-high-bg)', // Example colors, can refine
            'var(--priority-medium-bg)',
            'var(--priority-low-bg)'
        ];
        const borderColors = [
            'var(--priority-high-text)',
            'var(--priority-medium-text)',
            'var(--priority-low-text)'
        ];

        this.priorityChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                let label = tooltipItem.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += tooltipItem.raw;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // NEW: Destroy existing charts before rendering new ones
    destroyCharts() {
        if (this.categoryChartInstance) {
            this.categoryChartInstance.destroy();
            this.categoryChartInstance = null;
        }
        if (this.completionTrendChartInstance) {
            this.completionTrendChartInstance.destroy();
            this.completionTrendChartInstance = null;
        }
        if (this.priorityChartInstance) {
            this.priorityChartInstance.destroy();
            this.priorityChartInstance = null;
        }
    }


    async downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yOffset = 20;

        // Retrieve the data currently displayed in the report
        // Re-fetch or pass data directly to avoid inconsistencies
        const { startDate, endDate } = this.getDateRange();
        const apiUrl = this.taskScheduler.apiUrl;
        const authHeader = this.taskScheduler.getAuthHeader();

        try {
            const response = await fetch(`${apiUrl}/analytics/tasks?startDate=${this.formatDateForInput(startDate)}&endDate=${this.formatDateForInput(endDate)}`, {
                headers: authHeader,
            });

            if (!response.ok) {
                alert('Could not fetch data for PDF. Please regenerate the report.');
                return;
            }
            const data = await response.json();
            const tasks = data.tasksInPeriod;

            // Add title
            doc.setFontSize(20);
            doc.text('Task Report', 20, yOffset);
            yOffset += 10;

            // Add date range
            doc.setFontSize(12);
            doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, yOffset);
            yOffset += 15;

            // Add statistics
            doc.setFontSize(10);
            doc.text(`Total Tasks: ${data.totalTasks}`, 20, yOffset);
            yOffset += 7;
            doc.text(`Completed Tasks: ${data.completedTasks}`, 20, yOffset);
            yOffset += 7;
            doc.text(`Pending Tasks: ${data.pendingTasks}`, 20, yOffset);
            yOffset += 7;
            doc.text(`Completion Rate: ${data.completionRate.toFixed(1)}%`, 20, yOffset);
            yOffset += 15;


            // Add charts as images
            doc.setFontSize(14);
            doc.text('Visual Summaries', 20, yOffset);
            yOffset += 10;

            if (this.categoryChartInstance) {
                const imgData = this.categoryChartInstance.toBase64Image();
                if (yOffset + 70 > 280) { // Check for page break
                    doc.addPage();
                    yOffset = 20;
                }
                doc.setFontSize(10);
                doc.text('Tasks by Category:', 20, yOffset);
                doc.addImage(imgData, 'PNG', 20, yOffset + 5, 80, 80); // Adjust position and size
                yOffset += 90;
            }

            if (this.completionTrendChartInstance) {
                 if (yOffset + 70 > 280) {
                    doc.addPage();
                    yOffset = 20;
                }
                const imgData = this.completionTrendChartInstance.toBase64Image();
                doc.setFontSize(10);
                doc.text('Completion Trend:', 20, yOffset);
                doc.addImage(imgData, 'PNG', 20, yOffset + 5, 120, 70); // Adjust size for landscape bar chart
                yOffset += 80;
            }

            if (this.priorityChartInstance) {
                 if (yOffset + 70 > 280) {
                    doc.addPage();
                    yOffset = 20;
                }
                const imgData = this.priorityChartInstance.toBase64Image();
                doc.setFontSize(10);
                doc.text('Priority Distribution:', 20, yOffset);
                doc.addImage(imgData, 'PNG', 20, yOffset + 5, 80, 80); // Adjust position and size
                yOffset += 90;
            }


            // Add task list
            doc.setFontSize(14);
            doc.text('Task Details', 20, yOffset);
            yOffset += 10;
            if (tasks.length === 0) {
                doc.setFontSize(10);
                doc.text('No tasks found for the selected period.', 20, yOffset);
                yOffset += 10;
            } else {
                doc.setFontSize(9); // Smaller font for task details
                tasks.forEach((task, index) => {
                    const status = task.completed ? 'Completed' : 'Pending';
                    const taskDetail = `${index + 1}. ${this.taskScheduler.escapeHtml(task.title)}`;
                    const taskMeta = `   Due: ${this.taskScheduler.formatDate(task.dueDate)}${task.dueTime ? ` ${task.dueTime}` : ''}, Priority: ${task.priority}, Status: ${status}`;

                    const detailHeight = doc.getTextDimensions(taskDetail, { maxWidth: 170 }).h;
                    const metaHeight = doc.getTextDimensions(taskMeta, { maxWidth: 170 }).h;

                    if (yOffset + detailHeight + metaHeight + 5 > 280) { // Check for page break
                        doc.addPage();
                        yOffset = 20;
                        doc.setFontSize(14);
                        doc.text('Task Details (continued)', 20, yOffset);
                        yOffset += 10;
                        doc.setFontSize(9);
                    }
                    doc.text(taskDetail, 20, yOffset, { maxWidth: 170 });
                    doc.text(taskMeta, 20, yOffset + detailHeight, { maxWidth: 170 });
                    yOffset += detailHeight + metaHeight + 5;
                });
            }

            // Save the PDF
            doc.save(`Task_Report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('An error occurred while generating the PDF. Check console for details.');
        }
    }


    // =========================================================
    // NEW: Notification Features
    // =========================================================

    requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            console.log("Notification permission already granted.");
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted!");
                } else {
                    console.warn("Notification permission denied.");
                }
            });
        }
    }

    scheduleDailyNotifications() {
        // Set an interval to check for upcoming tasks every day
        // For production, you might want a more robust server-side push notification or service worker.
        // For a client-side simple reminder, an interval like this is fine.
        setInterval(() => {
            this.checkAndNotifyUpcomingTasks();
        }, 1000 * 60 * 60 * 24); // Check every 24 hours (or adjust for testing: 1000 * 60 * 5 for 5 mins)

        // Run immediately on load as well
        this.checkAndNotifyUpcomingTasks();
    }

    checkAndNotifyUpcomingTasks() {
        if (Notification.permission !== "granted") {
            return; // Don't notify if permission not granted
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        // Filter for tasks due today or tomorrow, and not completed
        const upcomingTasks = this.taskScheduler.tasks.filter(task => {
            if (task.completed) return false;

            const taskDueDate = new Date(task.dueDate);
            taskDueDate.setHours(0, 0, 0, 0); // Normalize to start of day

            const isDueToday = taskDueDate.getTime() === today.setHours(0,0,0,0);
            const isDueTomorrow = taskDueDate.getTime() === tomorrow.setHours(0,0,0,0);
            const isDueInNextTwoDays = taskDueDate.getTime() <= twoDaysFromNow.setHours(0,0,0,0) && taskDueDate.getTime() >= today.setHours(0,0,0,0);


            // Re-normalize 'today' and 'tomorrow' dates as Date objects are mutated by setHours
            const freshToday = new Date();
            freshToday.setHours(0, 0, 0, 0);
            const freshTomorrow = new Date();
            freshTomorrow.setDate(freshToday.getDate() + 1);
            freshTomorrow.setHours(0, 0, 0, 0);

            // Notify for tasks due today or tomorrow
            return (taskDueDate.getTime() === freshToday.getTime() || taskDueDate.getTime() === freshTomorrow.getTime());
        });

        if (upcomingTasks.length > 0) {
            let notificationMessage = '';
            const dueTodayCount = upcomingTasks.filter(task => {
                const taskDueDate = new Date(task.dueDate);
                return taskDueDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
            }).length;

            const dueTomorrowCount = upcomingTasks.filter(task => {
                const taskDueDate = new Date(task.dueDate);
                return taskDueDate.toISOString().split('T')[0] === new Date(tomorrow).toISOString().split('T')[0];
            }).length;

            if (dueTodayCount > 0 && dueTomorrowCount > 0) {
                notificationMessage = `You have ${dueTodayCount} tasks due today and ${dueTomorrowCount} due tomorrow!`;
            } else if (dueTodayCount > 0) {
                notificationMessage = `You have ${dueTodayCount} tasks due today!`;
            } else if (dueTomorrowCount > 0) {
                notificationMessage = `You have ${dueTomorrowCount} tasks due tomorrow.`;
            } else {
                notificationMessage = `You have ${upcomingTasks.length} upcoming tasks!`;
            }

            const options = {
                body: notificationMessage,
                icon: 'https://cdn-icons-png.flaticon.com/512/32/32578.png' // You can add a local icon
            };
            new Notification('SKED.AI: Upcoming Tasks', options);
        }
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
            const reportPreview = document.getElementById('report-preview');
            if(reportPreview) {
                reportPreview.innerHTML = '<p class="empty-report">Loading tasks for report... (If this persists, refresh the page)</p>';
            }
            const downloadReportBtn = document.getElementById('download-report');
            if(downloadReportBtn) {
                downloadReportBtn.disabled = true;
            }
        }
    }, 5000);
});