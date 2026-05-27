
const API = "http://127.0.0.1:5000/api";

let allStudents = [];

let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  loadStudents();
});

async function checkHealth() {
  const badge = document.getElementById("api-status");
  try {
    const res = await fetch(`${API}/health`);
    if (res.ok) {
      badge.textContent = "● API Online";
      badge.className = "status-badge online";
    } else {
      throw new Error();
    }
  } catch {
    badge.textContent = "● API Offline";
    badge.className = "status-badge offline";
  }
}

async function loadStudents() {
  showSpinner(true);

  try {
    const res = await fetch(`${API}/students`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    allStudents = Array.isArray(data.students) ? data.students : [];

    renderTable(allStudents);
    updateStats(allStudents);

  } catch (err) {
    showToast("❌ Cannot reach Flask. Run: python app.py", "error");
    showEmpty(true);
  } finally {
    showSpinner(false);
  }
}

async function submitForm() {
  clearErrors();

  const name   = document.getElementById("inp-name").value.trim();
  const course = document.getElementById("inp-course").value.trim();
  const ageVal = document.getElementById("inp-age").value.trim();
  const date   = document.getElementById("inp-date").value;  // "YYYY-MM-DD"

  let valid = true;

  if (!name) {
    document.getElementById("err-name").textContent = "Name is required.";
    valid = false;
  }
  if (!course) {
    document.getElementById("err-course").textContent = "Course is required.";
    valid = false;
  }
  const age = parseInt(ageVal, 10);
  if (!ageVal || isNaN(age) || age < 1 || age > 100) {
    document.getElementById("err-age").textContent = "Enter a valid age (1–100).";
    valid = false;
  }
  if (!date) {
    document.getElementById("err-date").textContent = "Please select a joining date.";
    valid = false;
  }

  if (!valid) return;

  const payload = { name, course, age, joining_date: date };

  if (editingId !== null) {
    await updateStudent(editingId, payload);
  } else {
    await createStudent(payload);
  }
}

async function createStudent(payload) {
  try {
    const res = await fetch(`${API}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to add student.");

    showToast("✅ " + data.message, "success");
    resetForm();
    loadStudents();

  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function fillEditForm(s) {
  editingId = s.id;

  document.getElementById("inp-name").value   = s.name;
  document.getElementById("inp-course").value = s.course;
  document.getElementById("inp-age").value    = s.age;
  document.getElementById("inp-date").value   = s.joining_date; // "YYYY-MM-DD"

  document.getElementById("form-title").textContent      = "✏️ Edit Student";
  document.getElementById("submit-btn").textContent       = "💾 Update Student";
  document.getElementById("cancel-btn").style.display    = "inline-block";

  document.querySelector(".form-box").scrollIntoView({ behavior: "smooth" });
}

async function updateStudent(id, payload) {
  try {
    const res = await fetch(`${API}/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to update student.");

    showToast("✅ " + data.message, "success");
    resetForm();
    loadStudents();

  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/students/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to delete.");

    showToast("✅ " + data.message, "success");
    loadStudents();

  } catch (err) {
    showToast("❌ " + err.message, "error");
  }
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  editingId = null;
  document.getElementById("edit-id").value           = "";
  document.getElementById("inp-name").value          = "";
  document.getElementById("inp-course").value        = "";
  document.getElementById("inp-age").value           = "";
  document.getElementById("inp-date").value          = "";
  document.getElementById("form-title").textContent  = "➕ Add Student";
  document.getElementById("submit-btn").textContent  = "➕ Add Student";
  document.getElementById("cancel-btn").style.display = "none";
  clearErrors();
}

function clearErrors() {
  ["err-name", "err-course", "err-age", "err-date"].forEach(id => {
    document.getElementById(id).textContent = "";
  });
}

function search() {
  const q = document.getElementById("search").value.toLowerCase().trim();
  if (!q) {
    renderTable(allStudents);
    return;
  }
  const filtered = allStudents.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.course.toLowerCase().includes(q)
  );
  renderTable(filtered);
}

function renderTable(students) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  if (!students || students.length === 0) {
    document.getElementById("table-wrap").style.display = "none";
    showEmpty(true);
    return;
  }

  document.getElementById("table-wrap").style.display = "block";
  showEmpty(false);

  students.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.style.animationDelay = `${i * 0.04}s`;

    // ID
    const tdId = document.createElement("td");
    tdId.textContent = "#" + s.id;

    // Name
    const tdName = document.createElement("td");
    tdName.textContent = s.name;

    // Course badge
    const tdCourse = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "course-badge";
    badge.textContent = s.course;
    tdCourse.appendChild(badge);

    // Age
    const tdAge = document.createElement("td");
    tdAge.textContent = s.age;

    // Joining Date — convert "YYYY-MM-DD" → "DD Mon YYYY"
    const tdJoin = document.createElement("td");
    tdJoin.textContent = formatDate(s.joining_date);
    tdJoin.style.color = "#94a3b8";

    // Created At
    const tdCreated = document.createElement("td");
    tdCreated.textContent = s.created_at || "—";
    tdCreated.style.color = "#64748b";

    // Action buttons
    const tdActions = document.createElement("td");
    tdActions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "✏️ Edit";
    editBtn.addEventListener("click", () => fillEditForm(s));

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.textContent = "🗑️ Delete";
    delBtn.addEventListener("click", () => deleteStudent(s.id, s.name));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdCourse);
    tr.appendChild(tdAge);
    tr.appendChild(tdJoin);
    tr.appendChild(tdCreated);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function updateStats(students) {
  const list = Array.isArray(students) ? students : [];
  document.getElementById("total").textContent = list.length;

  const uniqueCourses = new Set(list.map(s => s.course).filter(Boolean));
  document.getElementById("courses").textContent = uniqueCourses.size;

  if (list.length > 0) {
    const avg = Math.round(
      list.reduce((sum, s) => sum + (Number(s.age) || 0), 0) / list.length
    );
    document.getElementById("avg-age").textContent = avg;
  } else {
    document.getElementById("avg-age").textContent = "-";
  }
}

function formatDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  if (!months[m - 1]) return str;
  return `${String(d).padStart(2,"0")} ${months[m - 1]} ${y}`;
}

let toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3500);
}

function showSpinner(show) {
  document.getElementById("spinner").style.display = show ? "flex" : "none";
}

function showEmpty(show) {
  document.getElementById("empty").style.display = show ? "flex" : "none";
  if (show) {
    document.getElementById("table-wrap").style.display = "none";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (document.activeElement.id === "search") return;
  submitForm();
});