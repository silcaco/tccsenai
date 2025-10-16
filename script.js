// --------- INICIALIZAÇÃO DO FIREBASE ---------
const firebaseConfig = {
  apiKey: "AIzaSyDv8Ib0Ymrg0ceZ4rxEkdoq53fk3p9gnG0",
  authDomain: "tccsenai-9222f.firebaseapp.com",
  projectId: "tccsenai-9222f",
  storageBucket: "tccsenai-9222f.firebasestorage.app",
  messagingSenderId: "439842353121",
  appId: "1:439842353121:web:83cb686a60a5a41734aca0",
  measurementId: "G-7M66CJ184X"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --------- FERIDOS NACIONAIS (exemplo 2025 BR) ---------
const FERIADOS_BR = [
  { data: '2025-01-01', nome: 'Confraternização Universal' },
  { data: '2025-02-04', nome: 'Carnaval' },
  { data: '2025-04-18', nome: 'Sexta-feira Santa' },
  { data: '2025-04-21', nome: 'Tiradentes' },
  { data: '2025-05-01', nome: 'Dia do Trabalhador' },
  { data: '2025-06-19', nome: 'Corpus Christi' },
  { data: '2025-09-07', nome: 'Independência do Brasil' },
  { data: '2025-10-12', nome: 'Nossa Senhora Aparecida' },
  { data: '2025-11-02', nome: 'Finados' },
  { data: '2025-11-15', nome: 'Proclamação da República' },
  { data: '2025-12-25', nome: 'Natal' }
];

// --------- UTILIDADES ---------
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatTime(timeStr) {
  return timeStr ? timeStr.slice(0, 5) : '';
}
function todayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().slice(0, 10);
}
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}
function inThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  const end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return d >= start && d <= end;
}
function inThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function compareDates(a, b) {
  return new Date(a) - new Date(b);
}
function getFeriado(dateStr) {
  return FERIADOS_BR.find(f => f.data === dateStr);
} 

// --------- AUTENTICAÇÃO E DADOS ---------
let currentUser = null;
let userData = { events: [], tasks: [], settings: { theme: 'default' }, plano: 'free' };

auth.onAuthStateChanged(async (user) => {
  if (user) {
      currentUser = {
          uid: user.uid,
          email: user.email,
          nome: user.displayName || 'Usuário'
      };
      if (user.email === 'admin@agenda.com') {
          currentUser.nome = 'Administrador';
      }
      await loadUserData();
      showMain();
  } else {
      currentUser = null;
      userData = { events: [], tasks: [], settings: { theme: 'default' }, plano: 'free' };
      showAuthPage();
  }
});

async function loadUserData() {
  if (!currentUser) return;
  try {
      const docRef = db.collection('userData').doc(currentUser.uid);
      const doc = await docRef.get();
      if (doc.exists) {
          userData = doc.data();
          currentUser.nome = userData.nome || currentUser.nome;
          if (!userData.events) userData.events = [];
          if (!userData.tasks) userData.tasks = [];
          if (!userData.settings) userData.settings = { theme: 'default' };
          if (!userData.settings.theme) userData.settings.theme = 'default';
          if (!userData.plano) userData.plano = 'free';
      } else {
          const initialData = {
              nome: currentUser.nome,
              email: currentUser.email,
              events: [], tasks: [], 
              settings: { darkMode: false, emailNotif: false, theme: 'default' },
              plano: 'free'
          };
          await docRef.set(initialData);
          userData = initialData;
      }
      applyTheme(userData.settings.theme);
  } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
      alert("Não foi possível carregar seus dados. Tente recarregar a página.");
  }
}

async function saveUserData() {
  if (!currentUser) return;
  try {
      const docRef = db.collection('userData').doc(currentUser.uid);
      await docRef.set(userData, { merge: true });
  } catch (error) {
      console.error("Erro ao salvar dados do usuário:", error);
      alert("Ocorreu um erro ao salvar suas alterações.");
  }
}

