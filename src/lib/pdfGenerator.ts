import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, Color, PDFImage } from 'pdf-lib';
import { ServiceRequest } from './types';

export interface PdfOptions {
  blankTemplate?: boolean;
}

// Colors matching official association letterhead
const darkGreen = rgb(0.0, 0.45, 0.2); // Forest green for headers & rules
const midGreen = rgb(0.12, 0.55, 0.25);
const oliveGreen = rgb(0.25, 0.42, 0.15); // Olive tone for footer text
const lightGreenBg = rgb(0.95, 0.98, 0.96); // Soft emerald tint
const borderGreen = rgb(0.75, 0.88, 0.8);
const textDark = rgb(0.08, 0.12, 0.15);
const textMuted = rgb(0.35, 0.4, 0.45);

/**
 * Loads and embeds the authentic AEOWA PNG logo
 */
async function loadLogoImage(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public/images/aeowa-logo.png');
    if (fs.existsSync(logoPath)) {
      const bytes = fs.readFileSync(logoPath);
      return await pdfDoc.embedPng(bytes);
    }
  } catch (e) {
    console.warn('Could not load logo PNG', e);
  }
  return null;
}

/**
 * Draws the official AEOWA header with the embedded logo, title, and registration number
 */
function drawOfficialLetterhead(
  page: PDFPage,
  width: number,
  height: number,
  fontBold: PDFFont,
  logoImage: PDFImage | null
) {
  // Logo dimensions: aspect ratio ~1.846 (168x91)
  const logoW = 56;
  const logoH = 30.33;
  const logoX = (width - logoW) / 2;
  const logoY = height - 42;

  if (logoImage) {
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } else {
    // Fallback vector icon
    page.drawCircle({
      x: width / 2,
      y: height - 26,
      size: 10,
      color: darkGreen,
    });
  }

  // Association Name (Large, Bold, Centered)
  const line1 = 'ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE';
  const line2 = 'ASSOCIATION';
  const w1 = fontBold.widthOfTextAtSize(line1, 13);
  page.drawText(line1, {
    x: (width - w1) / 2,
    y: height - 57,
    size: 13,
    font: fontBold,
    color: darkGreen,
  });
  const w2 = fontBold.widthOfTextAtSize(line2, 13);
  page.drawText(line2, {
    x: (width - w2) / 2,
    y: height - 71,
    size: 13,
    font: fontBold,
    color: darkGreen,
  });

  // Registration Number (Official Registration: DRB3/SOR/364/2022-2023)
  const regText = 'Registration No: DRB3/SOR/364/2022-2023';
  const wReg = fontBold.widthOfTextAtSize(regText, 9.5);
  page.drawText(regText, {
    x: (width - wReg) / 2,
    y: height - 85,
    size: 9.5,
    font: fontBold,
    color: darkGreen,
  });

  // Horizontal Green Divider Line
  page.drawLine({
    start: { x: 36, y: height - 93 },
    end: { x: width - 36, y: height - 93 },
    thickness: 1.5,
    color: darkGreen,
  });
}

/**
 * Draws the official Registered Address and contact info in the page footer
 */
function drawOfficialFooter(
  page: PDFPage,
  width: number,
  fontRegular: PDFFont,
  pageNum?: number,
  totalPages?: number
) {
  // Divider line
  page.drawLine({
    start: { x: 36, y: 50 },
    end: { x: width - 36, y: 50 },
    thickness: 1.0,
    color: darkGreen,
  });

  const addr1 =
    'Registered Address: - Near Main Entrance Gate Sy No 115 & 116, Anugraha Evergreen Layout';
  const addr2 = 'Bukkasagara, Bannerghatta, Bangalore - 560083';
  const addr3 = 'Mobile: +91-90369 31976; Email Id: anugraha.evergreen.assn@gmail.com';

  const w1 = fontRegular.widthOfTextAtSize(addr1, 7.8);
  page.drawText(addr1, {
    x: (width - w1) / 2,
    y: 38,
    size: 7.8,
    font: fontRegular,
    color: oliveGreen,
  });

  const w2 = fontRegular.widthOfTextAtSize(addr2, 7.8);
  page.drawText(addr2, {
    x: (width - w2) / 2,
    y: 27,
    size: 7.8,
    font: fontRegular,
    color: oliveGreen,
  });

  const w3 = fontRegular.widthOfTextAtSize(addr3, 7.8);
  page.drawText(addr3, {
    x: (width - w3) / 2,
    y: 16,
    size: 7.8,
    font: fontRegular,
    color: oliveGreen,
  });

  if (pageNum && totalPages) {
    const pageStr = `Page ${pageNum} of ${totalPages}`;
    page.drawText(pageStr, {
      x: width - 75,
      y: 16,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });
  }
}

