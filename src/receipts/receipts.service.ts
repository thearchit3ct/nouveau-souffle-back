import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UploadService } from '../upload/upload.service.js';
import PDFDocument from 'pdfkit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const n2words = require('n2words') as (n: number, opts?: { lang: string }) => string;

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
  ) {}

  async generateReceipt(donationId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { user: true, project: true },
    });
    if (!donation) throw new NotFoundException('Don non trouve');

    const fiscalYear = (donation.paidAt ?? donation.createdAt).getFullYear();

    // Generate receipt number: RF-{year}-{00001}
    const count = await this.prisma.donationReceipt.count({
      where: { fiscalYear },
    });
    const receiptNumber = `RF-${fiscalYear}-${String(count + 1).padStart(5, '0')}`;

    // Generate PDF
    const pdfBuffer = await this.createReceiptPdf(donation, receiptNumber, fiscalYear);

    // Upload to MinIO
    const key = `receipts/${fiscalYear}/${receiptNumber}.pdf`;
    await this.upload.uploadBuffer(pdfBuffer, key, 'application/pdf');

    // Create receipt record
    const receipt = await this.prisma.donationReceipt.create({
      data: {
        donationId,
        receiptNumber,
        fiscalYear,
        amount: donation.amount,
        filePath: key,
        status: 'GENERATED',
      },
    });

    // Update donation
    await this.prisma.donation.update({
      where: { id: donationId },
      data: { receiptNumber },
    });

    this.logger.log(`Receipt ${receiptNumber} generated for donation ${donationId}`);

    return receipt;
  }

  async findByDonation(donationId: string) {
    return this.prisma.donationReceipt.findFirst({
      where: { donationId, status: { not: 'CANCELED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private createReceiptPdf(
    donation: any,
    receiptNumber: string,
    fiscalYear: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const amount = Number(donation.amount);
      const metadata = (donation.metadata ?? {}) as Record<string, string>;
      const donorName = donation.user
        ? `${donation.user.firstName} ${donation.user.lastName}`
        : `${metadata.donorFirstName ?? ''} ${metadata.donorLastName ?? ''}`.trim();
      const donorEmail = donation.user?.email ?? metadata.donorEmail ?? '';
      const donorAddress = donation.user?.addressLine1 ?? metadata.donorAddress ?? '';
      const donorPostalCode = donation.user?.postalCode ?? metadata.donorPostalCode ?? '';
      const donorCity = donation.user?.city ?? metadata.donorCity ?? '';
      const paidDate = donation.paidAt
        ? new Date(donation.paidAt).toLocaleDateString('fr-FR')
        : new Date(donation.createdAt).toLocaleDateString('fr-FR');

      let amountInWords = '';
      try {
        amountInWords = n2words(amount, { lang: 'fr' }) + ' euros';
      } catch {
        amountInWords = `${amount} euros`;
      }

      // Header - Association info
      doc.fontSize(16).font('Helvetica-Bold').text('NOUVEAU SOUFFLE EN MISSION', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Association loi 1901', { align: 'center' });
      doc.text('France', { align: 'center' });
      doc.moveDown(2);

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text(
        'RECU FISCAL AU TITRE DES DONS',
        { align: 'center' },
      );
      doc.fontSize(10).font('Helvetica').text(
        'Articles 200 et 238 bis du Code General des Impots',
        { align: 'center' },
      );
      doc.moveDown(2);

      // Receipt info
      doc.fontSize(10).font('Helvetica-Bold').text(`Recu n° : ${receiptNumber}`);
      doc.font('Helvetica').text(`Date : ${paidDate}`);
      doc.text(`Annee fiscale : ${fiscalYear}`);
      doc.moveDown(1.5);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Donor info
      doc.fontSize(11).font('Helvetica-Bold').text('DONATEUR');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nom : ${donorName}`);
      if (donorEmail) doc.text(`Email : ${donorEmail}`);
      if (donorAddress) doc.text(`Adresse : ${donorAddress}`);
      if (donorPostalCode || donorCity) {
        doc.text(`${donorPostalCode} ${donorCity}`.trim());
      }
      doc.moveDown(1.5);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Donation details
      doc.fontSize(11).font('Helvetica-Bold').text('DETAILS DU DON');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Montant : ${amount.toFixed(2)} EUR`);
      doc.text(`Montant en lettres : ${amountInWords}`);
      doc.text(`Nature du don : Numeraire`);
      doc.text(`Mode de paiement : Carte bancaire`);
      doc.text(`Date du versement : ${paidDate}`);
      if (donation.project) {
        doc.text(`Projet soutenu : ${donation.project.name}`);
      }
      doc.moveDown(1.5);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Legal attestation
      doc.fontSize(11).font('Helvetica-Bold').text('ATTESTATION');
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      doc.text(
        'L\'association Nouveau Souffle en Mission certifie que le don mentionne ci-dessus ' +
        'a ete effectue a titre gratuit, sans aucune contrepartie directe ou indirecte ' +
        'au profit du donateur.',
        { align: 'justify' },
      );
      doc.moveDown(0.5);
      doc.text(
        'L\'association est reconnue d\'interet general au sens des articles 200 et 238 bis ' +
        'du Code General des Impots.',
        { align: 'justify' },
      );
      doc.moveDown(1);

      // Tax reduction info
      doc.fontSize(10).font('Helvetica-Bold').text('REDUCTION D\'IMPOT');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      doc.text(
        `Ce don ouvre droit a une reduction d'impot sur le revenu egale a 66% du montant ` +
        `verse, dans la limite de 20% du revenu imposable, soit ${(amount * 0.66).toFixed(2)} EUR.`,
        { align: 'justify' },
      );
      doc.moveDown(2);

      // Signature area
      doc.fontSize(10).font('Helvetica').text(
        `Fait a Paris, le ${new Date().toLocaleDateString('fr-FR')}`,
        { align: 'right' },
      );
      doc.moveDown(0.5);
      doc.text('Le President de l\'association', { align: 'right' });

      doc.end();
    });
  }
}
