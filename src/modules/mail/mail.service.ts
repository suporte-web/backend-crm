import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type SendPasswordResetEmailParams = {
  to: string;
  name: string;
  resetLink: string;
};

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendPasswordResetEmail({
    to,
    name,
    resetLink,
  }: SendPasswordResetEmailParams) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Redefinição de senha - Pizzattolog CRM',
        html: `
          <div style="font-family: Arial, sans-serif; background: #f6f0ea; padding: 32px;">
            <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #eeeeee;">
              <h2 style="margin: 0 0 16px; color: #343434;">
                Redefinição de senha
              </h2>

              <p style="color: #343434; font-size: 15px; line-height: 1.6;">
                Olá, ${name}.
              </p>

              <p style="color: #343434; font-size: 15px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir sua senha no Pizzattolog CRM.
              </p>

              <p style="color: #343434; font-size: 15px; line-height: 1.6;">
                Clique no botão abaixo para criar uma nova senha:
              </p>

              <p style="margin: 28px 0;">
                <a href="${resetLink}" style="background: #ec3139; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 12px; font-weight: bold; display: inline-block;">
                  Redefinir senha
                </a>
              </p>

              <p style="color: #666666; font-size: 13px; line-height: 1.6;">
                Este link é válido por 30 minutos. Se você não solicitou essa alteração, ignore este e-mail.
              </p>

              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-top: 24px;">
                Caso o botão não funcione, copie e cole este link no navegador:<br />
                <span style="word-break: break-all;">${resetLink}</span>
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      const mailError = error as {
        code?: string;
        responseCode?: number;
        command?: string;
        message?: string;
      };

      console.error('[MAIL ERROR]', {
        message: mailError.message,
        code: mailError.code,
        responseCode: mailError.responseCode,
        command: mailError.command,
      });

      throw new InternalServerErrorException(
        'Não foi possível enviar o e-mail de recuperação.',
      );
    }
  }
}