async function logoutUser() {
  try {
      await auth.signOut();
      window.location.reload();
  } catch (error) {
      console.error("Erro ao fazer logout:", error);
  }
}

// --------- ESTADO E UI ---------
let currentPage = 'inicio';
let calendarMonth = (new Date()).getMonth();
let calendarYear = (new Date()).getFullYear();

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.container section').forEach(sec => sec.classList.add('hidden'));
  if (document.getElementById(page + 'Page')) {
      document.getElementById(page + 'Page').classList.remove('hidden');
  }
  document.querySelectorAll('.header nav button').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + page);
  if (navBtn) navBtn.classList.add('active');

  if (page === 'calendario') renderCalendar();
  if (page === 'tarefas') renderAllTasks();
  if (page === 'admin') renderAdminUsers();
  if (page === 'premium') updatePremiumPage();
}

// --------- LOGIN, REGISTRO, RESET ---------
document.getElementById('toRegister').onclick = () => {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.remove('hidden');
  document.getElementById('resetBox').classList.add('hidden');
  clearMsgs();
};
document.getElementById('toLogin1').onclick = document.getElementById('toLogin2').onclick = () => {
  document.getElementById('loginBox').classList.remove('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('resetBox').classList.add('hidden');
  clearMsgs();
};
document.getElementById('toReset').onclick = () => {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('resetBox').classList.remove('hidden');
  clearMsgs();
};
function clearMsgs() {
  document.getElementById('loginMsg').textContent = '';
  document.getElementById('registerMsg').textContent = '';
  document.getElementById('resetMsg').textContent = '';
  document.getElementById('resetMsg').classList.remove('success');
}

document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const senha = document.getElementById('loginSenha').value;
  const msgEl = document.getElementById('loginMsg');
  msgEl.textContent = 'Entrando...';

  try {
      await auth.signInWithEmailAndPassword(email, senha);
  } catch (error) {
      msgEl.textContent = 'E-mail ou senha inválidos!';
      console.error("Erro de login:", error.message);
  }
};

document.getElementById('registerForm').onsubmit = async function(e) {
  e.preventDefault();
  const nome = document.getElementById('regNome').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const senha = document.getElementById('regSenha').value;
  const msgEl = document.getElementById('registerMsg');
  msgEl.textContent = 'Registrando...';

  if (!nome || !email || senha.length < 6) {
      msgEl.textContent = 'Preencha todos os campos. A senha deve ter no mínimo 6 caracteres.';
      return;
  }

  try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
      await userCredential.user.updateProfile({ displayName: nome });

      // Salva info do cartão fake para teste (últimos 4 dígitos aleatórios)
      const fakeCard = '**** **** **** ' + (Math.floor(1000 + Math.random() * 9000));
      const initialUserData = {
          nome: nome,
          email: email,
          events: [],
          tasks: [],
          settings: { darkMode: false, emailNotif: false, theme: 'default' },
          plano: 'free',
          cartao: fakeCard
      };
      await db.collection('userData').doc(userCredential.user.uid).set(initialUserData);
      
  } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
          msgEl.textContent = 'Este e-mail já está cadastrado!';
      } else {
          msgEl.textContent = 'Ocorreu um erro ao registrar.';
      }
      console.error("Erro de registro:", error.message);
  }
};

document.getElementById('resetForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const msgEl = document.getElementById('resetMsg');
  msgEl.textContent = 'Enviando...';
  try {
      await auth.sendPasswordResetEmail(email);
      msgEl.textContent = 'Um e-mail de redefinição de senha foi enviado para você.';
      msgEl.classList.add('success');
      setTimeout(() => { document.getElementById('toLogin2').onclick(); }, 3000);
  } catch (error) {
      msgEl.textContent = 'E-mail não encontrado ou erro ao enviar.';
      msgEl.classList.remove('success');
      console.error("Erro ao resetar senha:", error.message);
  }
};

// --------- PÁGINAS DA APLICAÇÃO ---------
function showAuthPage() {
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('header').classList.add('hidden');
  document.getElementById('mainPage').classList.add('hidden');
}