/**
 * Helper to wrap and draw multi-line paragraphs cleanly
 */
function drawParagraph(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    fontSize: number;
    font: PDFFont;
    color: Color;
  }
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = options.y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = options.font.widthOfTextAtSize(testLine, options.fontSize);
    if (testWidth > options.maxWidth && line) {
      page.drawText(line, {
        x: options.x,
        y: currentY,
        size: options.fontSize,
        font: options.font,
        color: options.color,
      });
      line = word;
      currentY -= options.lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, {
      x: options.x,
      y: currentY,
      size: options.fontSize,
      font: options.font,
      color: options.color,
    });
    currentY -= options.lineHeight;
  }

  return currentY;
}

/**
 * Helper to draw numbered list items with professional hanging indentation
 */
function drawNumberedItem(
  page: PDFPage,
  numberText: string,
  bodyText: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    fontSize: number;
    fontRegular: PDFFont;
    fontBold: PDFFont;
    color: Color;
    numberWidth?: number;
  }
): number {
  const numW = options.numberWidth || 18;

  page.drawText(numberText, {
    x: options.x,
    y: options.y,
    size: options.fontSize,
    font: options.fontBold,
    color: options.color,
  });

  const words = bodyText.split(/\s+/);
  let line = '';
  let currentY = options.y;
  const bodyX = options.x + numW;
  const bodyMaxWidth = options.maxWidth - numW;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = options.fontRegular.widthOfTextAtSize(testLine, options.fontSize);
    if (testWidth > bodyMaxWidth && line) {
      page.drawText(line, {
        x: bodyX,
        y: currentY,
        size: options.fontSize,
        font: options.fontRegular,
        color: options.color,
      });
      line = word;
      currentY -= options.lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, {
      x: bodyX,
      y: currentY,
      size: options.fontSize,
      font: options.fontRegular,
      color: options.color,
    });
    currentY -= options.lineHeight;
  }

  return currentY;
}

/**
 * Generates the Official AEOWA Construction NOC (2 Pages)
 * Exactly mirrors the scanned association format with accurate latest rules and balanced spacing.
 */
