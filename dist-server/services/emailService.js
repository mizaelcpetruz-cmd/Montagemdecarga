import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';
class EmailService {
    transporter = null;
    constructor() {
        this.initTransporter();
    }
    initTransporter() {
        if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
            try {
                const isSecure = ENV.SMTP_SECURE || ENV.SMTP_PORT === 465;
                this.transporter = nodemailer.createTransport({
                    host: ENV.SMTP_HOST,
                    port: ENV.SMTP_PORT,
                    secure: isSecure, // true para porta 465, false para 587
                    auth: {
                        user: ENV.SMTP_USER,
                        pass: ENV.SMTP_PASS,
                    },
                    tls: {
                        rejectUnauthorized: false, // Compatibilidade com certificados internos corporativos
                    },
                });
                console.log(`📧 Serviço de E-mail SMTP inicializado para: ${ENV.SMTP_HOST}:${ENV.SMTP_PORT}`);
            }
            catch (err) {
                console.warn('⚠️ Falha ao configurar transportador SMTP:', err.message);
                this.transporter = null;
            }
        }
        else {
            this.transporter = null;
        }
    }
    /**
     * Envia e-mail formatado de recuperação de senha
     */
    async sendPasswordResetEmail(toEmail, userName, resetCode) {
        // Se o SMTP não estiver configurado no .env, opera em modo simulado
        if (!this.transporter || !ENV.SMTP_HOST) {
            console.log(`[SIMULAÇÃO SMTP] Código de recuperação para ${toEmail}: ${resetCode}`);
            return {
                sent: false,
                simulated: true,
                message: `Código gerado: ${resetCode} (Configure SMTP_HOST no .env para disparo real).`,
            };
        }
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e9ecef; }
          .header { background: linear-gradient(135deg, #7b1fa2, #c2185b); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 32px 24px; color: #334155; }
          .greeting { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .code-box { background: #fdf4ff; border: 2px dashed #d946ef; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .code-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #a21caf; letter-spacing: 1px; margin-bottom: 6px; }
          .code-val { font-size: 32px; font-weight: 800; color: #7b1fa2; letter-spacing: 6px; font-family: monospace; }
          .warning { font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #7b1fa2; line-height: 1.5; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Petruz Cargas</h1>
            <p>Portal de Expedição e Montagem de Carga</p>
          </div>
          <div class="content">
            <div class="greeting">Olá, ${userName}!</div>
            <div class="text">
              Recebemos uma solicitação de redefinição de senha para o seu usuário no sistema <strong>Petruz Cargas</strong>.
              Utilize o código de verificação abaixo para concluir o procedimento:
            </div>
            
            <div class="code-box">
              <div class="code-label">Código de Verificação</div>
              <div class="code-val">${resetCode}</div>
            </div>

            <div class="warning">
              ⏱️ <strong>Atenção:</strong> Este código é válido por <strong>15 minutos</strong>. Se você não solicitou a redefinição de senha, nenhuma ação é necessária e sua senha atual permanece segura.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Petruz Fruity • Todos os direitos reservados.<br>
            Este é um e-mail automático gerado pelo sistema de segurança.
          </div>
        </div>
      </body>
      </html>
    `;
        try {
            await this.transporter.sendMail({
                from: ENV.SMTP_FROM,
                to: toEmail,
                subject: `🔐 Código de Recuperação de Senha: ${resetCode} - Petruz Cargas`,
                text: `Olá ${userName},\n\nSeu código de recuperação de senha no Petruz Cargas é: ${resetCode}\n\nEste código é válido por 15 minutos.`,
                html: htmlContent,
            });
            console.log(`✅ E-mail de recuperação enviado com sucesso para ${toEmail}`);
            return {
                sent: true,
                simulated: false,
                message: `Instruções e código de recuperação enviados para ${toEmail}.`,
            };
        }
        catch (err) {
            console.error(`❌ Erro ao enviar e-mail SMTP para ${toEmail}:`, err.message);
            return {
                sent: false,
                simulated: true,
                message: `Não foi possível conectar ao servidor SMTP (${err.message}). Código simulado: ${resetCode}`,
            };
        }
    }
}
export const emailService = new EmailService();