function showMain() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  const user = currentUser;

  const nav = document.querySelector('.header nav');
  let adminButton = document.getElementById('nav-admin');
  if (user && user.email === 'admin@agenda.com') {
      document.getElementById('userLabel').textContent = user.nome + ' (Admin)';
      if (!adminButton) {
          adminButton = document.createElement('button');
          adminButton.id = 'nav-admin';
          adminButton.textContent = 'Admin';
          adminButton.onclick = () => showPage('admin');
          document.getElementById('nav-config').after(adminButton);
      }
  } else {
      document.getElementById('userLabel').textContent = user ? user.nome : '';
      if (adminButton) {
          nav.removeChild(adminButton);
      }
  }

  document.getElementById('header').classList.remove('hidden');
  showPage('inicio');

  renderUpcoming();
  renderTasks();
  renderCalendar();
  renderAllTasks();
  updatePlanStatusUI();
  
  document.getElementById('darkMode').checked = !!userData.settings.darkMode;
  document.getElementById('emailNotif').checked = !!userData.settings.emailNotif;
  applyDarkMode(!!userData.settings.darkMode);
  
  document.querySelectorAll('.premium-only').forEach(el => {
    if (userData.plano === 'premium') {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
  });
}

// --------- NAVEGAÇÃO PRINCIPAL ---------
document.getElementById('nav-inicio').onclick = () => showPage('inicio');
document.getElementById('nav-calendario').onclick = () => showPage('calendario');
document.getElementById('nav-tarefas').onclick = () => showPage('tarefas');
document.getElementById('nav-premium').onclick = () => showPage('premium');
document.getElementById('nav-sobre').onclick = () => showPage('sobre');
document.getElementById('nav-config').onclick = () => showPage('config');
document.getElementById('logoutBtn').onclick = logoutUser;

// --------- EVENTOS ---------
function renderUpcoming() {
  const today = todayISO();
  const events = (userData.events || [])
      .filter(ev => ev.date >= today)
      .sort((a, b) => compareDates(a.date, b.date) || a.time.localeCompare(b.time))
      .slice(0, 4);
  const ul = document.getElementById('upcomingEvents');
  ul.innerHTML = '';
  if (events.length === 0) {
      ul.innerHTML = `<li style="color:var(--text-light);">Nenhum evento agendado.</li>`;
      return;
  }
  events.forEach((ev) => {
      const li = document.createElement('li');
      li.innerHTML = `
          <div>
              <span class="event-title">${ev.title}</span>
              <div class="event-time">${formatDateBR(ev.date)} - ${formatTime(ev.time)}</div>
              ${ev.desc ? `<div class="event-desc">${ev.desc}</div>` : ''}
          </div>
          <button class="delete-btn" title="Excluir" onclick="deleteEvent('${ev.id}')">&times;</button>
      `;
      ul.appendChild(li);
  });
}

window.deleteEvent = async function(eventId) {
  userData.events = userData.events.filter(ev => ev.id !== eventId);
  await saveUserData();
  renderUpcoming();
  renderCalendar();
};

document.getElementById('addEventForm').onsubmit = async function(e) {
  e.preventDefault();
  
  if (userData.plano === 'free' && userData.events.length >= 5) {
      alert('Você atingiu o limite de 5 eventos do plano gratuito. Assine o Premium para adicionar eventos ilimitados!');
      showPage('premium');
      return;
  }
  
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const desc = document.getElementById('eventDesc').value.trim();
  if (!title || !date || !time) return;
  
  const newEvent = { id: generateId(), title, date, time, desc };
  userData.events.push(newEvent);
  await saveUserData();
  
  this.reset();
  renderUpcoming();
  renderCalendar();
};

