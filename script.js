// ====== Простая модель данных и инициализация ======
const LS_KEYS = { entries: "budget_entries_v1", cats: "budget_categories_v1" };

let entries = JSON.parse(localStorage.getItem(LS_KEYS.entries)) || [];
let categories = JSON.parse(localStorage.getItem(LS_KEYS.cats)) || [];

// default categories (если пусто)
const DEFAULT_CATEGORIES = [
  { id: "cat_food", name: "Еда", color: "#ff4d6d" },
  { id: "cat_fuel", name: "Топливо", color: "#28a745" },
  { id: "cat_fun", name: "Развлечения", color: "#ff9800" },
  { id: "cat_shop", name: "Покупки", color: "#2196f3" },
  { id: "cat_other", name: "Прочее", color: "#9c27b0" },
];

if (!categories.length) {
  categories = DEFAULT_CATEGORIES.slice();
  saveAll();
}

// Chart.js объекты
let categoryChart = null;
let monthlyChart = null;

// helper
const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
const monthKey = d => d.slice(0,7); // "YYYY-MM"
const formatMoney = n => (n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + " zł";

// ====== Сохранение/загрузка ======
function saveAll() {
  localStorage.setItem(LS_KEYS.entries, JSON.stringify(entries));
  localStorage.setItem(LS_KEYS.cats, JSON.stringify(categories));
}

// ====== Рендер селекта категорий для формы ======
function populateCategorySelect() {
  const sel = $("entryCategory");
  sel.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.name}`;
    sel.appendChild(opt);
  });
}

// ====== Рендер списка категорий с управлением ======
function renderCategoriesPanel() {
  const wrap = $("categoriesList");
  wrap.innerHTML = "";
  categories.forEach(cat => {
    const el = document.createElement("div");
    el.className = "cat-pill";
    el.innerHTML = `
      <span class="cat-color" style="background:${cat.color}"></span>
      <strong>${cat.name}</strong>
      <span style="opacity:.8;margin-left:8px;font-size:13px">(${entries.filter(e=>e.categoryId===cat.id).length})</span>
      <span class="cat-actions" style="margin-left:8px"></span>
    `;
    const actions = el.querySelector(".cat-actions");
    const editBtn = document.createElement("button");
    editBtn.title = "Редактировать";
    editBtn.innerText = "✎";
    editBtn.onclick = () => editCategory(cat.id);
    const delBtn = document.createElement("button");
    delBtn.title = "Удалить";
    delBtn.innerText = "🗑";
    delBtn.onclick = () => deleteCategory(cat.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    wrap.appendChild(el);
  });
}

// ====== Добавить категорию ======
function addCategory(name, color) {
  if (!name) return alert("Введите имя категории");
  name = name.trim();
  if (!name) return;
  const id = "cat_" + Date.now();
  categories.push({ id, name, color });
  saveAll();
  populateCategorySelect();
  renderCategoriesPanel();
}

// ====== Удалить категорию (переназначить в Прочее) ======
function deleteCategory(id) {
  const cat = categories.find(c=>c.id===id);
  if (!cat) return;
  if (!confirm(`Удалить категорию "${cat.name}"? Все записи перейдут в "Прочее".`)) return;

  // найти или создать Прочее
  let other = categories.find(c=>c.name.toLowerCase()==="прочее" || c.id==="cat_other");
  if (!other) {
    other = { id: "cat_other_" + Date.now(), name: "Прочее", color: "#9c27b0" };
    categories.push(other);
  }

  // переназначить записи
  entries = entries.map(e => e.categoryId === id ? { ...e, categoryId: other.id } : e);
  // удалить категорию
  categories = categories.filter(c => c.id !== id);
  saveAll();
  populateCategorySelect();
  renderCategoriesPanel();
  renderEntries();
  updateAllCharts();
}

// ====== Редактировать категорию ======
function editCategory(id) {
  const cat = categories.find(c=>c.id===id);
  if (!cat) return;
  const newName = prompt("Новое имя категории:", cat.name);
  if (!newName) return;
  const newColor = prompt("Новый HEX цвет (например #FF00AA):", cat.color) || cat.color;
  cat.name = newName.trim();
  cat.color = newColor;
  saveAll();
  populateCategorySelect();
  renderCategoriesPanel();
  renderEntries();
  updateAllCharts();
}

// ====== Добавление записи (income/expense) ======
function addEntryFromForm(ev) {
  ev?.preventDefault?.();
  const desc = $("entryDesc").value.trim();
  const amount = Number($("entryAmount").value);
  const categoryId = $("entryCategory").value;
  const date = $("entryDate").value;
  const type = $("entryType").value;

  if (!desc || !date || !categoryId || isNaN(amount) || amount <= 0) {
    return alert("Проверьте введённые данные (описание, сумма, категория, дата).");
  }
  const id = "e_" + Date.now();
  entries.unshift({ id, description: desc, amount: Number(amount), categoryId, date, type });
  saveAll();
  // очистка формы
  $("entryDesc").value = "";
  $("entryAmount").value = "";
  $("entryDate").value = todayISO();
  $("entryDesc").focus();

  renderEntries();
  updateAllCharts();
}

// ====== Рендер записей с фильтрацией и сортировкой ======
function renderEntries() {
  const list = $("entriesList");
  list.innerHTML = "";
  const month = $("monthPicker").value; // "YYYY-MM"
  const search = $("searchInput").value.trim().toLowerCase();
  const sort = $("sortSelect").value;

  // фильтр: по текущему месяцу (если выбрана) — пользователь хочет смотреть этот месяц
  let filtered = entries.slice();

  if (month) {
    filtered = filtered.filter(e => monthKey(e.date) === month);
  }

  // поиск
  if (search) filtered = filtered.filter(e =>
    (e.description || "").toLowerCase().includes(search) ||
    (getCategoryName(e.categoryId) || "").toLowerCase().includes(search)
  );

  // сортировка
  if (sort === "date_desc") filtered.sort((a,b)=>b.date.localeCompare(a.date));
  else if (sort === "date_asc") filtered.sort((a,b)=>a.date.localeCompare(b.date));
  else if (sort === "amount_desc") filtered.sort((a,b)=>b.amount - a.amount);
  else if (sort === "amount_asc") filtered.sort((a,b)=>a.amount - b.amount);
  else if (sort === "category") filtered.sort((a,b)=>getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId)));

  // render
  filtered.forEach(entry => {
    const cat = categories.find(c=>c.id===entry.categoryId) || { name: "Прочее", color:"#999" };
    const item = document.createElement("div");
    item.className = "entry-item";
    item.innerHTML = `
      <div class="entry-left">
        <div class="cat-color" style="background:${cat.color};width:12px;height:12px;border-radius:4px"></div>
        <div>
          <div><strong>${entry.description}</strong></div>
          <div class="entry-meta">${cat.name} • ${entry.date}</div>
        </div>
      </div>
      <div>
        <div class="entry-amount ${entry.type === 'expense' ? 'expense' : 'income'}">${entry.type === 'expense' ? '-' : '+'}${Number(entry.amount).toLocaleString('ru-RU')} zł</div>
        <div style="text-align:right;margin-top:6px">
          <button onclick="editEntry('${entry.id}')">✎</button>
          <button onclick="deleteEntry('${entry.id}')">🗑</button>
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  $("entryCount").textContent = filtered.length;
  renderSummaryForMonth(month);
}

