class Task {
    constructor(id, title, description, dueDate, dueTime, priority, category, completed = false) {
      this.id = id;
      this.title = title;
      this.description = description;
      this.dueDate = dueDate;
      this.dueTime = dueTime;
      this.priority = priority;
      this.category = category;
      this.completed = completed;
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
      
      // Load tasks from localStorage
      this.loadTasks();
      
      // Initialize UI
      this.initUI();
      
      // Generate AI suggestions
      this.generateSuggestions();
    }
    
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
      
      console.log('Initializing modal elements:', {
        addTaskBtn,
        taskFormModal,
        closeModal,
        cancelTask,
        taskForm
      });
      
      addTaskBtn.addEventListener('click', () => {
        console.log('Add Task button clicked');
        this.openTaskForm();
      });
      
      closeModal.addEventListener('click', () => {
        console.log('Close modal button clicked');
        this.closeTaskForm();
      });
      
      cancelTask.addEventListener('click', () => {
        console.log('Cancel task button clicked');
        this.closeTaskForm();
      });
      
      taskForm.addEventListener('submit', (e) => {
        console.log('Task form submitted');
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
      
      // Initial render
      this.renderTasks();
    }
    
    // Load tasks from localStorage
    loadTasks() {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        try {
          this.tasks = JSON.parse(savedTasks);
          console.log('Loaded tasks:', this.tasks);
        } catch (error) {
          console.error('Error loading tasks:', error);
          this.tasks = [];
        }
      } else {
        this.tasks = [];
      }
    }
    
    // Save tasks to localStorage
    saveTasks() {
      try {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        console.log('Saved tasks:', this.tasks);
      } catch (error) {
        console.error('Error saving tasks:', error);
      }
    }
    
    // Open task form modal
    openTaskForm(task = null) {
      console.log('Opening task form');
      const modal = document.getElementById('task-form-modal');
      const modalTitle = document.getElementById('modal-title');
      const form = document.getElementById('task-form');
      const submitButton = form.querySelector('button[type="submit"]');
      
      console.log('Modal elements:', {
        modal,
        modalTitle,
        form,
        submitButton
      });
      
      // Reset form
      form.reset();
      
      // Set default due date to today
      const dueDateInput = document.getElementById('due-date');
      dueDateInput.value = this.formatDateForInput(new Date());
      
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
        document.getElementById(`priority-${task.priority.toLowerCase()}`).checked = true;
        document.getElementById('category').value = task.category || '';
      } else {
        // Add new task
        this.currentEditingTask = null;
        modalTitle.textContent = 'Add New Task';
        submitButton.textContent = 'Add Task';
      }
      
