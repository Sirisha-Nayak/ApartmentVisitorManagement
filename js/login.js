/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM - LOGIN CONTROLLER
 * Security Staff and Administration Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginTabs();
  initLoginForm();
});

function initLoginTabs() {
  const tabPassword = document.getElementById('tab-password');
  const tabPin = document.getElementById('tab-pin');
  const groupPassword = document.getElementById('group-password-mode');
  const groupPin = document.getElementById('group-pin-mode');

  if (tabPassword && tabPin) {
    tabPassword.addEventListener('click', () => {
      tabPassword.classList.add('active');
      tabPin.classList.remove('active');
      groupPassword.style.display = 'block';
      groupPin.style.display = 'none';
    });

    tabPin.addEventListener('click', () => {
      tabPin.classList.add('active');
      tabPassword.classList.remove('active');
      groupPassword.style.display = 'none';
      groupPin.style.display = 'block';
    });
  }
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isPinMode = document.getElementById('tab-pin')?.classList.contains('active');

    let payload = {};
    if (isPinMode) {
      const pin = document.getElementById('login-pin').value;
      if (!pin) {
        Toast.error('Input Required', 'Please enter your 4-digit security PIN');
        return;
      }
      payload = { pin };
    } else {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      if (!username || !password) {
        Toast.error('Input Required', 'Please enter your username and password');
        return;
      }
      payload = { username, password };
    }

    try {
      const btnSubmit = document.getElementById('btn-login-submit');
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Verifying Credentials...';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Sign In to Security Gate';

      if (data.success) {
        localStorage.setItem('apt_security_session', JSON.stringify(data.data));
        Toast.success('Access Granted', data.message);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      } else {
        Toast.error('Authentication Failed', data.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      Toast.error('Network Error', 'Could not connect to authentication server');
      const btnSubmit = document.getElementById('btn-login-submit');
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Sign In to Security Gate';
      }
    }
  });
}

// Quick autofill demo credentials helper
function fillDemoCredentials(type) {
  const tabPassword = document.getElementById('tab-password');
  const tabPin = document.getElementById('tab-pin');

  if (type === 'guard-pin') {
    if (tabPin) tabPin.click();
    document.getElementById('login-pin').value = '5678';
    Toast.info('PIN Filled', 'Guard PIN "5678" entered. Click Sign In to enter.');
  } else if (type === 'admin-pin') {
    if (tabPin) tabPin.click();
    document.getElementById('login-pin').value = '1234';
    Toast.info('PIN Filled', 'Admin Supervisor PIN "1234" entered.');
  } else {
    if (tabPassword) tabPassword.click();
    document.getElementById('login-username').value = 'admin';
    document.getElementById('login-password').value = 'password123';
    Toast.info('Credentials Filled', 'Admin username and password entered.');
  }
}
