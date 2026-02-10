import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly listmonkUrl: string;
  private readonly authHeader: string;

  constructor(private readonly config: ConfigService) {
    this.listmonkUrl = this.config.get<string>('LISTMONK_URL', 'http://ns-listmonk:9000');
    const username = this.config.get<string>('LISTMONK_USERNAME', 'admin');
    const password = this.config.get<string>('LISTMONK_PASSWORD', '');
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  async sendTransactional(to: string, subject: string, htmlBody: string) {
    try {
      const response = await fetch(`${this.listmonkUrl}/api/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          subscriber_email: to,
          template_id: 0,
          from_email: this.config.get<string>('ADMIN_EMAIL', 'contact@ns.thearchit3ct.xyz'),
          subject,
          content_type: 'html',
          body: htmlBody,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Listmonk transactional email failed: ${response.status} ${text}`);
      } else {
        this.logger.log(`Transactional email sent to ${to}: ${subject}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }

  async sendDonationConfirmation(
    to: string,
    donorName: string,
    amount: number,
    receiptNumber?: string,
  ) {
    const receiptLine = receiptNumber
      ? `<p>Votre recu fiscal <strong>${receiptNumber}</strong> est disponible dans votre espace donateur.</p>`
      : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Merci pour votre don !</h2>
        <p>Bonjour ${donorName},</p>
        <p>Nous avons bien recu votre don de <strong>${amount.toFixed(2)} &euro;</strong>.</p>
        <p>Votre generosite nous permet de poursuivre notre mission. Ce don vous ouvre droit a une
        reduction d'impot de <strong>${(amount * 0.66).toFixed(2)} &euro;</strong> (66% du montant).</p>
        ${receiptLine}
        <p>Toute l'equipe de Nouveau Souffle en Mission vous remercie chaleureusement.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Nouveau Souffle en Mission - Association loi 1901
        </p>
      </div>
    `;

    await this.sendTransactional(to, `Confirmation de votre don de ${amount.toFixed(2)} EUR`, html);
  }

  async sendContactNotification(
    adminEmail: string,
    senderName: string,
    senderEmail: string,
    subject: string,
    message: string,
  ) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Nouveau message - Formulaire de contact</h2>
        <p><strong>De :</strong> ${senderName} (${senderEmail})</p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
          ${message.replace(/\n/g, '<br />')}
        </div>
      </div>
    `;

    await this.sendTransactional(adminEmail, `[Contact] ${subject}`, html);
  }

  async sendContactAutoReply(to: string, senderName: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Merci pour votre message</h2>
        <p>Bonjour ${senderName},</p>
        <p>Nous avons bien recu votre message et nous vous repondrons dans les meilleurs delais.</p>
        <p>Cordialement,<br />L'equipe Nouveau Souffle en Mission</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Ceci est un message automatique. Merci de ne pas y repondre directement.
        </p>
      </div>
    `;

    await this.sendTransactional(to, 'Nous avons recu votre message', html);
  }
}