// ====== Summary (totals) for selected month ======
function renderSummaryForMonth(month) {
  const m = month || $("monthPicker").value; // "YYYY-MM"
  const monthLabel = m ? new Date(m + "-01") : null;
  $("summaryMonthLabel").textContent = monthLabel ? monthLabel.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : "все";

  let totalExpense = 0, totalIncome = 0;
  entries.forEach(e => {
    if (!m || monthKey(e.date) === m) {
      if (e.type === "expense") totalExpense += e.amount;
      else totalIncome += e.amount;
    }
  });

  $("totalExpense").textContent = formatMoney(totalExpense);
  $("totalIncome").textContent = formatMoney(totalIncome);
  $("balance").textContent = formatMoney(totalIncome - totalExpense);

  // progress: ratio expenses / (income+expenses) — просто визуалка
  const denom = (totalIncome + totalExpense) || 1;
  const width = Math.round((totalExpense / denom) * 100);
  $("globalProgress").style.width = width + "%";
}

// ====== Edit/Delete entry ======
function editEntry(id) {
  const e = entries.find(x=>x.id===id);
  if (!e) return;
  const newDesc = prompt("Описание:", e.description) || e.description;
  const newAmount = Number(prompt("Сумма:", e.amount)) || e.amount;
  const newDate = prompt("Дата (YYYY-MM-DD):", e.date) || e.date;
  // choose category from list by name
  const newCatName = prompt("Категория (напишите имя или оставьте текущее):", getCategoryName(e.categoryId)) || getCategoryName(e.categoryId);
  let cat = categories.find(c=>c.name.toLowerCase() === newCatName.toLowerCase());
  if (!cat) {
    // создать новую категорию автоматически
    cat = { id: "cat_" + Date.now(), name: newCatName, color: randomColor() };
    categories.push(cat);
  }
  const newType = prompt("Тип (expense/income):", e.type) || e.type;
  e.description = newDesc;
  e.amount = Number(newAmount);
  e.date = newDate;
  e.categoryId = cat.id;
  e.type = newType === "income" ? "income" : "expense";
  saveAll();
  populateCategorySelect();
  renderCategoriesPanel();
  renderEntries();
  updateAllCharts();
}

function deleteEntry(id) {
  if (!confirm("Удалить запись?")) return;
  entries = entries.filter(e => e.id !== id);
  saveAll();
  renderEntries();
  updateAllCharts();
}

