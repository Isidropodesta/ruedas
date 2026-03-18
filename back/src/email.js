// email.js — helper para enviar emails con nodemailer
const nodemailer = require('nodemailer');

// Configuración: soporta SMTP genérico o Gmail
// Variables de entorno necesarias:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// Ejemplo para Gmail:
//   SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=tu@gmail.com, SMTP_PASS=app-password
function createTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    console.log('[Email] Sin configuración SMTP — email no enviado:', subject);
    return false;
  }
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transport.sendMail({ from, to, subject, html });
    console.log(`[Email] Enviado a ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('[Email] Error al enviar:', err.message);
    return false;
  }
}

// Templates
function testDriveRequestedHtml({ clientName, clientEmail, clientPhone, vehicleBrand, vehicleModel, vehicleYear, scheduledAt, notes }) {
  const fecha = new Date(scheduledAt).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1d2e, #0f1117); padding: 30px; border-bottom: 2px solid #4ae8d0;">
        <h1 style="color: #4ae8d0; margin: 0; font-size: 22px;">🚗 Nueva Solicitud de Test Drive</h1>
        <p style="color: #888; margin: 8px 0 0; font-size: 13px;">Ruedas Concesionaria</p>
      </div>
      <div style="padding: 30px;">
        <div style="background: #1a1d2e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #fff; margin: 0 0 16px; font-size: 18px;">${vehicleBrand} ${vehicleModel} ${vehicleYear}</h2>
          <p style="color: #4ae8d0; font-weight: bold; margin: 0 0 4px; font-size: 13px;">📅 FECHA SOLICITADA</p>
          <p style="color: #fff; margin: 0 0 16px; font-size: 16px; font-weight: bold;">${fecha}</p>
        </div>
        <div style="background: #1a1d2e; border-radius: 8px; padding: 20px;">
          <p style="color: #4ae8d0; font-weight: bold; margin: 0 0 12px; font-size: 13px;">👤 DATOS DEL CLIENTE</p>
          <table style="width: 100%; color: #e0e0e0; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #888;">Nombre:</td><td style="font-weight: bold;">${clientName}</td></tr>
            <tr><td style="padding: 4px 0; color: #888;">Email:</td><td>${clientEmail || '—'}</td></tr>
            <tr><td style="padding: 4px 0; color: #888;">Teléfono:</td><td>${clientPhone || '—'}</td></tr>
            ${notes ? `<tr><td style="padding: 4px 0; color: #888; vertical-align: top;">Notas:</td><td>${notes}</td></tr>` : ''}
          </table>
        </div>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #222; text-align: center; color: #555; font-size: 12px;">
        Ruedas Concesionaria — Sistema de Gestión
      </div>
    </div>
  `;
}

function testDriveConfirmedHtml({ clientName, vehicleBrand, vehicleModel, vehicleYear, scheduledAt, status }) {
  const fecha = new Date(scheduledAt).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const statusInfo = {
    completed: { label: 'Completado', color: '#3de88a', emoji: '✅' },
    cancelled:  { label: 'Cancelado',  color: '#e85040', emoji: '❌' },
    pending:    { label: 'Pendiente',  color: '#e8c840', emoji: '⏳' },
  }[status] || { label: status, color: '#888', emoji: '📋' };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1d2e, #0f1117); padding: 30px; border-bottom: 2px solid ${statusInfo.color};">
        <h1 style="color: ${statusInfo.color}; margin: 0; font-size: 22px;">${statusInfo.emoji} Test Drive ${statusInfo.label}</h1>
        <p style="color: #888; margin: 8px 0 0; font-size: 13px;">Ruedas Concesionaria</p>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px;">Hola <strong>${clientName}</strong>,</p>
        <p style="color: #ccc;">Tu test drive del <strong>${vehicleBrand} ${vehicleModel} ${vehicleYear}</strong> (${fecha}) ha sido marcado como <strong style="color: ${statusInfo.color};">${statusInfo.label}</strong>.</p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">Si tenés alguna consulta, no dudes en contactarnos.</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #222; text-align: center; color: #555; font-size: 12px;">
        Ruedas Concesionaria — Sistema de Gestión
      </div>
    </div>
  `;
}

function passwordResetHtml({ name, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1d2e, #0f1117); padding: 30px; border-bottom: 2px solid #a87ff5;">
        <h1 style="color: #a87ff5; margin: 0; font-size: 22px;">🔑 Recuperar Contraseña</h1>
        <p style="color: #888; margin: 8px 0 0; font-size: 13px;">Ruedas Concesionaria</p>
      </div>
      <div style="padding: 30px;">
        <p>Hola <strong>${name}</strong>,</p>
        <p style="color: #ccc;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #a87ff5; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignorá este email.</p>
      </div>
    </div>
  `;
}

module.exports = { sendMail, testDriveRequestedHtml, testDriveConfirmedHtml, passwordResetHtml };
