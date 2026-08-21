import nodemailer from 'nodemailer';

/**
 * Servicio de envío de correos electrónicos transaccionales para YogurArte
 */
export async function sendPasswordResetEmail(toEmail: string, userName: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS || '';
  const cleanPass = rawPass.trim().replace(/\s+/g, ''); // Elimina espacios si se copió con formato 'xxxx xxxx xxxx xxxx'
  const from = process.env.SMTP_FROM || `"YogurArte" <${user || 'seguridad@yogurarte.com'}>`;

  if (!user || !cleanPass) {
    console.warn(`⚠️ [EMAIL] SMTP_USER o SMTP_PASS no configurados en .env. Código para ${userName} (${toEmail}): [${code}]`);
    return false;
  }

  try {
    const isGmail = host === 'smtp.gmail.com' || (user && user.includes('@gmail.com'));

    const transporter = isGmail
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user,
            pass: cleanPass,
          },
        })
      : nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass: cleanPass,
          },
        });

    const mailOptions = {
      from,
      to: toEmail,
      subject: '🥛 YogurArte - Código de Seguridad para Restablecer Contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6D28D9; margin: 0; font-size: 24px;">YogurArte</h2>
            <p style="color: #64748B; margin: 4px 0 0 0; font-size: 14px;">Seguridad y Control de Accesos</p>
          </div>
          
          <div style="background-color: #F8FAFC; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; color: #1E293B; font-size: 15px;">
              Hola <strong>${userName}</strong>,
            </p>
            <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.5;">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de <strong>Socio Administrador</strong> en el sistema YogurArte.
            </p>
            
            <div style="text-align: center; background-color: #EDE9FE; border: 2px dashed #8B5CF6; border-radius: 8px; padding: 14px; margin: 16px 0;">
              <span style="display: block; font-size: 12px; color: #6D28D9; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Tu Código de Verificación</span>
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #5B21B6; font-family: monospace;">${code}</span>
            </div>
            
            <p style="margin: 12px 0 0 0; color: #64748B; font-size: 13px;">
              ⏱️ Este código es de un solo uso y vencerá en <strong>15 minutos</strong>.
            </p>
          </div>
          
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.4; margin: 0; text-align: center;">
            Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu cuenta sigue protegida.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Correo enviado exitosamente a ${toEmail} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ [EMAIL] Error al enviar correo de recuperación:', error);
    return false;
  }
}