// ====== Charts ======
function updateCategoryChart(selectedMonth) {
  const ctx = $("categoryChart").getContext("2d");
  const m = selectedMonth || $("monthPicker").value;
  const totals = {};
  entries.forEach(e=>{
    if (m && monthKey(e.date) !== m) return;
    if (e.type !== "expense") return; // показываем долю трат
    totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
  });
  const labels = Object.keys(totals).map(id => getCategoryName(id));
  const data = Object.keys(totals).map(id => totals[id]);
  const colors = Object.keys(totals).map(id => (categories.find(c=>c.id===id)||{}).color || randomColor());

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { plugins:{legend:{labels:{color:'#fff'}}}, responsive:true }
  });
}

function updateMonthlyChart() {
  // последние 12 месяцев
  const now = new Date();
  const months = [];
  for (let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.toISOString().slice(0,7);
    months.push({ key, label: d.toLocaleString('ru-RU',{month:'short', year:'numeric'}) });
  }
  const expenseData = months.map(m=>{
    return entries.reduce((sum,e)=> monthKey(e.date)===m.key && e.type==='expense' ? sum + e.amount : sum, 0);
  });
  const incomeData = months.map(m=>{
    return entries.reduce((sum,e)=> monthKey(e.date)===m.key && e.type==='income' ? sum + e.amount : sum, 0);
  });

  const ctx = $("monthlyChart").getContext("2d");
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m=>m.label),
      datasets: [
        { label: 'Траты', data: expenseData, backgroundColor: 'rgba(255,99,132,0.8)' },
        { label: 'Доходы', data: incomeData, backgroundColor: 'rgba(54,205,132,0.8)' }
      ]
    },
    options: {
      responsive:true,
      scales:{x:{ticks:{color:'#fff'}}, y:{ticks:{color:'#fff'}}},
      plugins:{legend:{labels:{color:'#fff'}}}
    }
  });
}

function updateAllCharts() {
  updateCategoryChart();
  updateMonthlyChart();
}

// ====== Утилиты ======
function getCategoryName(id){ return (categories.find(c=>c.id===id)||{name:'Прочее'}).name; }
function randomColor(){ return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'); }

// ====== Month picker helpers ======
function setMonthPickerToToday() {
  const today = new Date();
  const val = today.toISOString().slice(0,7);
  $("monthPicker").value = val;
}
function changeMonth(offset) {
  const cur = $("monthPicker").value ? new Date($("monthPicker").value + "-01") : new Date();
  cur.setMonth(cur.getMonth() + offset);
  $("monthPicker").value = cur.toISOString().slice(0,7);
  renderEntries();
  updateAllCharts();
}

// ====== Export / Import ======
function exportData() {
  const data = { entries, categories };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "budget_export.json"; a.click();
  URL.revokeObjectURL(url);
}
function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      if (obj.categories) categories = obj.categories;
      if (obj.entries) entries = obj.entries;
      saveAll();
      populateCategorySelect();
      renderCategoriesPanel();
      renderEntries();
      updateAllCharts();
      alert("Импорт завершён.");
    } catch {
      alert("Неверный файл импорта.");
    }
  };
  reader.readAsText(file);
}

// ====== Clear all ======
function clearAll() {
  if (!confirm("Полностью очистить все записи и категории?")) return;
  entries = []; categories = DEFAULT_CATEGORIES.slice();
  saveAll();
  populateCategorySelect();
  renderCategoriesPanel();
  renderEntries();
  updateAllCharts();
}

// ====== Init UI, listeners ======
document.addEventListener("DOMContentLoaded", () => {
  // elements defaults
  populateCategorySelect();
  renderCategoriesPanel();

  // set default date fields
  $("entryDate").value = todayISO();
  setMonthPickerToToday();

  // form
  $("entryForm").addEventListener("submit", addEntryFromForm);

  // add category btn
  $("addCategoryBtn").addEventListener("click", () => {
    const name = $("newCategoryName").value.trim();
    const color = $("newCategoryColor").value;
    if (!name) return alert("Введите имя категории");
    addCategory(name, color);
    $("newCategoryName").value = "";
  });

  // month prev/next
  $("prevMonth").addEventListener("click", ()=>changeMonth(-1));
  $("nextMonth").addEventListener("click", ()=>changeMonth(1));
  $("monthPicker").addEventListener("change", ()=>{ renderEntries(); updateAllCharts(); });

  // search / sort
  $("searchInput").addEventListener("input", () => renderEntries());
  $("sortSelect").addEventListener("change", () => renderEntries());

  // export/import
  $("exportBtn").addEventListener("click", exportData);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (ev)=> importData(ev.target.files[0]));

  // clear all
  $("clearAllBtn").addEventListener("click", clearAll);

  // initial render
  renderEntries();
  updateAllCharts();
});
