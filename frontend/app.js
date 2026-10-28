const API = "/api/tasks";

const taskList = document.getElementById("taskList");
const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const searchInput = document.getElementById("search");
const sortInput = document.getElementById("sort");
const message = document.getElementById("message");

let tasks = [];
let currentFilter = "all";
let editingId = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function showMessage(text) {
  message.textContent = text;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function updateStats() {
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("activeCount").textContent =
    tasks.filter(task => !task.completed).length;
  document.getElementById("completedCount").textContent =
    tasks.filter(task => task.completed).length;
}

function visibleTasks() {
  let result = tasks.filter(task => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  const query = searchInput.value.trim().toLowerCase();

  result = result.filter(task =>
    task.title.toLowerCase().includes(query) ||
    (task.description || "").toLowerCase().includes(query)
  );

  if (sortInput.value === "oldest") {
    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortInput.value === "priority") {
    const rank = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => rank[b.priority] - rank[a.priority]);
  } else {
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return result;
}

function renderTasks() {
  updateStats();
  const shown = visibleTasks();

  if (shown.length === 0) {
    taskList.innerHTML =
      '<div class="empty">No tasks found. Add a task to get started!</div>';
    return;
  }

  taskList.innerHTML = shown.map(task => {
    const due = task.due_date
      ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString()
      : "No due date";

    return `
      <article class="task-card ${task.completed ? "completed" : ""}">
        <input
          class="task-check"
          type="checkbox"
          aria-label="Mark ${escapeHTML(task.title)} completed"
          data-action="toggle"
          data-id="${task.id}"
          ${task.completed ? "checked" : ""}
        >

        <div class="task-content">
          <h3>${escapeHTML(task.title)}</h3>
          ${task.description
            ? `<p>${escapeHTML(task.description)}</p>`
            : ""}
          <div class="task-meta">
            <span class="tag priority-${task.priority}">
              ${escapeHTML(task.priority.toUpperCase())}
            </span>
            <span class="tag">${escapeHTML(due)}</span>
            <span class="tag">
              ${task.completed ? "Completed" : "In progress"}
            </span>
          </div>
        </div>

        <div class="task-actions">
          <button class="small-button"
            data-action="edit" data-id="${task.id}">Edit</button>
          <button class="small-button delete-button"
            data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadTasks() {
  showMessage("Loading tasks...");

  try {
    tasks = await request(API);
    renderTasks();
    showMessage("");
  } catch (error) {
    showMessage(error.message);
    taskList.innerHTML =
      '<div class="empty">Could not load tasks. Check your server and Supabase setup.</div>';
  }
}

function openForm(task = null) {
  editingId = task ? task.id : null;
  taskForm.reset();

  titleInput.value = task?.title || "";
  descriptionInput.value = task?.description || "";
  dueDateInput.value = task?.due_date || "";
  priorityInput.value = task?.priority || "medium";

  document.getElementById("saveButton").textContent =
    task ? "Update Task" : "Save Task";

  taskForm.classList.remove("hidden");
  titleInput.focus();
}

function closeForm() {
  taskForm.classList.add("hidden");
  editingId = null;
  taskForm.reset();
}

document.getElementById("showForm").addEventListener("click", () => openForm());
document.getElementById("cancelForm").addEventListener("click", closeForm);

taskForm.addEventListener("submit", async event => {
  event.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    due_date: dueDateInput.value || null,
    priority: priorityInput.value
  };

  if (!payload.title) {
    showMessage("Please enter a task title.");
    return;
  }

  const saveButton = document.getElementById("saveButton");
  saveButton.disabled = true;

  try {
    if (editingId) {
      await request(`${API}/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await request(API, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    closeForm();
    await loadTasks();
    showMessage("Task saved successfully.");
  } catch (error) {
    showMessage(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

taskList.addEventListener("change", async event => {
  const control = event.target.closest('[data-action="toggle"]');
  if (!control) return;

  try {
    await request(`${API}/${control.dataset.id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completed: control.checked })
    });
    await loadTasks();
  } catch (error) {
    showMessage(error.message);
    await loadTasks();
  }
});

taskList.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  if (button.dataset.action === "edit") {
    openForm(task);
    return;
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${task.title}"?`)) return;

    try {
      await request(`${API}/${id}`, { method: "DELETE" });
      await loadTasks();
      showMessage("Task deleted.");
    } catch (error) {
      showMessage(error.message);
    }
  }
});

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    currentFilter = button.dataset.filter;

    document.getElementById("listTitle").textContent =
      currentFilter === "all" ? "All Tasks" :
      currentFilter === "active" ? "Active Tasks" : "Completed Tasks";

    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);
sortInput.addEventListener("change", renderTasks);

loadTasks();