      // Show modal
      console.log('Adding active class to modal');
      modal.classList.add('active');
      console.log('Modal classes:', modal.classList);
    }
    
    // Close task form modal
    closeTaskForm() {
      console.log('Closing task form');
      const modal = document.getElementById('task-form-modal');
      modal.classList.remove('active');
      this.currentEditingTask = null;
    }
    
    // Handle task form submission
    handleTaskFormSubmit() {
      const form = document.getElementById('task-form');
      const title = document.getElementById('title').value.trim();
      const description = document.getElementById('description').value.trim();
      const dueDate = document.getElementById('due-date').value;
      const dueTime = document.getElementById('due-time').value;
      const priority = document.querySelector('input[name="priority"]:checked').value;
      const category = document.getElementById('category').value;
      
      if (!title) {
        alert('Please enter a task title');
        return;
      }
      
      if (this.currentEditingTask) {
        // Update existing task
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentEditingTask.id);
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = {
            ...this.currentEditingTask,
            title,
            description,
            dueDate,
            dueTime,
            priority,
            category
          };
        }
      } else {
        // Add new task
        const newTask = new Task(
          Date.now().toString(),
          title,
          description,
          dueDate,
          dueTime,
          priority,
          category,
          false
        );
        
        this.tasks.push(newTask);
      }
      
      // Save and update UI
      this.saveTasks();
      this.updateUI();
      this.closeTaskForm();
    }
    
    // Render tasks list
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
            task.description.toLowerCase().includes(this.searchTerm)
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.dueDate + (a.dueTime ? 'T' + a.dueTime : '')).getTime();
          const dateB = new Date(b.dueDate + (b.dueTime ? 'T' + b.dueTime : '')).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      
      // Show empty state if no tasks
      if (filteredTasks.length === 0) {
        if (emptyState) {
          emptyState.style.display = 'block';
        }
        tasksContainer.innerHTML = `
          <div class="empty-state">
            <p>${this.tasks.length === 0 ? 'No tasks yet. Add your first task to get started!' : 'No tasks match your current filters.'}</p>
          </div>
        `;
      } else {
        if (emptyState) {
          emptyState.style.display = 'none';
        }
        filteredTasks.forEach(task => {
          const taskElement = this.createTaskElement(task);
          tasksContainer.appendChild(taskElement);
        });
      }
    }
    
    // Create task element
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
      
      // Add event listeners
      const checkbox = taskElement.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => {
        this.toggleTaskCompletion(task.id);
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
    
    // Toggle task completion status
    toggleTaskCompletion(taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
        
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
          this.animateTaskCompletion(taskElement);
        }
        
        this.updateUI();
      }
    }
    
    // Delete task
    deleteTask(taskId) {
      if (confirm('Are you sure you want to delete this task?')) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
          this.animateTaskDeletion(taskElement);
        }
        
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.updateUI();
      }
    }
    
    // Update UI after task changes
    updateUI() {
      // Clear the tasks container
      const tasksContainer = document.getElementById('tasks-container');
      if (!tasksContainer) {
        console.error('Tasks container not found');
        return;
      }
      
      // Re-render tasks
      this.renderTasks();
      
      // Update calendar if needed
      this.renderCalendar();
      
      // Update suggestions
      this.generateSuggestions();
    }
    
    // Render calendar view
    renderCalendar() {
      const calendarTitle = document.getElementById('calendar-title');
      const calendarGrid = document.getElementById('calendar-grid');
      
      // Set calendar title
      calendarTitle.textContent = this.formatMonthYear(this.currentMonth);
      
      // Clear calendar grid
      calendarGrid.innerHTML = '';
      
      // Get first day of month and number of days
      const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
      const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
      
      // Get day of week of first day (0 = Sunday, 6 = Saturday)
      const startDay = firstDay.getDay();
      
      // Create array for all days to display
      const totalDays = startDay + lastDay.getDate();
      const totalCells = Math.ceil(totalDays / 7) * 7;
      
      // Previous month days
      const prevMonthLastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 0).getDate();
      
      for (let i = 0; i < totalCells; i++) {
        const dayElement = document.createElement('div');
        
        if (i < startDay) {
          // Previous month
          const day = prevMonthLastDay - startDay + i + 1;
          const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, day);
          dayElement.className = 'calendar-day other-month';
          dayElement.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-tasks"></div>
          `;
          this.populateCalendarDayTasks(dayElement, date);
        } else if (i < totalDays) {
          // Current month
          const day = i - startDay + 1;
          const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
          const isToday = this.isToday(date);
          
          dayElement.className = `calendar-day ${isToday ? 'today' : ''}`;
          dayElement.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-tasks"></div>
          `;
          this.populateCalendarDayTasks(dayElement, date);
        } else {
          // Next month
          const day = i - totalDays + 1;
          const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, day);
          dayElement.className = 'calendar-day other-month';
          dayElement.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-tasks"></div>
          `;
          this.populateCalendarDayTasks(dayElement, date);
        }
        
        calendarGrid.appendChild(dayElement);
      }
    }
    
    // Populate calendar day with tasks
    populateCalendarDayTasks(dayElement, date) {
      const tasksContainer = dayElement.querySelector('.calendar-day-tasks');
      const dateString = this.formatDateForInput(date);
      
      // Get tasks for this day
      const dayTasks = this.tasks.filter(task => task.dueDate === dateString);
      
      // Sort tasks by priority
      dayTasks.sort((a, b) => {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
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
    
    // Generate AI suggestions
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
      
      // Get existing task titles
      const existingTitles = new Set(this.tasks.map(task => task.title));
      
      // Filter out templates that match existing tasks
      const availableTemplates = taskTemplates.filter(
        template => !existingTitles.has(template.title)
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
    
    // Add suggestion as a task
    addSuggestion(template) {
      const now = new Date();
      const dueDate = this.formatDateForInput(this.addDays(now, template.daysOffset));
      
      const newTask = new Task(
        Date.now().toString(),
        template.title,
        template.description,
        dueDate,
        template.timeString,
        template.priority,
        template.category,
        false
      );
      
      this.tasks.push(newTask);
      this.saveTasks();
      this.renderTasks();
      this.renderCalendar();
      this.generateSuggestions();
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
    
    // Animate task completion
    animateTaskCompletion(taskElement) {
      taskElement.classList.add('task-completed');
      setTimeout(() => {
        taskElement.classList.remove('task-completed');
      }, 500);
    }

    // Animate task deletion
    animateTaskDeletion(taskElement) {
      taskElement.style.animation = 'slideOut 0.3s var(--animation-timing)';
      setTimeout(() => {
        taskElement.remove();
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
    // Create and initialize the task scheduler
    window.taskScheduler = new TaskScheduler();
    taskScheduler.initUI();
    taskScheduler.loadTasks();
    taskScheduler.renderTasks();
    taskScheduler.renderCalendar();
    taskScheduler.generateSuggestions();

    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear any stored authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }
  });

// Initialize mouse follower
// Shery.mouseFollower({
//     element: document.querySelector(".cursor"),
//     parameters: {
//         ease: 0.3,
//         speed: 0.5,
//         scale: 1,
//         rotation: 0,
//         opacity: 1,
//         backgroundColor: "#4a90e2",
//         mixBlendMode: "difference"
//     }
// });