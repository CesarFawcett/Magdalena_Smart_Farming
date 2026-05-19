import './style.css';
import { saveSession, getSession } from './utils/db';
import { resolveUrl, openServerConfigModal, isNativeApp } from './utils/api';
import { handleMockRequest } from './utils/mockApi';

const loginForm = document.getElementById('login-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const loginLinks = document.getElementById('login-links');
const loginBtn = document.getElementById('btn-login');
const resetBtn = document.getElementById('btn-reset');

const linkForgot = document.getElementById('link-forgot-password');
const btnBackToLogin = document.getElementById('btn-back-to-login');

// View Switching
linkForgot.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  loginLinks.classList.add('hidden');
  forgotPasswordForm.classList.remove('hidden');
});

btnBackToLogin.addEventListener('click', () => {
  forgotPasswordForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  loginLinks.classList.remove('hidden');
});

// Check for existing session or remembered email on load
window.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  if (session) {
    console.log('Bienvenido de nuevo,', session.email);
    document.getElementById('email').value = session.email;
  } else {
    // If no session, check for remembered email
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      document.getElementById('email').value = rememberedEmail;
      document.getElementById('remember-me').checked = true;
    }
  }
});

// Login Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Autenticando...';

  // real API call or mock
  try {
    let response;
    const url = resolveUrl('http://localhost:8080/api/auth/login');
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    };

    if (isNativeApp()) {
        console.info('Native APK detected: using mock data for login ->', url);
        response = await handleMockRequest(url, options);
    } else {
        response = await fetch(url, options);
    }

    if (response.ok) {
      const data = await response.json();
      console.log('Login exitoso:', data);
      
      const rememberMe = document.getElementById('remember-me').checked;
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      await saveSession({ 
        email: data.email,
        name: data.name,
        token: data.token
      });
      // Also store in localStorage for quick sync access in authFetch
      localStorage.setItem('magdalena_session', JSON.stringify({ token: data.token }));

      loginBtn.style.background = '#4ADE80';
      loginBtn.textContent = '¡Acceso Concedido!';
      
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
    } else {
      throw new Error('Credenciales inválidas');
    }

  } catch (error) {
    console.error('Error de login:', error);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Error - Reintentar';
    loginBtn.style.background = '#EF4444';
  }
});

// Forgot Password Submission
forgotPasswordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;

  resetBtn.disabled = true;
  resetBtn.textContent = 'Enviando...';

  setTimeout(() => {
    alert(`Se han enviado las instrucciones de recuperación a: ${email}`);
    resetBtn.disabled = false;
    resetBtn.textContent = 'Enviar Instrucciones';
    
    // Auto return to login
    forgotPasswordForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    loginLinks.classList.remove('hidden');
  }, 1500);
});

// Add some micro-animations for input focus
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
  input.addEventListener('focus', () => {
    input.parentElement.querySelector('label').style.color = 'var(--primary-green)';
  });
  input.addEventListener('blur', () => {
    input.parentElement.querySelector('label').style.color = 'var(--text-muted)';
  });
});

// Server Configuration Modal Trigger
const btnConfigServer = document.getElementById('btn-config-server');
if (btnConfigServer) {
  btnConfigServer.addEventListener('click', () => {
    openServerConfigModal();
  });
}
