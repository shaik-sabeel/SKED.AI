class Task {
    // Backend assigns _id, frontend uses it as id
    constructor(id, title, description, dueDate, dueTime, priority, category, completed = false, createdAt = new Date().toISOString()) {
      this.id = id; // _id from MongoDB
      this.title = title;
      this.description = description;
      this.dueDate = dueDate;
      this.dueTime = dueTime;
      this.priority = priority;
      this.category = category;
      this.completed = completed;
      this.createdAt = createdAt; // For sorting and report filtering
    }
  }

  // Main application class
  class TaskScheduler {
    constructor() {
      this.tasks = [];
      this.currentEditingTask = null;
      this.currentFilter = 'all';
      this.searchTerm = '';
      this.currentMonth = new Date();
      this.apiUrl = 'http://localhost:3000/api'; // Backend API URL
      this.auth = window.auth; // Access global Auth instance

      // Check auth status first
      this.auth.checkAuthStatus();

      // Initialize UI after basic checks
      this.initUI();

      // Fetch tasks from backend instead of localStorage
      this.fetchTasks();

      // Generate AI suggestions (still client-side for now)
      this.generateSuggestions();

      this.updateUserName(); // Update user name on dashboard
    }

    // Helper to get JWT token from auth instance
    getAuthHeader() {
      const token = this.auth.getToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // New: Fetch tasks from the backend
    async fetchTasks() {
        try {
            const response = await fetch(`${this.apiUrl}/tasks`, {
                headers: this.getAuthHeader(),
            });

            if (response.ok) {
                const data = await response.json();
                this.tasks = data.map(taskData => new Task(
                    taskData._id, // MongoDB _id
                    taskData.title,
                    taskData.description,
                    taskData.dueDate,
                    taskData.dueTime,
                    taskData.priority,
                    taskData.category,
                    taskData.completed,
                    taskData.createdAt
                ));
                this.updateUI(); // Refresh UI with fetched tasks
            } else if (response.status === 401 || response.status === 403) {
                // Token invalid or missing, redirect to login
                this.auth.logout();
            } else {
                console.error('Failed to fetch tasks:', response.statusText);
                alert('Failed to load tasks. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            alert('An error occurred while connecting to the server. Please try again later.');
        }
    }

    // Existing load/save tasks methods will be replaced by API calls
    // saveTasks() no longer saves to localStorage directly but makes API calls
    // loadTasks() is replaced by fetchTasks()

    // Initialize UI elements and event listeners
    initUI() {
      // Tab switching
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabName = button.dataset.tab;

          // Update active tab button
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          // Show selected tab content
          tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabName}-view`) {
              content.classList.add('active');
            }
          });

          // Update calendar if calendar tab is selected
          if (tabName === 'calendar') {
            this.renderCalendar();
          }
        });
      });

      // Task form modal
      const addTaskBtn = document.getElementById('add-task-btn');
      const taskFormModal = document.getElementById('task-form-modal');
      const closeModal = document.getElementById('close-modal');
      const cancelTask = document.getElementById('cancel-task');
      const taskForm = document.getElementById('task-form');

      addTaskBtn.addEventListener('click', () => {
        this.openTaskForm();
      });

      closeModal.addEventListener('click', () => {
        this.closeTaskForm();
      });

      cancelTask.addEventListener('click', () => {
        this.closeTaskForm();
      });

      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskFormSubmit();
      });

      // Filter buttons
      const filterButtons = document.querySelectorAll('.filter-button');
      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.currentFilter = button.dataset.filter;

          // Update active filter button
          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          // Refresh task list
          this.renderTasks();
        });
      });

      // Search input
      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderTasks();
      });

      // Calendar navigation
      const prevMonthBtn = document.getElementById('prev-month');
      const nextMonthBtn = document.getElementById('next-month');

      prevMonthBtn.addEventListener('click', () => {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
        this.renderCalendar();
      });

      nextMonthBtn.addEventListener('click', () => {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
        this.renderCalendar();
      });

      // Refresh suggestions button
      const refreshSuggestionsBtn = document.getElementById('refresh-suggestions');
      refreshSuggestionsBtn.addEventListener('click', () => {
        this.generateSuggestions();
      });

      // Set default due date to today
      const dueDateInput = document.getElementById('due-date');
      dueDateInput.value = this.formatDateForInput(new Date());

      // Initial render (will be updated by fetchTasks later)
      this.renderTasks();
    }

    // New: Update user name displayed on the dashboard
    updateUserName() {
        const userNameSpan = document.getElementById('user-name');
        const userData = localStorage.getItem('user');
        if (userNameSpan && userData) {
            try {
                const user = JSON.parse(userData);
                userNameSpan.textContent = user.name;
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
                this.auth.logout();
            }
        }
    }

    // Open task form modal
    openTaskForm(task = null) {
      const modal = document.getElementById('task-form-modal');
      const modalTitle = document.getElementById('modal-title');
      const form = document.getElementById('task-form');
      const submitButton = form.querySelector('button[type="submit"]');

      form.reset(); // Reset form

      // Set default due date to today if adding new task
      const dueDateInput = document.getElementById('due-date');
      if (!task) {
          dueDateInput.value = this.formatDateForInput(new Date());
      }


      // Set default priority to Medium
      document.getElementById('priority-medium').checked = true;

      if (task) {
        // Edit existing task
        this.currentEditingTask = task;
        modalTitle.textContent = 'Edit Task';
        submitButton.textContent = 'Update Task';

        // Fill form with task data
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('due-date').value = task.dueDate;
        document.getElementById('due-time').value = task.dueTime || '';
        const priorityRadio = document.getElementById(`priority-${task.priority.toLowerCase()}`);
        if (priorityRadio) priorityRadio.checked = true;
        document.getElementById('category').value = task.category || '';
      } else {
        // Add new task
        this.currentEditingTask = null;
        modalTitle.textContent = 'Add New Task';
        submitButton.textContent = 'Add Task';
      }

      modal.classList.add('active');
    }

    // Close task form modal
    closeTaskForm() {
      const modal = document.getElementById('task-form-modal');
      modal.classList.remove('active');
      this.currentEditingTask = null;
    }

    // New: Handle task creation/update API calls
    async handleTaskFormSubmit() {
        const form = document.getElementById('task-form');
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const dueDate = document.getElementById('due-date').value;
        const dueTime = document.getElementById('due-time').value;
        const priority = document.querySelector('input[name="priority"]:checked').value;
        const category = document.getElementById('category').value;

        if (!title || !dueDate) {
            alert('Please enter a task title and due date');
            return;
        }

        const taskData = {
            title,
            description,
            dueDate,
            dueTime,
            priority,
            category,
        };

        try {
            let response;
            if (this.currentEditingTask) {
                // Update existing task
                response = await fetch(`${this.apiUrl}/tasks/${this.currentEditingTask.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeader(),
                    },
                    body: JSON.stringify({ ...taskData, completed: this.currentEditingTask.completed }),
                });
            } else {
                // Add new task
                response = await fetch(`${this.apiUrl}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeader(),
                    },
                    body: JSON.stringify(taskData),
                });
            }

            if (response.ok) {
                await this.fetchTasks(); // Re-fetch all tasks to ensure consistency
                this.closeTaskForm();
            } else if (response.status === 401 || response.status === 403) {
                this.auth.logout();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'Failed to save task. Please try again.'}`);
            }
        } catch (error) {
            console.error('Error submitting task form:', error);
            alert('An error occurred while saving the task. Please check your network and try again.');
        }
    }

    // Render tasks list (mostly same, but now uses this.tasks from backend)
    renderTasks() {
      const tasksContainer = document.getElementById('tasks-container');
      const emptyState = document.getElementById('empty-state');

      if (!tasksContainer) {
        console.error('Tasks container not found');
        return;
      }

      // Clear container first
      tasksContainer.innerHTML = '';

      // Filter tasks based on current filter and search term
      const filteredTasks = this.tasks
        .filter(task => {
          if (this.currentFilter === 'active') return !task.completed;
          if (this.currentFilter === 'completed') return task.completed;
          return true;
        })
        .filter(task => {
          if (!this.searchTerm) return true;
          return (
            task.title.toLowerCase().includes(this.searchTerm) ||
            task.description.toLowerCase().includes(this.searchTerm) ||
            task.category.toLowerCase().includes(this.searchTerm) || // Added category search
            task.priority.toLowerCase().includes(this.searchTerm)
          );
        })
        .sort((a, b) => {
          // Parse dates correctly, handling missing time
          const dateA = new Date(a.dueDate + (a.dueTime ? `T${a.dueTime}` : ''));
          const dateB = new Date(b.dueDate + (b.dueTime ? `T${b.dueTime}` : ''));

          // Fallback if date parsing fails (e.g., invalid date format)
          const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

          if (timeA !== timeB) return timeA - timeB;

          // If due dates are same, sort by priority
          const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      // Show empty state if no tasks
      if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `
          <div class="empty-state">
            <p>${this.tasks.length === 0 ? 'No tasks yet. Add your first task to get started!' : 'No tasks match your current filters.'}</p>
          </div>
        `;
      } else {
        // if emptyState div exists, make sure it's hidden (handle if its not found also)
        const currentEmptyState = tasksContainer.querySelector('.empty-state');
        if(currentEmptyState) currentEmptyState.style.display = 'none';

        filteredTasks.forEach(task => {
          const taskElement = this.createTaskElement(task);
          tasksContainer.appendChild(taskElement);
        });
      }
    }

    // Create task element (no changes here for data, only rendering)
    createTaskElement(task) {
      const taskElement = document.createElement('div');
      taskElement.className = `task-card ${task.completed ? 'task-completed' : ''}`;
      taskElement.setAttribute('data-task-id', task.id); // Use MongoDB _id as data-task-id

      const formattedDate = this.formatDate(task.dueDate);

      taskElement.innerHTML = `
        <div class="task-header">
          <div class="task-title-container">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-title-wrapper">
              <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
              <div class="task-badges">
                <span class="badge badge-priority-${task.priority}">${task.priority}</span>
                ${task.category ? `<span class="badge badge-category">${this.escapeHtml(task.category)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action-button edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="task-action-button delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
        <p class="task-description">${this.escapeHtml(task.description)}</p>
        <div class="task-meta">
          <div class="task-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${formattedDate}
          </div>
          ${task.dueTime ? `
            <div class="task-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${task.dueTime}
            </div>
          ` : ''}
        </div>
      `;

      // Add event listeners
      const checkbox = taskElement.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => {
        this.toggleTaskCompletion(task.id, task.completed); // Pass current completion status
      });

      const editButton = taskElement.querySelector('.task-action-button.edit');
      editButton.addEventListener('click', () => {
        this.openTaskForm(task);
      });

      const deleteButton = taskElement.querySelector('.task-action-button.delete');
      deleteButton.addEventListener('click', () => {
        this.deleteTask(task.id);
      });

      this.animateTaskAddition(taskElement);
      return taskElement;
    }

    // New: Toggle task completion status via API
    async toggleTaskCompletion(taskId, currentStatus) {
      try {
          const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  ...this.getAuthHeader(),
              },
              body: JSON.stringify({ completed: !currentStatus }),
          });

          if (response.ok) {
              const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
              if (taskElement) {
                this.animateTaskCompletion(taskElement); // Apply animation immediately for UX
              }
              await this.fetchTasks(); // Re-fetch to sync
          } else if (response.status === 401 || response.status === 403) {
              this.auth.logout();
          } else {
              const errorData = await response.json();
              alert(`Error: ${errorData.message || 'Failed to update task status. Please try again.'}`);
          }
      } catch (error) {
          console.error('Error toggling task completion:', error);
          alert('An error occurred while updating task status. Please check your network and try again.');
      }
    }

    // New: Delete task via API
    async deleteTask(taskId) {
      if (confirm('Are you sure you want to delete this task?')) {
          try {
              const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
                  method: 'DELETE',
                  headers: this.getAuthHeader(),
              });

              if (response.ok) {
                  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
                  if (taskElement) {
                    this.animateTaskDeletion(taskElement); // Animate deletion locally
                  }
                  await this.fetchTasks(); // Re-fetch tasks after animation
              } else if (response.status === 401 || response.status === 403) {
                  this.auth.logout();
              } else {
                  const errorData = await response.json();
                  alert(`Error: ${errorData.message || 'Failed to delete task. Please try again.'}`);
              }
          } catch (error) {
              console.error('Error deleting task:', error);
              alert('An error occurred while deleting the task. Please check your network and try again.');
          }
      }
    }

    // Update UI after task changes
    updateUI() {
      // Re-render tasks
      this.renderTasks();

      // Update calendar if needed
      this.renderCalendar();

      // Update suggestions
      this.generateSuggestions();
    }

    // Render calendar view (no significant changes here regarding data)
    renderCalendar() {
      const calendarTitle = document.getElementById('calendar-title');
      const calendarGrid = document.getElementById('calendar-grid');

      calendarTitle.textContent = this.formatMonthYear(this.currentMonth);
      calendarGrid.innerHTML = '';

      const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
      const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

      const startDay = firstDay.getDay();
      const totalDaysInMonth = lastDay.getDate();

      const numWeeks = Math.ceil((startDay + totalDaysInMonth) / 7);
      const totalCells = numWeeks * 7; // Ensure we always have complete weeks for the grid

      const prevMonthLastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 0).getDate();

      for (let i = 0; i < totalCells; i++) {
        const dayElement = document.createElement('div');
        let displayDay;
        let dateForPopulatingTasks;

        if (i < startDay) {
          // Days from previous month
          displayDay = prevMonthLastDay - startDay + i + 1;
          dateForPopulatingTasks = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, displayDay);
          dayElement.className = 'calendar-day other-month';
        } else if (i < startDay + totalDaysInMonth) {
          // Days in current month
          displayDay = i - startDay + 1;
          dateForPopulatingTasks = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), displayDay);
          const isToday = this.isToday(dateForPopulatingTasks);
          dayElement.className = `calendar-day ${isToday ? 'today' : ''}`;
        } else {
          // Days from next month
          displayDay = i - (startDay + totalDaysInMonth) + 1;
          dateForPopulatingTasks = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, displayDay);
          dayElement.className = 'calendar-day other-month';
        }

        dayElement.innerHTML = `
            <div class="calendar-day-number">${displayDay}</div>
            <div class="calendar-day-tasks"></div>
          `;
        this.populateCalendarDayTasks(dayElement, dateForPopulatingTasks);
        calendarGrid.appendChild(dayElement);
      }
    }

    // Populate calendar day with tasks (no significant changes here)
    populateCalendarDayTasks(dayElement, date) {
      const tasksContainer = dayElement.querySelector('.calendar-day-tasks');
      const dateString = this.formatDateForInput(date);

      // Get tasks for this day
      const dayTasks = this.tasks.filter(task => task.dueDate === dateString);

      // Sort tasks by priority and then by time
      dayTasks.sort((a, b) => {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // If priority is the same, sort by time (earlier first)
        const timeA = a.dueTime ? parseInt(a.dueTime.replace(':', ''), 10) : 9999; // Use a high number for tasks without time to sort them last
        const timeB = b.dueTime ? parseInt(b.dueTime.replace(':', ''), 10) : 9999;
        return timeA - timeB;
      });

      // Display up to 3 tasks
      const displayTasks = dayTasks.slice(0, 3);
      displayTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `calendar-task ${task.completed ? 'completed' : ''}`;
        taskElement.textContent = task.title;

        // Add click event to edit task
        taskElement.addEventListener('click', () => {
          this.openTaskForm(task);
        });

        tasksContainer.appendChild(taskElement);
      });

      // Show "more" indicator if there are more tasks
      if (dayTasks.length > 3) {
        const moreElement = document.createElement('div');
        moreElement.className = 'calendar-more';
        moreElement.textContent = `+${dayTasks.length - 3} more`;
        tasksContainer.appendChild(moreElement);
      }
    }

    // Generate AI suggestions (client-side as before)
    generateSuggestions() {
      const suggestionsContainer = document.getElementById('suggestions-container');

      // Task templates for AI suggestions
      const taskTemplates = [
        {
          title: "Weekly planning session",
          description: "Review goals and plan tasks for the upcoming week",
          category: "Work",
          priority: "High",
          daysOffset: 1,
          timeString: "09:00"
        },
        {
          title: "Exercise routine",
          description: "30-minute workout session",
          category: "Health",
          priority: "Medium",
          daysOffset: 0,
          timeString: "17:30"
        },
        {
          title: "Read for 20 minutes",
          description: "Continue current book or article",
          category: "Personal",
          priority: "Low",
          daysOffset: 0,
          timeString: "21:00"
        },
        {
          title: "Review monthly budget",
          description: "Track expenses and update budget for the month",
          category: "Finance",
          priority: "Medium",
          daysOffset: 3,
          timeString: "18:00"
        },
        {
          title: "Clean and organize workspace",
          description: "Declutter desk and organize files",
          category: "Home",
          priority: "Low",
          daysOffset: 2,
          timeString: "16:00"
        },
        {
          title: "Learn something new",
          description: "Spend 30 minutes on a tutorial or course",
          category: "Education",
          priority: "Medium",
          daysOffset: 1,
          timeString: "19:00"
        },
        {
          title: "Team check-in meeting",
          description: "Discuss progress and blockers with the team",
          category: "Work",
          priority: "High",
          daysOffset: 2,
          timeString: "10:00"
        },
        {
          title: "Meal prep for the week",
          description: "Plan and prepare meals for the upcoming week",
          category: "Health",
          priority: "Medium",
          daysOffset: 0,
          timeString: "14:00"
        }
      ];

      // Clear container
      suggestionsContainer.innerHTML = '';

      // Get existing task titles (case-insensitive for better filtering)
      const existingTitles = new Set(this.tasks.map(task => task.title.toLowerCase()));

      // Filter out templates that match existing tasks
      const availableTemplates = taskTemplates.filter(
        template => !existingTitles.has(template.title.toLowerCase())
      );

      // Randomly select 3 templates
      const selectedTemplates = [...availableTemplates]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      // Create suggestion elements
      const now = new Date();

      selectedTemplates.forEach(template => {
        const dueDate = this.addDays(now, template.daysOffset);
        const formattedDate = this.formatDate(this.formatDateForInput(dueDate));

        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggestion-card';
        suggestionElement.innerHTML = `
          <div class="suggestion-header">
            <h3 class="suggestion-title">${this.escapeHtml(template.title)}</h3>
            <span class="badge badge-priority-${template.priority}">${template.priority}</span>
          </div>
          <p class="suggestion-description">${this.escapeHtml(template.description)}</p>
          <div class="suggestion-footer">
            <div class="suggestion-date">
              ${formattedDate}${template.timeString ? ` at ${template.timeString}` : ''}
            </div>
            <button class="button button-outline suggestion-add">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add
            </button>
          </div>
        `;

        // Add click event to add suggestion
        const addButton = suggestionElement.querySelector('.suggestion-add');
        addButton.addEventListener('click', () => {
          this.addSuggestion(template);
        });

        suggestionsContainer.appendChild(suggestionElement);
      });
    }

    // Add suggestion as a task via API call
    async addSuggestion(template) {
      const now = new Date();
      const dueDate = this.formatDateForInput(this.addDays(now, template.daysOffset));

      const taskData = {
        title: template.title,
        description: template.description,
        dueDate: dueDate,
        dueTime: template.timeString,
        priority: template.priority,
        category: template.category,
      };

      try {
        const response = await fetch(`${this.apiUrl}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader(),
            },
            body: JSON.stringify(taskData),
        });

        if (response.ok) {
            await this.fetchTasks(); // Re-fetch to update UI
        } else if (response.status === 401 || response.status === 403) {
            this.auth.logout();
        } else {
            const errorData = await response.json();
            alert(`Error adding suggestion: ${errorData.message || 'Please try again.'}`);
        }
      } catch (error) {
          console.error('Error adding suggestion:', error);
          alert('An error occurred while adding the suggestion. Please check your network and try again.');
      }
    }

    // Helper: Format date for display
    formatDate(dateString) {
      const date = new Date(dateString);
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    // Helper: Format date for input field (YYYY-MM-DD)
    formatDateForInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Helper: Format month and year
    formatMonthYear(date) {
      const options = { month: 'long', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    // Helper: Check if date is today
    isToday(date) {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }

    // Helper: Add days to date
    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    // Helper: Escape HTML to prevent XSS
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Animate task completion (visually, backend update is done in toggleTaskCompletion)
    animateTaskCompletion(taskElement) {
      taskElement.classList.add('task-completed-animation'); // Add a class for specific animation
      // The class `task-completed` is managed by `renderTasks` based on fetched data
      setTimeout(() => {
        taskElement.classList.remove('task-completed-animation');
        // task completion status updated and rendered in fetchTasks()
      }, 500);
    }

    // Animate task deletion (visually, backend update is done in deleteTask)
    animateTaskDeletion(taskElement) {
      taskElement.style.animation = 'slideOut 0.3s var(--animation-timing)';
      // Backend handles actual removal, then fetchTasks updates the DOM correctly.
      // Small delay here to allow the visual animation to complete before re-render might remove it.
      setTimeout(() => {
        // This element might already be gone if fetchTasks() rerendered
        // taskElement.remove();
      }, 300);
    }

    // Animate task addition
    animateTaskAddition(taskElement) {
      taskElement.style.opacity = '0';
      taskElement.style.transform = 'translateY(20px)';
      setTimeout(() => {
        taskElement.style.transition = 'all 0.3s var(--animation-timing)';
        taskElement.style.opacity = '1';
        taskElement.style.transform = 'translateY(0)';
      }, 50);
    }
  }

  // Initialize the application when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // This part runs after auth.js ensures authentication is checked
    window.taskScheduler = new TaskScheduler();

    // The logout button listener is now primarily handled in auth.js directly
    // and removed from here to prevent redundancy.
    // If you need direct access for specific script.js behaviors on logout, keep it.
  });

  // Updated CSS to include the new animation class
  /* In styles.css, add this: */
  /*
  @keyframes completeTaskAnimation {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.02); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
  }

  .task-card.task-completed-animation {
      animation: completeTaskAnimation 0.5s var(--animation-timing);
  }
  */