export async function generateConstructionNocPdfBytes(
  req: ServiceRequest,
  options?: PdfOptions
): Promise<Uint8Array> {
  const chk = req.preConstructionChecklist;
  const isComplete =
    chk?.docsVerified &&
    chk?.membershipFeeCleared &&
    chk?.maintenanceDuesCleared &&
    chk?.securityDepositPaid &&
    chk?.depositTransactionId &&
    chk?.labourerToiletInstalled &&
    chk?.bescomWaterArrangementVerified &&
    chk?.labourersRegistered;

  if (!options?.blankTemplate && !isComplete && req.status !== 'approved' && req.status !== 'completed') {
    throw new Error(
      'Cannot generate Construction NOC PDF: The Admin Pre-Construction Checklist is incomplete. All 7 compliance items must be verified.'
    );
  }

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const logoImage = await loadLogoImage(pdfDoc);

  // ==========================================
  // PAGE 1: Header, Recitals, and Points 1 to 10
  // ==========================================
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page1.getSize();

  drawOfficialLetterhead(page1, width, height, fontBold, logoImage);
  drawOfficialFooter(page1, width, fontRegular, 1, 2);

  // Document Title (Centered, Bold, Underlined)
  const titleText = 'NO OBJECTION CERTIFICATE';
  const titleW = fontBold.widthOfTextAtSize(titleText, 12);
  const titleX = (width - titleW) / 2;
  const titleY = height - 112;
  page1.drawText(titleText, {
    x: titleX,
    y: titleY,
    size: 12,
    font: fontBold,
    color: textDark,
  });
  page1.drawLine({
    start: { x: titleX, y: titleY - 2.5 },
    end: { x: titleX + titleW, y: titleY - 2.5 },
    thickness: 1.2,
    color: textDark,
  });

  // Paragraph 1: Purpose
  let curY = titleY - 20;
  curY = drawParagraph(
    page1,
    'This NOC is issued by the Managing Committee of "ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE ASSOCIATION" to an Owner towards construction of a Residential House within a "Plot" falling within "ANUGRAHA EVERGREEN LAYOUT".',
    {
      x: 38,
      y: curY,
      maxWidth: width - 76,
      lineHeight: 12.5,
      fontSize: 8.5,
      font: fontRegular,
      color: textDark,
    }
  );

  curY -= 6;

  // Paragraph 2: Recipient Details (Pre-filled vs Blank Post-Printing Mode)
  if (options?.blankTemplate) {
    curY = drawParagraph(
      page1,
      'Basis the request received, we, the Managing Committee of "ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE ASSOCIATION" are pleased to issue a NOC to Mr. / Ms. ____________________________________________________',
      {
        x: 38,
        y: curY,
        maxWidth: width - 76,
        lineHeight: 12.5,
        fontSize: 8.5,
        font: fontRegular,
        color: textDark,
      }
    );
    curY = drawParagraph(
      page1,
      'Of Plot No. [ ________________________ ] in "ANUGRAHA EVERGREEN LAYOUT" to construct his/her House within his/her Plot.',
      {
        x: 38,
        y: curY,
        maxWidth: width - 76,
        lineHeight: 12.5,
        fontSize: 8.5,
        font: fontRegular,
        color: textDark,
      }
    );
  } else {
    const ownerName = req.ownerContactName || req.ownerName || 'Valued Owner';
    const plotNo = req.plotNumber;

    curY = drawParagraph(
      page1,
      `Basis the request received, we, the Managing Committee of "ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE ASSOCIATION" are pleased to issue a NOC to Mr. / Ms. ${ownerName.toUpperCase()}`,
      {
        x: 38,
        y: curY,
        maxWidth: width - 76,
        lineHeight: 12.5,
        fontSize: 8.5,
        font: fontRegular,
        color: textDark,
      }
    );
    curY = drawParagraph(
      page1,
      `Of Plot No. [ ${plotNo} ] in "ANUGRAHA EVERGREEN LAYOUT" to construct his/her House within his/her Plot. (Ref ID: ${req.id} | Deposit UTR: ${chk?.depositTransactionId || 'VERIFIED'})`,
      {
        x: 38,
        y: curY,
        maxWidth: width - 76,
        lineHeight: 12.5,
        fontSize: 8.5,
        font: fontRegular,
        color: textDark,
      }
    );
  }

  curY -= 7;

  // Paragraph 3: Terms Preamble
  curY = drawParagraph(
    page1,
    'Below are the Terms & Conditions bound to be accepted and followed by an "Owner" during his House Construction within his "Plot" in Anugraha Evergreen Layout:',
    {
      x: 38,
      y: curY,
      maxWidth: width - 76,
      lineHeight: 12.5,
      fontSize: 8.5,
      font: fontBold,
      color: textDark,
    }
  );

  curY -= 6;

  // Points 1 to 10 on Page 1 - Balanced vertical rhythm
  const page1Points = [
    {
      num: '1)',
      text: 'Any Owner who intends to construct a House in his plot should intimate the Managing Committee of Anugraha Evergreen Layout Owners Welfare Association in writing and obtain an official NOC before starting any construction work.',
    },
    {
      num: '2)',
      text: 'Owner should have taken Lifetime Membership of the Association by paying the one-time fee of Rs 1,000, and should have cleared all pending Maintenance charges, if any, due to the Association. Further, a copy of the latest Property Tax paid receipt and Building Construction Permit along with the approved construction plan obtained from the local Govt Agency / Village / Panchayat / Anekal Planning Authority must be produced.',
    },
    {
      num: '3)',
      text: 'Owner should deposit Rs 20,000 (refundable) as a security deposit with the Association. Any damages to layout common areas, roads, culverts, drains, or streetlights will make this deposit forfeited fully or partially. Association decision will be final in this regard.',
    },
    {
      num: '4)',
      text: 'Owner should obtain prior permission from neighboring plot owners for erecting temporary sheds and storing building materials on their plots till completion of his House. After completion of construction, he invariably has to get those plots thoroughly cleaned to the satisfaction of the owners and Association.',
    },
    {
      num: '5)',
      text: 'The Owner should not dump any construction materials nor park any construction equipment, machineries, vehicles, earthmovers, or generators on the Roads or any Common Areas of Anugraha Evergreen Layout. Cement mixing directly on asphalt roads is strictly banned; mixing trays or heavy-duty tarpaulins must be used at all times.',
    },
    {
      num: '6)',
      text: 'Owner should carry out construction work (of any kind) strictly only during daytime from 8:00 AM to 6:00 PM (Monday through Saturday) without causing obstruction or nuisance to neighboring plot owners. No heavy machinery or noisy construction is permitted on Sundays or layout-designated public holidays.',
    },
    {
      num: '7)',
      text: 'Owner should never draw Electric power directly from the Common Electric poles, streetlights, or from any neighboring plot. Power must be drawn exclusively through his own Temporary/Permanent Power connection obtained in his own Name from BESCOM specific to his plot.',
    },
    {
      num: '8)',
      text: 'Owner should never draw Water from any Association Common Area Water source / Overhead Water Tanks / Sumps etc., or even from his own plot for construction. Owner should never install an individual private Borewell in his Plot as common layout water supply and STP facilities have been installed.',
    },
    {
      num: '9)',
      text: 'Owner should not dig the Road or cut any Trees (small or big) under any circumstances as part of house construction or for drawing utility lines. Electrical and utility lines should be drawn only from designated underground Electric Junction Boxes / Chambers provided on either side of roads adjacent to plots.',
    },
    {
      num: '10)',
      text: 'Owner should never alter, remove, or damage any Boundary Marking Stones, Survey Pegs, Fences, or Trees of neighboring plots or Common Areas during construction. In case of any compulsion, prior written approval must be obtained from neighboring plot owners and the Managing Committee.',
    },
  ];

  for (const pt of page1Points) {
    curY = drawNumberedItem(page1, pt.num, pt.text, {
      x: 38,
      y: curY,
      maxWidth: width - 76,
      lineHeight: 11.5,
      fontSize: 8.2,
      fontRegular,
      fontBold,
      color: textDark,
      numberWidth: 18,
    });
    curY -= 6.5; // balanced spacing
  }

  // ==========================================
  // PAGE 2: Header, Points 11 to 18, Closing & Signatures/Seal
  // ==========================================
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  drawOfficialLetterhead(page2, width, height, fontBold, logoImage);
  drawOfficialFooter(page2, width, fontRegular, 2, 2);

  let curY2 = height - 110;

  const page2Points = [
    {
      num: '11)',
      text: 'In case of any dispute arising with neighboring plot owners in the name of boundary wall, fencing, or plot measurement, the responsible owner must resolve the same immediately and directly with the complainant. The Association is not liable to settle or interfere in such private boundary disputes.',
    },
    {
      num: '12)',
      text: 'Owner should ensure that the Contractors and Laborers who are in charge of House construction abide by Layout Security Rules and cooperate with Association and Security personnel guidelines while residing or working within the layout premises.',
    },
    {
      num: '13)',
      text: 'In case laborers intend to stay in the plot under construction, Owner/Contractor must produce the ID proofs, names, and contact numbers of those laborers to layout security desk. An on-site temporary functional toilet connected to the UGD chamber or septic tank must be maintained; open defecation or urination is strictly banned and attracts a penalty of Rs. 5,000.',
    },
    {
      num: '14)',
      text: 'In case of any offenses, civil damage, or misbehavior from the Contractor or Laborers, sole responsibility lies with the respective Plot Owner only.',
    },
    {
      num: '15)',
      text: 'No structure of any kind whatsoever, temporary or permanent, shall be erected, fenced, or partitioned upon any Common Areas, roads, or civic amenities of Anugraha Evergreen Layout.',
    },
    {
      num: '16)',
      text: 'A functional Rainwater Harvesting (RWH) setup with a dedicated groundwater recharge pit of prescribed capacity must be installed within the plot in compliance with layout sustainability norms.',
    },
    {
      num: '17)',
      text: 'Upon completion of construction, the Managing Committee will conduct a physical inspection to verify total debris removal, road/drain condition, and RWH installation before processing the Rs 20,000 security deposit refund.',
    },
    {
      num: '18)',
      text: 'Deviation from any of the above terms will be strictly dealt with by the Association. Any deviation will attract a minimum penalty of INR 20,000 (Twenty Thousand Only) or more based on the damage/impact assessed by the Managing Committee of Anugraha Evergreen Layout Owners Welfare Association.',
    },
  ];

  for (const pt of page2Points) {
    curY2 = drawNumberedItem(page2, pt.num, pt.text, {
      x: 38,
      y: curY2,
      maxWidth: width - 76,
      lineHeight: 11.5,
      fontSize: 8.2,
      fontRegular,
      fontBold,
      color: textDark,
      numberWidth: 20,
    });
    curY2 -= 6.5;
  }

  curY2 -= 8;

  // Closing Salutation & Welcome
  curY2 = drawParagraph(
    page2,
    'We, the Managing Committee of Anugraha Evergreen Layout hereby extend you a Warm Welcome to "Anugraha Family" and also wish you a successful completion of your House Construction.',
    {
      x: 38,
      y: curY2,
      maxWidth: width - 76,
      lineHeight: 12.5,
      fontSize: 8.5,
      font: fontBold,
      color: textDark,
    }
  );

  curY2 -= 4;

  curY2 = drawParagraph(
    page2,
    'In case of any Doubts / Clarifications / Support, please feel free to reach out to the Managing Committee members who would be happy to assist you with your queries.',
    {
      x: 38,
      y: curY2,
      maxWidth: width - 76,
      lineHeight: 12,
      fontSize: 8.5,
      font: fontRegular,
      color: textDark,
    }
  );

  curY2 -= 10;

  page2.drawText('Warm Regards,', {
    x: 38,
    y: curY2,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  curY2 -= 13;

  page2.drawText('MANAGING COMMITTEE, "ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE ASSOCIATION"', {
    x: 38,
    y: curY2,
    size: 9,
    font: fontBold,
    color: darkGreen,
  });

  // ==========================================
  // SIGNATURE & SEAL BOX (POST-PRINTING SPACE)
  // ==========================================
  curY2 -= 22;

  // Signatory banner
  const sigBoxX = width - 260;
  page2.drawText('For Anugraha Evergreen Layout Owners Welfare Association', {
    x: sigBoxX,
    y: curY2,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  // Open vertical space for physical seal stamping and wet-ink signatures post-printing
  curY2 -= 58;

  // Signature line
  page2.drawLine({
    start: { x: sigBoxX, y: curY2 + 12 },
    end: { x: width - 38, y: curY2 + 12 },
    thickness: 0.8,
    color: rgb(0.7, 0.75, 0.8),
  });

  page2.drawText('President   /   Treasurer   /   Secretary', {
    x: sigBoxX + 15,
    y: curY2,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  curY2 -= 14;
  page2.drawText('Date: ________________________', {
    x: sigBoxX + 15,
    y: curY2,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  return await pdfDoc.save();
}

/**
 * Generates the Official Deposit Refund & Site Clearance Settlement Voucher PDF
 * Redesigned with accounting ledger tables, full Managing Committee inspection sign-off, and clean proportions.
 */
export async function generateRefundSettlementPdfBytes(
  req: ServiceRequest,
  options?: PdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const logoImage = await loadLogoImage(pdfDoc);

  drawOfficialLetterhead(page, width, height, fontBold, logoImage);
  drawOfficialFooter(page, width, fontRegular, 1, 1);

  const ref = req.postConstructionRefund;
  const chk = req.preConstructionChecklist;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Voucher Title Box
  const titleBoxY = height - 128;
  page.drawRectangle({
    x: 36,
    y: titleBoxY,
    width: width - 72,
    height: 28,
    color: lightGreenBg,
    borderColor: borderGreen,
    borderWidth: 1,
  });

  const titleText = 'DEPOSIT REFUND & SITE CLEARANCE SETTLEMENT VOUCHER';
  const titleW = fontBold.widthOfTextAtSize(titleText, 11);
  page.drawText(titleText, {
    x: (width - titleW) / 2,
    y: titleBoxY + 8,
    size: 11,
    font: fontBold,
    color: darkGreen,
  });

  // Meta row
  let curY = titleBoxY - 18;
  page.drawText(`Voucher Ref: AEOWA/SETTLE/2026/${req.plotNumber}`, {
    x: 38,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });
  page.drawText(`Date of Issue: ${issueDate}`, {
    x: width - 150,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  curY -= 18;

  // SECTION 1: APPLICANT & PLOT PARTICULARS (Card Box)
  const box1Height = 52;
  page.drawRectangle({
    x: 36,
    y: curY - box1Height,
    width: width - 72,
    height: box1Height,
    borderColor: rgb(0.85, 0.9, 0.85),
    borderWidth: 1,
    color: rgb(0.99, 1.0, 0.99),
  });

  page.drawText('1. APPLICANT & PLOT PARTICULARS', {
    x: 44,
    y: curY - 14,
    size: 8.5,
    font: fontBold,
    color: darkGreen,
  });

  const ownerName = options?.blankTemplate
    ? '________________________________________________'
    : (req.ownerContactName || req.ownerName || '').toUpperCase();
  const plotNo = options?.blankTemplate ? '[  ________________  ]' : req.plotNumber;

  page.drawText(`Plot Number: Plot No. ${plotNo}`, { x: 44, y: curY - 28, size: 8, font: fontRegular, color: textDark });
  page.drawText(`Plot Owner: ${ownerName}`, { x: 260, y: curY - 28, size: 8, font: fontRegular, color: textDark });
  page.drawText(`Security Deposit UTR: ${chk?.depositTransactionId || 'VERIFIED ON RECORD'}`, {
    x: 44,
    y: curY - 42,
    size: 8,
    font: fontRegular,
    color: textDark,
  });
  page.drawText(`Initial Escrow Deposit: INR 20,000.00`, { x: 260, y: curY - 42, size: 8, font: fontRegular, color: textDark });

  curY = curY - box1Height - 16;

  // SECTION 2: MANAGING COMMITTEE PHYSICAL INSPECTION CLEARANCE (Card Box)
  const box2Height = 64;
  page.drawRectangle({
    x: 36,
    y: curY - box2Height,
    width: width - 72,
    height: box2Height,
    borderColor: rgb(0.85, 0.9, 0.85),
    borderWidth: 1,
    color: rgb(0.99, 1.0, 0.99),
  });

  page.drawText('2. MANAGING COMMITTEE SITE INSPECTION VERIFICATION', {
    x: 44,
    y: curY - 14,
    size: 8.5,
    font: fontBold,
    color: darkGreen,
  });

  page.drawText(
    `[x] Total Debris Removal: Verified & Cleared (${ref?.debrisRemoved ? 'PASSED — Surroundings clean & graded' : 'PENDING'})`,
    { x: 44, y: curY - 28, size: 8, font: fontRegular, color: textDark }
  );
  page.drawText(
    `[x] Layout Common Infrastructure: ${ref?.roadsDrainsCommonAreasUndamaged ? 'PASSED — Roads, storm drains & streetlights intact' : 'DAMAGES RECORDED'}`,
    { x: 44, y: curY - 41, size: 8, font: fontRegular, color: textDark }
  );
  page.drawText(
    `[x] Rainwater Harvesting (RWH): ${ref?.rainwaterHarvestingVerified ? 'PASSED — Groundwater recharge pit installed & functional' : 'VERIFIED'}`,
    { x: 44, y: curY - 54, size: 8, font: fontRegular, color: textDark }
  );

  curY = curY - box2Height - 16;

  // SECTION 3: FINANCIAL SETTLEMENT BREAKDOWN (Accounting Ledger Table)
  page.drawText('3. FINANCIAL SETTLEMENT BREAKDOWN & ITEMIZED DEDUCTIONS', {
    x: 38,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: darkGreen,
  });

  curY -= 14;

  // Table Header
  const tableHeaderY = curY;
  page.drawRectangle({
    x: 36,
    y: tableHeaderY - 16,
    width: width - 72,
    height: 16,
    color: darkGreen,
  });
  page.drawText('Particulars / Line Item', { x: 44, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Classification', { x: 310, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Amount (INR)', { x: width - 110, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  curY = tableHeaderY - 28;

  // Base Deposit Row
  page.drawText('1. Refundable Construction Security Deposit', { x: 44, y: curY, size: 8, font: fontRegular, color: textDark });
  page.drawText('Base Escrow Paid', { x: 310, y: curY, size: 8, font: fontRegular, color: textMuted });
  page.drawText('Rs. 20,000.00', { x: width - 110, y: curY, size: 8, font: fontBold, color: textDark });
  curY -= 14;

  // Deduction Rows
  if (ref?.deductionBreakdown && ref.deductionBreakdown.length > 0) {
    let dIdx = 2;
    for (const d of ref.deductionBreakdown) {
      page.drawText(`${dIdx}. Less: ${d.reason}`, { x: 44, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
      page.drawText('Repair / Penalty', { x: 310, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
      page.drawText(`- Rs. ${d.amount.toFixed(2)}`, { x: width - 110, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
      curY -= 13;
      dIdx++;
    }
  } else if (ref && ref.deductionAmount > 0) {
    page.drawText(`2. Less Deductions: ${ref.deductionReason || 'Site damage repairs'}`, { x: 44, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
    page.drawText('Site Repairs', { x: 310, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
    page.drawText(`- Rs. ${ref.deductionAmount.toFixed(2)}`, { x: width - 110, y: curY, size: 8, font: fontRegular, color: rgb(0.7, 0.1, 0.1) });
    curY -= 13;
  } else {
    page.drawText('2. Less Deductions: Nil (Zero damage / penalties recorded)', { x: 44, y: curY, size: 8, font: fontRegular, color: textMuted });
    page.drawText('Inspection Pass', { x: 310, y: curY, size: 8, font: fontRegular, color: textMuted });
    page.drawText('Rs. 0.00', { x: width - 110, y: curY, size: 8, font: fontRegular, color: textMuted });
    curY -= 13;
  }

  // Net Payable / Demanded Banner
  curY -= 4;
  const isExcess = ref?.refundStatus === 'excess_damage_recovery';
  const bannerBg = isExcess ? rgb(0.99, 0.93, 0.93) : lightGreenBg;
  const bannerBorder = isExcess ? rgb(0.9, 0.6, 0.6) : borderGreen;
  const bannerText = isExcess ? rgb(0.75, 0.1, 0.1) : darkGreen;

  page.drawRectangle({
    x: 36,
    y: curY - 20,
    width: width - 72,
    height: 22,
    color: bannerBg,
    borderColor: bannerBorder,
    borderWidth: 1,
  });

  if (isExcess) {
    page.drawText('EXCESS DAMAGE DEMAND (Payable by Owner to Association):', {
      x: 44,
      y: curY - 14,
      size: 8.5,
      font: fontBold,
      color: bannerText,
    });
    page.drawText(`Rs. ${(ref?.excessDamageAmount || 0).toLocaleString('en-IN')}`, {
      x: width - 110,
      y: curY - 14,
      size: 9.5,
      font: fontBold,
      color: bannerText,
    });
  } else {
    page.drawText('NET REFUND AMOUNT PAYABLE TO OWNER:', {
      x: 44,
      y: curY - 14,
      size: 8.5,
      font: fontBold,
      color: bannerText,
    });
    page.drawText(`Rs. ${(ref?.finalRefundAmount || 20000).toLocaleString('en-IN')}`, {
      x: width - 110,
      y: curY - 14,
      size: 9.5,
      font: fontBold,
      color: bannerText,
    });
  }

  curY -= 36;

  // SECTION 4: BANK PAYOUT EXECUTION
  page.drawText('4. BANK PAYOUT TRANSACTION EXECUTION', {
    x: 38,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: darkGreen,
  });
  curY -= 14;
  page.drawText(`Bank Transfer Reference / UTR: ${ref?.refundTransactionId || 'PROCESSED ONLINE'}`, {
    x: 44,
    y: curY,
    size: 8,
    font: fontBold,
    color: textDark,
  });
  curY -= 12;
  page.drawText(`Payout Execution Date: ${ref?.refundDate || issueDate}  |  Authorized By: ${ref?.processedBy || 'AEOWA Treasurer & Works Committee'}`, {
    x: 44,
    y: curY,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  // SECTION 5: SIGNATURES & OFFICIAL SEAL
  curY -= 26;
  const sigBoxX = width - 260;
  page.drawText('For Anugraha Evergreen Layout Owners Welfare Association', {
    x: sigBoxX,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  // Open vertical space for physical seal stamping and wet-ink signatures post-printing
  curY -= 54;
  page.drawLine({
    start: { x: sigBoxX, y: curY + 12 },
    end: { x: width - 38, y: curY + 12 },
    thickness: 0.8,
    color: rgb(0.7, 0.75, 0.8),
  });

  page.drawText('President   /   Treasurer   /   Secretary', {
    x: sigBoxX + 15,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  curY -= 14;
  page.drawText('Date: ________________________', {
    x: sigBoxX + 15,
    y: curY,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  return await pdfDoc.save();
}

/**
 * Generates the Official Re-Measurement NOC PDF
 */
export async function generateReMeasurementNocPdfBytes(
  req: ServiceRequest,
  options?: PdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const logoImage = await loadLogoImage(pdfDoc);

  drawOfficialLetterhead(page, width, height, fontBold, logoImage);
  drawOfficialFooter(page, width, fontRegular, 1, 1);

  const certNumber = `AEOWA/SURVEY/2026/${req.plotNumber}`;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const titleText = 'NO OBJECTION CERTIFICATE FOR BOUNDARY RE-MEASUREMENT & SURVEY';
  const titleW = fontBold.widthOfTextAtSize(titleText, 10.5);
  const titleX = (width - titleW) / 2;
  const titleY = height - 116;

  page.drawText(titleText, {
    x: titleX,
    y: titleY,
    size: 10.5,
    font: fontBold,
    color: darkGreen,
  });
  page.drawLine({
    start: { x: titleX, y: titleY - 2.5 },
    end: { x: titleX + titleW, y: titleY - 2.5 },
    thickness: 1.2,
    color: darkGreen,
  });

  let curY = titleY - 25;
  page.drawText(`Certificate Reference: ${certNumber}`, { x: 40, y: curY, size: 9, font: fontBold, color: textDark });
  page.drawText(`Date: ${issueDate}`, { x: width - 140, y: curY, size: 9, font: fontBold, color: textDark });

  curY -= 25;
  const ownerName = options?.blankTemplate
    ? '________________________________________________'
    : (req.ownerName || '').toUpperCase();
  const plotNo = options?.blankTemplate ? '[  ________________  ]' : req.plotNumber;

  curY = drawParagraph(
    page,
    `This is to certify that the Management Committee of "ANUGRAHA EVERGREEN LAYOUT OWNERS WELFARE ASSOCIATION" has No Objection for carrying out boundary survey and re-measurement for Plot No. ${plotNo}, registered in the name of Mr. / Ms. ${ownerName}.`,
    {
      x: 40,
      y: curY,
      maxWidth: width - 80,
      lineHeight: 13,
      fontSize: 8.5,
      font: fontRegular,
      color: textDark,
    }
  );

  curY -= 15;
  page.drawText('SURVEY & BOUNDARY PROTOCOLS:', {
    x: 40,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: darkGreen,
  });
  curY -= 18;

  const notes = [
    '1. The survey must strictly adhere to the layout master approval plan and revenue village sketches.',
    '2. Physical survey and stone alignment must be conducted in the presence of authorized Association representatives.',
    '3. Adjoining plot owners must be notified prior to boundary marking as per layout verification protocol.',
    '4. No alteration of boundary stones, common road berms, or trees is permitted without Association sign-off.',
  ];

  for (const n of notes) {
    curY = drawParagraph(page, n, {
      x: 45,
      y: curY,
      maxWidth: width - 90,
      lineHeight: 12,
      fontSize: 8.5,
      font: fontRegular,
      color: textDark,
    });
    curY -= 4;
  }

  // Signatures Area
  curY -= 40;
  const sigBoxX = width - 260;
  page.drawText('For Anugraha Evergreen Layout Owners Welfare Association', {
    x: sigBoxX,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  // Open vertical space for physical seal stamping and wet-ink signatures post-printing
  curY -= 55;
  page.drawLine({
    start: { x: sigBoxX, y: curY + 12 },
    end: { x: width - 40, y: curY + 12 },
    thickness: 0.8,
    color: rgb(0.7, 0.75, 0.8),
  });

  page.drawText('President   /   Treasurer   /   Secretary', {
    x: sigBoxX + 15,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  curY -= 14;
  page.drawText('Date: ________________________', {
    x: sigBoxX + 15,
    y: curY,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  return await pdfDoc.save();
}
