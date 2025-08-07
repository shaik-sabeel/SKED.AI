class Task {
    constructor(id, title, description, dueDate, dueTime, priority, category, completed = false, createdAt = new Date().toISOString()) {
      this.id = id;
      this.title = title;
      this.description = description;
      this.dueDate = dueDate;
      this.dueTime = dueTime;
      this.priority = priority;
      this.category = category;
      this.completed = completed;
      this.createdAt = createdAt;
    }
  }

  class TaskScheduler {
    constructor() {
      this.tasks = [];
      this.currentEditingTask = null;
      this.currentFilter = 'all';
      this.searchTerm = '';
      this.currentMonth = new Date();
      this.apiUrl = 'http://localhost:3000/api';
      this.auth = window.auth;

      this.auth.checkAuthStatus();

      this.initUI();

      this.fetchTasks();

      this.generateSuggestions();

      this.updateUserName();
    }

    getAuthHeader() {
      const token = this.auth.getToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async fetchTasks() {
        try {
            const response = await fetch(`${this.apiUrl}/tasks`, {
                headers: this.getAuthHeader(),
            });

            if (response.ok) {
                const data = await response.json();
                this.tasks = data.map(taskData => new Task(
                    taskData._id,
                    taskData.title,
                    taskData.description,
                    taskData.dueDate,
                    taskData.dueTime,
                    taskData.priority,
                    taskData.category,
                    taskData.completed,
                    taskData.createdAt
                ));
                this.updateUI();
            } else if (response.status === 401 || response.status === 403) {
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

    initUI() {
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabName = button.dataset.tab;

          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabName}-view`) {
              content.classList.add('active');
            }
          });

          if (tabName === 'calendar') {
            this.renderCalendar();
          }
        });
      });

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

      const filterButtons = document.querySelectorAll('.filter-button');
      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.currentFilter = button.dataset.filter;

          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          this.renderTasks();
        });
      });

      const searchInput = document.getElementById('search-input');
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderTasks();
      });

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

      const refreshSuggestionsBtn = document.getElementById('refresh-suggestions');
      refreshSuggestionsBtn.addEventListener('click', () => {
        this.generateSuggestions();
      });

      const dueDateInput = document.getElementById('due-date');
      dueDateInput.value = this.formatDateForInput(new Date());

      this.renderTasks();
    }

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

    openTaskForm(task = null) {
      const modal = document.getElementById('task-form-modal');
      const modalTitle = document.getElementById('modal-title');
      const form = document.getElementById('task-form');
      const submitButton = form.querySelector('button[type="submit"]');

      form.reset();

      const dueDateInput = document.getElementById('due-date');
      if (!task) {
          dueDateInput.value = this.formatDateForInput(new Date());
      }

      document.getElementById('priority-medium').checked = true;

      if (task) {
        this.currentEditingTask = task;
        modalTitle.textContent = 'Edit Task';
        submitButton.textContent = 'Update Task';

        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('due-date').value = task.dueDate;
        document.getElementById('due-time').value = task.dueTime || '';
        const priorityRadio = document.getElementById(`priority-${task.priority.toLowerCase()}`);
        if (priorityRadio) priorityRadio.checked = true;
        document.getElementById('category').value = task.category || '';
      } else {
        this.currentEditingTask = null;
        modalTitle.textContent = 'Add New Task';
        submitButton.textContent = 'Add Task';
      }

      modal.classList.add('active');
    }

    closeTaskForm() {
      const modal = document.getElementById('task-form-modal');
      modal.classList.remove('active');
      this.currentEditingTask = null;
    }

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
                response = await fetch(`${this.apiUrl}/tasks/${this.currentEditingTask.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeader(),
                    },
                    body: JSON.stringify({ ...taskData, completed: this.currentEditingTask.completed }),
                });
            } else {
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
                await this.fetchTasks();
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

    renderTasks() {
      const tasksContainer = document.getElementById('tasks-container');
      const emptyState = document.getElementById('empty-state');

      if (!tasksContainer) {
        return;
      }

      tasksContainer.innerHTML = '';

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
            (task.category && task.category.toLowerCase().includes(this.searchTerm)) ||
            task.priority.toLowerCase().includes(this.searchTerm)
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.dueDate + (a.dueTime ? `T${a.dueTime}` : ''));
          const dateB = new Date(b.dueDate + (b.dueTime ? `T${b.dueTime}` : ''));

          const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

          if (timeA !== timeB) return timeA - timeB;

          const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `
          <div class="empty-state">
            <p>${this.tasks.length === 0 ? 'No tasks yet. Add your first task to get started!' : 'No tasks match your current filters.'}</p>
          </div>
        `;
      } else {
        const currentEmptyState = tasksContainer.querySelector('.empty-state');
        if(currentEmptyState) currentEmptyState.style.display = 'none';

        filteredTasks.forEach(task => {
          const taskElement = this.createTaskElement(task);
          tasksContainer.appendChild(taskElement);
        });
      }
    }

    createTaskElement(task) {
      const taskElement = document.createElement('div');
      taskElement.className = `task-card ${task.completed ? 'task-completed' : ''}`;
      taskElement.setAttribute('data-task-id', task.id);

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

      const checkbox = taskElement.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => {
        this.toggleTaskCompletion(task.id, task.completed);
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
                this.animateTaskCompletion(taskElement);
              }
              await this.fetchTasks();
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
                    this.animateTaskDeletion(taskElement);
                  }
                  await this.fetchTasks();
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

    updateUI() {
      this.renderTasks();

      this.renderCalendar();

      this.generateSuggestions();
    }

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
      const totalCells = numWeeks * 7;

      const prevMonthLastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 0).getDate();

      for (let i = 0; i < totalCells; i++) {
        const dayElement = document.createElement('div');
        let displayDay;
        let dateForPopulatingTasks;

        if (i < startDay) {
          displayDay = prevMonthLastDay - startDay + i + 1;
          dateForPopulatingTasks = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, displayDay);
          dayElement.className = 'calendar-day other-month';
        } else if (i < startDay + totalDaysInMonth) {
          displayDay = i - startDay + 1;
          dateForPopulatingTasks = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), displayDay);
          const isToday = this.isToday(dateForPopulatingTasks);
          dayElement.className = `calendar-day ${isToday ? 'today' : ''}`;
        } else {
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

    populateCalendarDayTasks(dayElement, date) {
      const tasksContainer = dayElement.querySelector('.calendar-day-tasks');
      const dateString = this.formatDateForInput(date);

      const dayTasks = this.tasks.filter(task => task.dueDate === dateString);

      dayTasks.sort((a, b) => {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        const timeA = a.dueTime ? parseInt(a.dueTime.replace(':', ''), 10) : 9999;
        const timeB = b.dueTime ? parseInt(b.dueTime.replace(':', ''), 10) : 9999;
        return timeA - timeB;
      });

      const displayTasks = dayTasks.slice(0, 3);
      displayTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `calendar-task ${task.completed ? 'completed' : ''}`;
        taskElement.textContent = task.title;

        taskElement.addEventListener('click', () => {
          this.openTaskForm(task);
        });

        tasksContainer.appendChild(taskElement);
      });

      if (dayTasks.length > 3) {
        const moreElement = document.createElement('div');
        moreElement.className = 'calendar-more';
        moreElement.textContent = `+${dayTasks.length - 3} more`;
        tasksContainer.appendChild(moreElement);
      }
    }

    generateSuggestions() {
      const suggestionsContainer = document.getElementById('suggestions-container');

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

      suggestionsContainer.innerHTML = '';

      const existingTitles = new Set(this.tasks.map(task => task.title.toLowerCase()));

      const availableTemplates = taskTemplates.filter(
        template => !existingTitles.has(template.title.toLowerCase())
      );

      const selectedTemplates = [...availableTemplates]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

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

        const addButton = suggestionElement.querySelector('.suggestion-add');
        addButton.addEventListener('click', () => {
          this.addSuggestion(template);
        });

        suggestionsContainer.appendChild(suggestionElement);
      });
    }

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
            await this.fetchTasks();
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

    formatDate(dateString) {
      const date = new Date(dateString);
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    formatDateForInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    formatMonthYear(date) {
      const options = { month: 'long', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    isToday(date) {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }

    addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    animateTaskCompletion(taskElement) {
      taskElement.classList.add('task-completed-animation');
      setTimeout(() => {
        taskElement.classList.remove('task-completed-animation');
      }, 500);
    }

    animateTaskDeletion(taskElement) {
      taskElement.style.animation = 'slideOut 0.3s var(--animation-timing)';
      setTimeout(() => {
      }, 300);
    }

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

  document.addEventListener('DOMContentLoaded', () => {
    window.taskScheduler = new TaskScheduler();
  });