// --------- TAREFAS ---------
function renderTasks(filter = 'all', ulId = 'upcomingTasks') {
  let tasks = (userData.tasks || []).filter(t => !t.done);
  const today = todayISO();

  if (filter === 'today') tasks = tasks.filter(t => t.date === today);
  else if (filter === 'week') tasks = tasks.filter(t => inThisWeek(t.date));
  else if (filter === 'month') tasks = tasks.filter(t => inThisMonth(t.date));

  tasks.sort((a, b) => compareDates(a.date, b.date));
  const ul = document.getElementById(ulId);
  ul.innerHTML = '';
  if (tasks.length === 0) {
      ul.innerHTML = `<li style="color:var(--text-light);">Nenhuma tarefa pendente.</li>`;
      return;
  }
  tasks.forEach((t) => {
      const li = document.createElement('li');
      li.innerHTML = `
          <div>
              <button class="done-btn" title="Concluir" onclick="markTaskDone('${t.id}')">✓</button>
              <span class="task-title">${t.title}</span>
          </div>
          <div style="display:flex;align-items:center;">
              <span style="font-size:0.95rem;color:var(--text-light);">${formatDateBR(t.date)}</span>
              <button class="delete-btn" title="Excluir" onclick="deleteTask('${t.id}')">&times;</button>
          </div>
      `;
      ul.appendChild(li);
  });
}

function renderAllTasks() {
  renderTasks('all', 'allTasksList');
}

window.markTaskDone = async function(taskId) {
  const task = userData.tasks.find(t => t.id === taskId);
  if (task) {
      task.done = true;
      await saveUserData();
      renderBasedOnCurrentFilters();
  }
};

window.deleteTask = async function(taskId) {
  userData.tasks = userData.tasks.filter(t => t.id !== taskId);
  await saveUserData();
  renderBasedOnCurrentFilters();
};

function renderBasedOnCurrentFilters() {
  const activeFilter1 = document.querySelector('#tasksFilter button.active')?.dataset.filter || 'all';
  const activeFilter2 = document.querySelector('#tasksFilter2 button.active')?.dataset.filter || 'all';
  renderTasks(activeFilter1, 'upcomingTasks');
  renderTasks(activeFilter2, 'allTasksList');
  renderCalendar();
}

async function handleAddTask(title, date, priority) {
  if (!title || !date) return;
  
  if (userData.plano === 'free' && userData.tasks.length >= 10) {
      alert('Você atingiu o limite de 10 tarefas do plano gratuito. Assine o Premium para adicionar tarefas ilimitadas!');
      showPage('premium');
      return;
  }
  
  const newTask = { id: generateId(), title, date, priority, done: false };
  userData.tasks.push(newTask);
  await saveUserData();
  renderBasedOnCurrentFilters();
}

