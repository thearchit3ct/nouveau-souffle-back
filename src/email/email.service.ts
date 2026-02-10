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

  // ---------------------------------------------------------------------------
  // Core transport
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Shared HTML layout wrapper
  // ---------------------------------------------------------------------------

  private buildEmailHtml(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <!-- Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#059669;padding:24px 32px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
                Nouveau Souffle en Mission
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 8px 8px;">
              <h2 style="color:#059669;margin:0 0 16px 0;font-size:18px;">${title}</h2>
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;">
              <p style="color:#6b7280;font-size:12px;margin:0;text-align:center;">
                Nouveau Souffle en Mission &mdash; Association loi 1901<br />
                Vous recevez cet email car vous etes inscrit sur notre plateforme.<br />
                <a href="#" style="color:#6b7280;">Se desinscrire</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // Frequency label helper
  // ---------------------------------------------------------------------------

  private frequencyLabel(frequency: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'mensuel',
      QUARTERLY: 'trimestriel',
      YEARLY: 'annuel',
    };
    return map[frequency] ?? frequency;
  }

  // ---------------------------------------------------------------------------
  // Existing templates (migrated to use buildEmailHtml)
  // ---------------------------------------------------------------------------

  async sendDonationConfirmation(
    to: string,
    donorName: string,
    amount: number,
    receiptNumber?: string,
  ) {
    const receiptLine = receiptNumber
      ? `<p>Votre recu fiscal <strong>${receiptNumber}</strong> est disponible dans votre espace donateur.</p>`
      : '';

    const body = `
      <p>Bonjour ${donorName},</p>
      <p>Nous avons bien recu votre don de <strong>${amount.toFixed(2)} &euro;</strong>.</p>
      <p>Votre generosite nous permet de poursuivre notre mission. Ce don vous ouvre droit a une
      reduction d'impot de <strong>${(amount * 0.66).toFixed(2)} &euro;</strong> (66% du montant).</p>
      ${receiptLine}
      <p>Toute l'equipe de Nouveau Souffle en Mission vous remercie chaleureusement.</p>
    `;

    const html = this.buildEmailHtml('Merci pour votre don !', body);
    await this.sendTransactional(to, `Confirmation de votre don de ${amount.toFixed(2)} EUR`, html);
  }

  async sendContactNotification(
    adminEmail: string,
    senderName: string,
    senderEmail: string,
    subject: string,
    message: string,
  ) {
    const body = `
      <p><strong>De :</strong> ${senderName} (${senderEmail})</p>
      <p><strong>Sujet :</strong> ${subject}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
      <div style="background:#f9fafb;padding:16px;border-radius:8px;">
        ${message.replace(/\n/g, '<br />')}
      </div>
    `;

    const html = this.buildEmailHtml('Nouveau message - Formulaire de contact', body);
    await this.sendTransactional(adminEmail, `[Contact] ${subject}`, html);
  }

  async sendContactAutoReply(to: string, senderName: string) {
    const body = `
      <p>Bonjour ${senderName},</p>
      <p>Nous avons bien recu votre message et nous vous repondrons dans les meilleurs delais.</p>
      <p>Cordialement,<br />L'equipe Nouveau Souffle en Mission</p>
      <p style="color:#6b7280;font-size:12px;">
        Ceci est un message automatique. Merci de ne pas y repondre directement.
      </p>
    `;

    const html = this.buildEmailHtml('Merci pour votre message', body);
    await this.sendTransactional(to, 'Nous avons recu votre message', html);
  }

  // ---------------------------------------------------------------------------
  // B) Subscriptions / Recurrences (4)
  // ---------------------------------------------------------------------------

  async sendSubscriptionCreated(
    to: string,
    name: string,
    amount: number,
    frequency: string,
  ) {
    const label = this.frequencyLabel(frequency);
    const body = `
      <p>Bonjour ${name},</p>
      <p>Votre don recurrent de <strong>${amount.toFixed(2)} &euro;</strong> (${label}) a ete cree avec succes.</p>
      <p>Vous serez preleve automatiquement selon la frequence choisie. Vous pouvez gerer votre don recurrent depuis votre espace donateur.</p>
      <p>Merci pour votre soutien continu !</p>
    `;

    const html = this.buildEmailHtml('Votre don recurrent a ete cree', body);
    await this.sendTransactional(to, 'Votre don recurrent a ete cree', html);
  }

  async sendSubscriptionPaymentReceived(
    to: string,
    name: string,
    amount: number,
    receiptNumber?: string,
  ) {
    const receiptLine = receiptNumber
      ? `<p>Votre recu fiscal <strong>${receiptNumber}</strong> est disponible dans votre espace donateur.</p>`
      : '';

    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous avons bien recu votre paiement recurrent de <strong>${amount.toFixed(2)} &euro;</strong>.</p>
      ${receiptLine}
      <p>Merci pour votre generosite !</p>
    `;

    const html = this.buildEmailHtml('Paiement recurrent recu', body);
    await this.sendTransactional(to, 'Paiement recurrent recu', html);
  }

  async sendSubscriptionPaymentFailed(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous n'avons malheureusement pas pu prelever votre don recurrent.</p>
      <p>Cela peut etre du a une carte expiree ou a des fonds insuffisants.
      Nous vous invitons a mettre a jour votre moyen de paiement dans votre espace donateur.</p>
      <p>Si le probleme persiste, n'hesitez pas a nous contacter.</p>
    `;

    const html = this.buildEmailHtml('Echec de paiement recurrent', body);
    await this.sendTransactional(to, 'Echec de paiement recurrent', html);
  }

  async sendSubscriptionCanceled(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Votre don recurrent a bien ete annule. Vous ne serez plus preleve automatiquement.</p>
      <p>Si vous souhaitez reprendre votre soutien, vous pouvez creer un nouveau don recurrent a tout moment depuis votre espace donateur.</p>
      <p>Merci pour votre generosite passee !</p>
    `;

    const html = this.buildEmailHtml('Don recurrent annule', body);
    await this.sendTransactional(to, 'Don recurrent annule', html);
  }

  // ---------------------------------------------------------------------------
  // C) Volunteers (5)
  // ---------------------------------------------------------------------------

  async sendVolunteerApplicationReceived(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous avons bien recu votre candidature benevole. Merci pour votre interet !</p>
      <p>Notre equipe de coordination va examiner votre profil et vous recontacter dans les meilleurs delais.</p>
      <p>En attendant, n'hesitez pas a consulter nos projets en cours sur la plateforme.</p>
    `;

    const html = this.buildEmailHtml('Candidature benevole recue', body);
    await this.sendTransactional(to, 'Candidature benevole recue', html);
  }

  async sendVolunteerApproved(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Felicitations ! Votre candidature benevole a ete approuvee.</p>
      <p>Vous faites desormais partie de notre equipe de benevoles. Connectez-vous a votre espace pour decouvrir les missions disponibles.</p>
      <p>Bienvenue dans l'equipe !</p>
    `;

    const html = this.buildEmailHtml('Votre candidature est approuvee', body);
    await this.sendTransactional(to, 'Votre candidature benevole est approuvee', html);
  }

  async sendVolunteerRejected(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous vous remercions pour votre candidature benevole et l'interet que vous portez a notre association.</p>
      <p>Apres examen, nous ne sommes malheureusement pas en mesure de retenir votre candidature pour le moment.</p>
      <p>Nous vous encourageons a repostuler ulterieurement ou a nous soutenir autrement (dons, adhesion, participation aux evenements).</p>
    `;

    const html = this.buildEmailHtml('Reponse a votre candidature', body);
    await this.sendTransactional(to, 'Reponse a votre candidature benevole', html);
  }

  async sendVolunteerAssignment(
    to: string,
    name: string,
    missionTitle: string,
    missionDate?: string,
  ) {
    const dateLine = missionDate
      ? `<p><strong>Date :</strong> ${missionDate}</p>`
      : '';

    const body = `
      <p>Bonjour ${name},</p>
      <p>Une nouvelle mission vous a ete affectee :</p>
      <div style="background:#f0fdf4;padding:16px;border-radius:8px;border-left:4px solid #059669;margin:16px 0;">
        <p style="margin:0;"><strong>${missionTitle}</strong></p>
        ${dateLine}
      </div>
      <p>Connectez-vous a votre espace benevole pour consulter les details de cette mission.</p>
    `;

    const html = this.buildEmailHtml('Nouvelle mission affectee', body);
    await this.sendTransactional(to, `Nouvelle mission : ${missionTitle}`, html);
  }

  async sendVolunteerNewApplication(coordinatorEmail: string, volunteerName: string) {
    const body = `
      <p>Bonjour,</p>
      <p>Une nouvelle candidature benevole a ete soumise par <strong>${volunteerName}</strong>.</p>
      <p>Connectez-vous a l'espace administration pour examiner cette candidature et y repondre.</p>
    `;

    const html = this.buildEmailHtml('Nouvelle candidature benevole', body);
    await this.sendTransactional(coordinatorEmail, `Nouvelle candidature benevole : ${volunteerName}`, html);
  }

  // ---------------------------------------------------------------------------
  // D) Memberships (4)
  // ---------------------------------------------------------------------------

  async sendMembershipApproved(
    to: string,
    name: string,
    memberNumber: string,
    typeName: string,
  ) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Votre adhesion a ete validee avec succes !</p>
      <div style="background:#f0fdf4;padding:16px;border-radius:8px;border-left:4px solid #059669;margin:16px 0;">
        <p style="margin:0;"><strong>Type d'adhesion :</strong> ${typeName}</p>
        <p style="margin:8px 0 0 0;"><strong>Numero de membre :</strong> ${memberNumber}</p>
      </div>
      <p>Vous avez desormais acces a tous les avantages reserves aux membres. Connectez-vous a votre espace membre pour en profiter.</p>
      <p>Bienvenue parmi nous !</p>
    `;

    const html = this.buildEmailHtml('Adhesion validee', body);
    await this.sendTransactional(to, 'Votre adhesion a ete validee', html);
  }

  async sendMembershipRejected(to: string, name: string, reason?: string) {
    const reasonLine = reason
      ? `<p><strong>Motif :</strong> ${reason}</p>`
      : '';

    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous avons le regret de vous informer que votre demande d'adhesion n'a pas pu etre validee.</p>
      ${reasonLine}
      <p>Pour plus d'informations, n'hesitez pas a nous contacter.</p>
    `;

    const html = this.buildEmailHtml('Adhesion refusee', body);
    await this.sendTransactional(to, 'Reponse a votre demande d\'adhesion', html);
  }

  async sendMembershipRenewalReminder(to: string, name: string, endDate: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Votre adhesion arrive a echeance le <strong>${endDate}</strong>.</p>
      <p>Pour continuer a beneficier de vos avantages membres, pensez a renouveler votre adhesion depuis votre espace membre.</p>
      <p>Si vous avez des questions, n'hesitez pas a nous contacter.</p>
    `;

    const html = this.buildEmailHtml('Rappel renouvellement adhesion', body);
    await this.sendTransactional(to, 'Votre adhesion expire bientot', html);
  }

  async sendWelcomeMember(to: string, name: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Bienvenue chez Nouveau Souffle en Mission !</p>
      <p>Nous sommes ravis de vous compter parmi nos membres. Voici ce que vous pouvez faire des maintenant :</p>
      <ul>
        <li>Consulter les evenements reserves aux membres</li>
        <li>Participer a nos projets associatifs</li>
        <li>Acceder a votre espace membre personnalise</li>
      </ul>
      <p>N'hesitez pas a explorer la plateforme et a nous contacter si vous avez des questions.</p>
    `;

    const html = this.buildEmailHtml('Bienvenue', body);
    await this.sendTransactional(to, 'Bienvenue chez Nouveau Souffle en Mission !', html);
  }

  // ---------------------------------------------------------------------------
  // E) Events (3)
  // ---------------------------------------------------------------------------

  async sendEventRegistrationConfirmed(
    to: string,
    name: string,
    eventTitle: string,
    eventDate: string,
    eventLocation: string,
  ) {
    const locationLine = eventLocation
      ? `<p style="margin:8px 0 0 0;"><strong>Lieu :</strong> ${eventLocation}</p>`
      : '';

    const body = `
      <p>Bonjour ${name},</p>
      <p>Votre inscription a bien ete confirmee !</p>
      <div style="background:#f0fdf4;padding:16px;border-radius:8px;border-left:4px solid #059669;margin:16px 0;">
        <p style="margin:0;"><strong>${eventTitle}</strong></p>
        <p style="margin:8px 0 0 0;"><strong>Date :</strong> ${eventDate}</p>
        ${locationLine}
      </div>
      <p>Nous avons hate de vous y retrouver !</p>
    `;

    const html = this.buildEmailHtml('Inscription confirmee', body);
    await this.sendTransactional(to, `Inscription confirmee : ${eventTitle}`, html);
  }

  async sendEventReminder(
    to: string,
    name: string,
    eventTitle: string,
    eventDate: string,
  ) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous vous rappelons que l'evenement suivant a lieu demain :</p>
      <div style="background:#fffbeb;padding:16px;border-radius:8px;border-left:4px solid #d97706;margin:16px 0;">
        <p style="margin:0;"><strong>${eventTitle}</strong></p>
        <p style="margin:8px 0 0 0;"><strong>Date :</strong> ${eventDate}</p>
      </div>
      <p>Nous avons hate de vous y retrouver !</p>
    `;

    const html = this.buildEmailHtml('Rappel evenement demain', body);
    await this.sendTransactional(to, `Rappel : ${eventTitle} a lieu demain`, html);
  }

  async sendEventCanceled(to: string, name: string, eventTitle: string) {
    const body = `
      <p>Bonjour ${name},</p>
      <p>Nous sommes au regret de vous informer que l'evenement suivant a ete annule :</p>
      <div style="background:#fef2f2;padding:16px;border-radius:8px;border-left:4px solid #dc2626;margin:16px 0;">
        <p style="margin:0;"><strong>${eventTitle}</strong></p>
      </div>
      <p>Nous nous excusons pour la gene occasionnee. Si vous aviez effectue un paiement, celui-ci sera rembourse automatiquement.</p>
      <p>N'hesitez pas a consulter nos autres evenements sur la plateforme.</p>
    `;

    const html = this.buildEmailHtml('Evenement annule', body);
    await this.sendTransactional(to, `Evenement annule : ${eventTitle}`, html);
  }
}
