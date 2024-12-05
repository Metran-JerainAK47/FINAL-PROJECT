document.addEventListener("DOMContentLoaded", function () {
     // DOM elements
    const addTaskBtn = document.getElementById("addTaskBtn");
    const taskInput = document.getElementById("taskInput");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskList = document.getElementById("taskList");
    const notificationBell = document.getElementById("notificationBell");
    const notification = document.getElementById("notification"); // In-page notification element (optional)
    const progressBar = document.getElementById("progressBar"); // Add your progress bar element in HTML
    const dailyStats = document.getElementById("dailyStats");
    const weeklyStats = document.getElementById("weeklyStats");
    const monthlyStats = document.getElementById("monthlyStats");
    const dailyOverdue = document.getElementById("dailyOverdue");
    const weeklyOverdue = document.getElementById("weeklyOverdue");
    const monthlyOverdue = document.getElementById("monthlyOverdue");

    let notificationsEnabled = false;
    let overdueCheckInterval;

    // Request permission to show notifications if not already granted
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted.");
            }
        });
    }

    // Load tasks from localStorage
    const loadTasks = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        
        // Sort tasks by due date (ascending, nearest first)
        tasks.sort((a, b) => {
            if (a.dueDate && b.dueDate) {
                return a.dueDate - b.dueDate; // Nearest first
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        taskList.innerHTML = ''; // Clear the task list
        tasks.forEach((task, index) => {
            createTaskElement(task, index);
            checkDueDate(task); // Check if task is overdue when loading
        });
        
        updateProgress();// Update progress bar
        updateTaskStats();// Update daily/weekly/monthly stats
        updateOverdueStats(); // Update overdue stats
    };

    const createTaskElement = (task, index) => {
        const li = document.createElement("li");
        li.classList.add("task-item"); // Add a class for easy styling if needed
    
        // Task text display
        const taskText = document.createElement("span");
        taskText.textContent = task.text;
        taskText.classList.add("task-text");
        li.appendChild(taskText);
    
        // Show due date if exists
        if (task.dueDate) {
            const dueDateDisplay = document.createElement("span");
            dueDateDisplay.textContent = ` (Due: ${new Date(task.dueDate).toLocaleString()})`;
            li.appendChild(dueDateDisplay);
        }
    
        // Show task completion
        if (task.completed) {
            li.classList.add("completed");
        }
    
        // Create Edit Button
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => editTask(task, index, li, taskText);
    
        // Create Complete Button
        const completeBtn = document.createElement("button");
        completeBtn.textContent = "✓";
        completeBtn.onclick = () => markTaskComplete(task, index, li);
    
        // Create Delete Button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => deleteTask(index, li);
    
        // Append buttons to the task item
        li.appendChild(editBtn);
        li.appendChild(completeBtn);
        li.appendChild(deleteBtn);
    
        taskList.appendChild(li);
    };

    const editTask = (task, index, li, taskText) => {
        // Create an input field and set its value to the current task name
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.value = task.text;
        li.replaceChild(inputField, taskText); // Replace the task name with the input field
    
        // Focus on the input field to make editing easier
        inputField.focus();
    
        // Change button text to "Save"
        const editBtn = li.querySelector("button");
        editBtn.textContent = "💾 Save";
        editBtn.onclick = () => saveEditedTask(task, index, li, inputField); // Change to save logic
    };
    
    // Save the edited task
    const saveEditedTask = (task, index, li, inputField) => {
        const newTaskText = inputField.value.trim();
    
        if (newTaskText === "") {
            alert("Its empty you silly!");
            return;
        }
    
        task.text = newTaskText; // Update the task's name
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks[index] = task; // Save the updated task to the array
        localStorage.setItem("tasks", JSON.stringify(tasks)); // Update localStorage
    
        const newTaskTextSpan = document.createElement("span");
        newTaskTextSpan.textContent = newTaskText;
        li.replaceChild(newTaskTextSpan, inputField); // Replace the input field with the updated task name
    
        // Reset the Edit button back to "Edit"
        const editBtn = li.querySelector("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => editTask(task, index, li, newTaskTextSpan); // Revert to edit mode
    
        showNotification("Task edited!");
    };
    
    
   // Add a task
addTaskBtn.addEventListener("click", () => {
    const newTaskText = taskInput.value.trim();
    const newTaskDueDate = taskDueDate.value;
    const newTaskPriority = document.getElementById("taskPriority").value;
    const newTaskCategory = document.getElementById("taskCategory").value;

    if (newTaskText === "") {
        alert("Please enter a task!");
        return;
    }

    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const newTask = {
        text: newTaskText,
        completed: false,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate).getTime() : null,
        priority: newTaskPriority,
        category: newTaskCategory
    };
    tasks.push(newTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskInput.value = '';
    taskDueDate.value = '';
    loadTasks();
    showNotification("Task added!");
});


    // Mark task as complete
    const markTaskComplete = (task, index, li) => {
        task.completed = !task.completed;
        task.completedDate = task.completed ? new Date().getTime() : null; // Store the completion date
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks[index] = task;
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
    };

    // Delete task
    const deleteTask = (index, li) => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        taskList.removeChild(li);
        showNotification("Task deleted!");
    };

    // Show notification in the browser
    const showNotification = (message) => {
        if (Notification.permission === "granted") {
            new Notification(message);
        } else {
            // Fallback to in-page notification if permission is denied
            notification.textContent = message;
            notification.style.display = "block";
            setTimeout(() => {
                notification.style.display = "none";
            }, 3000);
        }
    };

    // Check if a task is overdue
    const checkDueDate = (task) => {
        if (task.dueDate) {
            const currentTime = new Date().getTime();
            if (task.dueDate <= currentTime && !task.completed) {
                showNotification(`Task "${task.text}" is due now!`);
            }
        }
    };

    // Automatically check for overdue tasks every minute
    const checkOverdueTasks = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.forEach((task) => {
            checkDueDate(task); // Check each task for overdue
        });
    };

    // Start checking overdue tasks every 2 seconds when the page is visible
    const startOverdueCheck = () => {
        overdueCheckInterval = setInterval(checkOverdueTasks, 2000); // Check every 2 seconds (for testing purposes)
    };

    // Stop checking overdue tasks when the page is hidden
    const stopOverdueCheck = () => {
        clearInterval(overdueCheckInterval);
    };

    // Handle the bell icon click to toggle notifications
    notificationBell.addEventListener("click", () => {
        if (notificationsEnabled) {
            notificationsEnabled = false;
            notificationBell.classList.add("disabled");
            notificationBell.classList.remove("enabled");
            console.log("Notifications disabled");
        } else {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    notificationsEnabled = true;
                    notificationBell.classList.add("enabled");
                    notificationBell.classList.remove("disabled");
                    console.log("Notifications enabled");
                } else {
                    console.log("Notification permission denied");
                }
            });
        }
    });

    // Handle the visibility change
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            console.log("Page is now hidden. Stopping overdue checks.");
            stopOverdueCheck();
        } else {
            console.log("Page is now visible. Starting overdue checks.");
            startOverdueCheck();
        }
    });

    // Calculate task completion progress
    const calculateProgress = (tasks) => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        return totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
    };

    // Update progress bar
    const updateProgress = () => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const progress = calculateProgress(tasks);
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${Math.round(progress)}% Completed`;
    };

    // Get the number of completed tasks in a specific date range
    const getTasksByDateRange = (range) => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const currentDate = new Date().getTime();

        return tasks.filter(task => {
            if (!task.completedDate) return false;
            
            const taskCompletedDate = task.completedDate;
            switch (range) {
                case 'daily':
                    return taskCompletedDate >= currentDate - 24 * 60 * 60 * 1000;
                case 'weekly':
                    return taskCompletedDate >= currentDate - 7 * 24 * 60 * 60 * 1000;
                case 'monthly':
                    return taskCompletedDate >= currentDate - 30 * 24 * 60 * 60 * 1000;
                default:
                    return false;
            }
        }).length;
    };

    // Update task stats (daily, weekly, monthly)
    const updateTaskStats = () => {
        const dailyCompleted = getTasksByDateRange('daily');
        const weeklyCompleted = getTasksByDateRange('weekly');
        const monthlyCompleted = getTasksByDateRange('monthly');
        
        dailyStats.textContent = `Daily Completed: ${dailyCompleted}`;
        weeklyStats.textContent = `Weekly Completed: ${weeklyCompleted}`;
        monthlyStats.textContent = `Monthly Completed: ${monthlyCompleted}`;
    };

    // Get overdue tasks based on a specific date range
    const getOverdueTasks = (range) => {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const currentTime = new Date().getTime();

        return tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            
            const taskDueDate = task.dueDate;
            switch (range) {
                case 'daily':
                    return taskDueDate < currentTime - 24 * 60 * 60 * 1000;
                case 'weekly':
                    return taskDueDate < currentTime - 7 * 24 * 60 * 60 * 1000;
                case 'monthly':
                    return taskDueDate < currentTime - 30 * 24 * 60 * 60 * 1000;
                default:
                    return false;
            }
        }).length;
    };

    // Update overdue stats (daily, weekly, monthly)
    const updateOverdueStats = () => {
        const dailyOverdueCount = getOverdueTasks('daily');
        const weeklyOverdueCount = getOverdueTasks('weekly');
        const monthlyOverdueCount = getOverdueTasks('monthly');
        
        dailyOverdue.textContent = `Daily Overdue: ${dailyOverdueCount}`;
        weeklyOverdue.textContent = `Weekly Overdue: ${weeklyOverdueCount}`;
        monthlyOverdue.textContent = `Monthly Overdue: ${monthlyOverdueCount}`;
    };

    // Initial load of tasks
    loadTasks();
    startOverdueCheck();
});