document.getElementById('addTaskForm').onsubmit = async function(e) { e.preventDefault(); await handleAddTask(document.getElementById('taskTitle').value.trim(), document.getElementById('taskDate').value, document.getElementById('taskPriority').value); this.reset(); };
document.getElementById('addTaskForm2').onsubmit = async function(e) { e.preventDefault(); await handleAddTask(document.getElementById('taskTitle2').value.trim(), document.getElementById('taskDate2').value, document.getElementById('taskPriority2').value); this.reset(); };
document.querySelectorAll('#tasksFilter button, #tasksFilter2 button').forEach(btn => { btn.onclick = function() { this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active')); this.classList.add('active'); const filter = this.dataset.filter; if (this.parentElement.id === 'tasksFilter') { renderTasks(filter, 'upcomingTasks'); } else { renderTasks(filter, 'allTasksList'); } }; });

// --------- CALENDÁRIO COM FERIADOS ---------
function renderCalendar() {
  const today = todayISO();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
  const table = document.getElementById('calendarTable');
  table.innerHTML = '';
  const headerRow = document.createElement('tr');
  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => {
      const th = document.createElement('th');
      th.textContent = day;
      headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  let current = new Date(startDate);
  while (current <= endDate) {
      const row = document.createElement('tr');
      for (let i = 0; i < 7; i++) {
          const td = document.createElement('td');
          current.setHours(12);
          const dateStr = current.toISOString().slice(0, 10);
          td.textContent = current.getDate();
          if (dateStr === today) td.classList.add('today');
          if(current.getMonth() !== calendarMonth) td.classList.add('other-month');
          const hasEvent = (userData.events || []).some(ev => ev.date === dateStr);
          const hasTask = (userData.tasks || []).some(t => t.date === dateStr && !t.done);
          if (hasEvent) td.classList.add('has-event');
          if (hasTask) td.classList.add('has-task');

          // FERIADO
          const feriado = getFeriado(dateStr);
          if (feriado) {
            td.classList.add('is-holiday');
            td.title = feriado.nome;
          }
          td.onclick = () => showDayDetails(dateStr);
          row.appendChild(td);
          current.setDate(current.getDate() + 1);
      }
      table.appendChild(row);
  }
}
function showDayDetails(dateStr) {
  const events = (userData.events || []).filter(ev => ev.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const tasks = (userData.tasks || []).filter(t => t.date === dateStr && !t.done);
  const feriado = getFeriado(dateStr);
  const detailsContent = document.getElementById('dayDetailsContent');
  detailsContent.innerHTML = '';
  let empty = (events.length === 0 && tasks.length === 0 && !feriado);
  if (empty) {
      detailsContent.innerHTML = '<div class="no-items">Nenhum evento, tarefa ou feriado para este dia.</div>';
  } else {
      if (feriado) {
        const div = document.createElement('div');
        div.className = 'day-holiday-item';
        div.innerHTML = `<div class="day-holiday-title">Feriado: ${feriado.nome}</div>`;
        detailsContent.appendChild(div);
      }
      if (events.length > 0) {
          events.forEach(event => {
              const eventDiv = document.createElement('div');
              eventDiv.className = 'day-event-item';
              eventDiv.innerHTML = `<div class="day-event-title">${event.title}</div><div class="day-event-time">${formatTime(event.time)}</div>${event.desc ? `<div class="day-event-desc">${event.desc}</div>` : ''}`;
              detailsContent.appendChild(eventDiv);
          });
      }
      if (tasks.length > 0) {
          tasks.forEach(task => {
              const taskDiv = document.createElement('div');
              taskDiv.className = 'day-task-item';
              taskDiv.innerHTML = `<div class="day-task-title">${task.title}</div><div class="day-task-priority">Prioridade: ${task.priority}</div>`;
              detailsContent.appendChild(taskDiv);
          });
      }
  }
  document.getElementById('dayDetailsTitle').textContent = `Detalhes do Dia - ${formatDateBR(dateStr)}`;
  document.getElementById('dayDetails').classList.remove('hidden');
}
document.getElementById('closeDayDetails').onclick = function() { document.getElementById('dayDetails').classList.add('hidden'); };
document.getElementById('prevMonthBtn').onclick = function() { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); };
document.getElementById('nextMonthBtn').onclick = function() { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); };

// --------- PÁGINA DE ADMINISTRAÇÃO (modificado) ---------
async function renderAdminUsers() {
  const usersListEl = document.getElementById('adminUsersList');
  usersListEl.innerHTML = '<div>Carregando usuários...</div>';
  try {
    const snapshot = await db.collection('userData').get();
    if (snapshot.empty) {
      usersListEl.innerHTML = '<div>Nenhum usuário encontrado.</div>';
      return;
    }
    usersListEl.innerHTML = '';
    snapshot.forEach(doc => {
      const u = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-user-info';
      div.innerHTML = `
        <strong>Nome:</strong> ${u.nome || ''}<br>
        <strong>E-mail:</strong> ${u.email || ''}<br>
        <strong>Plano:</strong> ${u.plano ? (u.plano === 'premium' ? 'Premium' : 'Grátis') : 'Grátis'}<br>
        <strong>Cartão:</strong> ${u.cartao || '---'}<br>
        <button class="view-details-btn" onclick="showAdminUserDetail('${doc.id}')">Ver Detalhes</button>
      `;
      usersListEl.appendChild(div);
    });
  } catch (err) {
    usersListEl.innerHTML = '<div>Erro ao carregar usuários.</div>';
  }
}

window.showAdminUserDetail = async function(userId) {
  const detailsEl = document.getElementById('adminUserDetails');
  detailsEl.innerHTML = 'Carregando dados...';
  try {
    const doc = await db.collection('userData').doc(userId).get();
    if (!doc.exists) {
      detailsEl.innerHTML = 'Usuário não encontrado.';
      return;
    }
    const u = doc.data();
    let html = `
      <div class="admin-user-details-header">
        <h3>Detalhes do Usuário: ${u.nome}</h3>
        <button onclick="document.getElementById('adminUserDetails').innerHTML=''">Fechar</button>
      </div>
      <div class="admin-user-info">
        <p><strong>Nome:</strong> ${u.nome}</p>
        <p><strong>E-mail:</strong> ${u.email}</p>
        <p><strong>Plano:</strong> ${u.plano ? (u.plano === 'premium' ? 'Premium' : 'Grátis') : 'Grátis'}</p>
        <p><strong>Cartão:</strong> ${u.cartao || '---'}</p>
      </div>
      <div class="panel">
        <h3>Eventos Agendados</h3>
        <ul class="event-list">
          ${
            (u.events && u.events.length > 0) ?
            u.events.map(ev => `<li>
              <span class="event-title">${ev.title}</span>
              <span class="event-time">${formatDateBR(ev.date)} ${formatTime(ev.time)}</span>
              ${ev.desc ? `<div class="event-desc">${ev.desc}</div>` : ''}
            </li>`).join('')
            : '<li style="color:var(--text-light);">Nenhum evento.</li>'
          }
        </ul>
      </div>
      <div class="panel">
        <h3>Tarefas Agendadas</h3>
        <ul class="task-list">
          ${
            (u.tasks && u.tasks.length > 0) ?
            u.tasks.map(t => `<li>
              <span class="task-title${t.done ? ' done' : ''}">${t.title}</span>
              <span style="font-size:0.97rem;color:var(--text-light);">${formatDateBR(t.date)}</span>
              <span style="margin-left:8px;">Prioridade: ${t.priority || '-'}</span>
              ${t.done ? '<span style="color:var(--success);margin-left:8px;">Concluída</span>' : ''}
            </li>`).join('')
            : '<li style="color:var(--text-light);">Nenhuma tarefa.</li>'
          }
        </ul>
      </div>
    `;
    detailsEl.innerHTML = html;
  } catch (err) {
    detailsEl.innerHTML = 'Erro ao buscar usuário.';
  }
};

// --------- CONFIGURAÇÕES ---------
function applyDarkMode(enabled) {
  if (enabled) {
      document.documentElement.style.setProperty('--background', '#111827');
      document.documentElement.style.setProperty('--white', '#1f2937');
      document.documentElement.style.setProperty('--gray', '#374151');
      document.documentElement.style.setProperty('--gray2', '#4b5563');
      document.documentElement.style.setProperty('--text', '#f9fafb');
      document.documentElement.style.setProperty('--text-light', '#d1d5db');
  } else {
      document.documentElement.style.setProperty('--background', '#f8fafc');
      document.documentElement.style.setProperty('--white', '#fff');
      document.documentElement.style.setProperty('--gray', '#e5e7eb');
      document.documentElement.style.setProperty('--gray2', '#f3f4f6');
      document.documentElement.style.setProperty('--text', '#111827');
      document.documentElement.style.setProperty('--text-light', '#6b7280');
  }
}
document.getElementById('darkMode').onchange = async function() { userData.settings.darkMode = this.checked; await saveUserData(); applyDarkMode(this.checked); };
document.getElementById('emailNotif').onchange = async function() { userData.settings.emailNotif = this.checked; await saveUserData(); };

// --------- PREMIUM: Lógica da página, Pagamento e Funcionalidades ---------
function updatePlanStatusUI() {
    const planStatusEl = document.getElementById('planStatus');
    const badge = planStatusEl.querySelector('.plan-badge');
    if (userData.plano === 'premium') { badge.textContent = 'PREMIUM'; badge.className = 'plan-badge premium'; } 
    else { badge.textContent = 'GRÁTIS'; badge.className = 'plan-badge free'; }
}
function updatePremiumPage() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const premiumCard = subscribeBtn.closest('.premium-card');
    if (userData.plano === 'premium') { subscribeBtn.textContent = 'Seu Plano Atual'; subscribeBtn.disabled = true; premiumCard.classList.remove('featured'); } 
    else { subscribeBtn.textContent = 'Assinar Agora'; subscribeBtn.disabled = false; premiumCard.classList.add('featured'); }
}
document.getElementById('subscribeBtn').onclick = () => { document.getElementById('paymentModalOverlay').classList.remove('hidden'); };
document.getElementById('cancelPaymentBtn').onclick = () => { document.getElementById('paymentModalOverlay').classList.add('hidden'); };
document.getElementById('paymentForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('paymentFormContainer').classList.add('hidden');
    document.getElementById('successAnimationContainer').classList.remove('hidden');
    setTimeout(async () => {
        userData.plano = 'premium';
        // Salva um número fake de cartão para o admin visualizar
        userData.cartao = document.getElementById('cardNumber').value
            ? '**** **** **** ' + document.getElementById('cardNumber').value.slice(-4)
            : (userData.cartao || '**** **** **** 1234');
        await saveUserData();
        window.location.reload();
    }, 2500);
};

// --------- PREMIUM AVANÇADO: Lógica das novas funcionalidades ---------
function applyTheme(themeName) {
    if (!themeName) themeName = 'default';
    document.documentElement.className = `theme-${themeName}`;
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.theme === themeName);
    });
}
document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.onclick = async function() {
        const theme = this.dataset.theme;
        userData.settings.theme = theme;
        applyTheme(theme);
        await saveUserData();
    };
});
document.getElementById('supportForm').onsubmit = function(e) {
    e.preventDefault();
    const message = document.getElementById('supportMessage').value;
    alert(`Mensagem de suporte enviada com prioridade!\n\nSua solicitação foi recebida e será analisada pela nossa equipe em até 24 horas.\n\nMensagem: "${message}"`);
    this.reset();
};

// --------- EXPORTAR PDF (usando jsPDF) ---------
document.getElementById('exportPdfBtn').onclick = function() {
    // Gera PDF com eventos e tarefas
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Agenda Online - Exportação', 14, 18);

    let y = 30;

    doc.setFontSize(14);
    doc.text('Eventos:', 14, y);
    y += 8;

    const eventos = (userData.events || []);
    if(eventos.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhum evento.', 20, y);
        y += 8;
    } else {
        eventos.forEach(ev => {
            doc.setFont('helvetica', 'bold');
            doc.text(ev.title, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatDateBR(ev.date)} ${formatTime(ev.time)}`, 70, y);
            y += 7;
            if(ev.desc) {
                doc.setFontSize(12);
                doc.text(ev.desc, 25, y);
                y += 7;
                doc.setFontSize(14);
            }
            if(y > 270) { doc.addPage(); y = 20; }
        });
    }

    y += 6;
    doc.setFontSize(14);
    doc.text('Tarefas Pendentes:', 14, y);
    y += 8;

    const tarefas = (userData.tasks || []).filter(t => !t.done);
    if(tarefas.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhuma tarefa.', 20, y);
        y += 8;
    } else {
        tarefas.forEach(t => {
            doc.setFont('helvetica', 'bold');
            doc.text(t.title, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatDateBR(t.date)}  [Prioridade: ${t.priority}]`, 70, y);
            y += 7;
            if(y > 270) { doc.addPage(); y = 20; }
        });
    }

    y += 8;
    doc.setFontSize(10);
    doc.text('Exportado em: ' + new Date().toLocaleString('pt-BR'), 14, y);

    doc.save('agenda-online.pdf');
};

// --------- INICIALIZAÇÃO ---------
window.onload = function() {
  const today = todayISO();
  document.querySelectorAll('input[type="date"]').forEach(input => {
      input.min = today;
      if (!input.value) input.value = today;
  });
};