import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  HeadingLevel,
  ShadingType,
} from "docx";
import { formatDateDMY } from "../whatsapp/date-formatter";

export interface DailyBoardMatter {
  srNo: number;
  caseNumber: string;
  cnr: string;
  courtName: string;
  judge?: string | null;
  petitioner: string;
  respondent: string;
  stage: string;
  assignedAdvocate: string;
  advocatePhone?: string | null;
  juniorAdvocate?: string | null;
  notes?: string | null;
}

export interface DailyBoardOptions {
  firmName: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  dateStr: string; // "YYYY-MM-DD"
  matters: DailyBoardMatter[];
}

/**
 * Generates an official Microsoft Word (.docx) Daily Cause Board document
 * formatted to Indian advocate chamber standards.
 */
export async function generateDailyBoardDocx(options: DailyBoardOptions): Promise<Buffer> {
  const { firmName, leadAdvocate, contactPhone, dateStr, matters } = options;
  const formattedDate = formatDateDMY(dateStr);

  // Day of week name
  const dObj = new Date(dateStr + "T00:00:00");
  const dayName = !isNaN(dObj.getTime())
    ? dObj.toLocaleDateString("en-IN", { weekday: "long" })
    : "";

  const tableBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "CCCCCC",
  };

  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  // Table header cell generator
  const createHeaderCell = (text: string, widthPercent: number) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: "1E293B" }, // Dark Slate
      borders: cellBorders,
      margins: { top: 140, bottom: 140, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: true,
              color: "FFFFFF",
              size: 18, // 9pt
              font: "Calibri",
            }),
          ],
        }),
      ],
    });
  };

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      createHeaderCell("Sr.", 5),
      createHeaderCell("Court Establishment & Coram", 22),
      createHeaderCell("Case No. / CNR", 18),
      createHeaderCell("Parties (Petitioner v. Respondent)", 22),
      createHeaderCell("Stage / Purpose", 15),
      createHeaderCell("Assigned Counsel", 18),
    ],
  });

  // Data rows
  const dataRows: TableRow[] = [];

  if (matters.length === 0) {
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 6,
            borders: cellBorders,
            margins: { top: 200, bottom: 200, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `No matters listed for hearing on ${formattedDate}.`,
                    italics: true,
                    color: "64748B",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else {
    matters.forEach((matter, idx) => {
      const isEven = idx % 2 === 1;
      const rowBg = isEven ? "F8FAFC" : "FFFFFF";

      const createCell = (paragraphs: Paragraph[], widthPercent: number) =>
        new TableCell({
          width: { size: widthPercent, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: rowBg },
          borders: cellBorders,
          margins: { top: 120, bottom: 120, left: 100, right: 100 },
          children: paragraphs,
        });

      dataRows.push(
        new TableRow({
          children: [
            // 1. Sr. No.
            createCell(
              [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: String(matter.srNo || idx + 1),
                      bold: true,
                      size: 18,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
              5
            ),

            // 2. Court Establishment & Coram
            createCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.courtName || "eCourt",
                      bold: true,
                      size: 18,
                      font: "Calibri",
                    }),
                  ],
                }),
                ...(matter.judge
                  ? [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Judge: ${matter.judge}`,
                            italics: true,
                            size: 16,
                            color: "475569",
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
              22
            ),

            // 3. Case No. & CNR
            createCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.caseNumber || "N/A",
                      bold: true,
                      size: 18,
                      color: "0F172A",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `CNR: ${matter.cnr}`,
                      size: 15,
                      color: "64748B",
                      font: "Consolas",
                    }),
                  ],
                }),
              ],
              18
            ),

            // 4. Parties
            createCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.petitioner || "Petitioner",
                      bold: true,
                      size: 17,
                      font: "Calibri",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "versus",
                      italics: true,
                      size: 15,
                      color: "94A3B8",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.respondent || "Respondent",
                      bold: true,
                      size: 17,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
              22
            ),

            // 5. Stage / Purpose of Listing
            createCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.stage || "Hearing",
                      bold: true,
                      size: 18,
                      color: "B45309", // Amber/Gold tone
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
              15
            ),

            // 6. Assigned Counsel
            createCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: matter.assignedAdvocate || "Lead Counsel",
                      bold: true,
                      size: 18,
                      font: "Calibri",
                    }),
                  ],
                }),
                ...(matter.advocatePhone
                  ? [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: matter.advocatePhone,
                            size: 15,
                            color: "64748B",
                            font: "Consolas",
                          }),
                        ],
                      }),
                    ]
                  : []),
                ...(matter.juniorAdvocate
                  ? [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Junior: ${matter.juniorAdvocate}`,
                            size: 15,
                            italics: true,
                            color: "334155",
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
              18
            ),
          ],
        })
      );
    });
  }

  // Document Assembly
  const doc = new Document({
    title: `${firmName} - Daily Cause Board ${formattedDate}`,
    description: `Daily courtroom cause list generated by Quater Chambers Management System`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${firmName} · Daily Cause Board · ${formattedDate}`,
                    size: 16,
                    color: "94A3B8",
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Confidential Legal Document · Generated via Quater Chamber Automation · Page ",
                    size: 16,
                    color: "94A3B8",
                    font: "Calibri",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: "94A3B8",
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Chamber Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: firmName.toUpperCase(),
                bold: true,
                size: 32, // 16pt
                color: "0F172A",
                font: "Calibri",
              }),
            ],
          }),

          // Subtitle / Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "DAILY CAUSE BOARD & COURT SCHEDULE",
                bold: true,
                size: 22, // 11pt
                color: "334155",
                font: "Calibri",
                characterSpacing: 20,
              }),
            ],
          }),

          // Date & Metadata Bar
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `Listing Date: `,
                bold: true,
                size: 20,
                font: "Calibri",
              }),
              new TextRun({
                text: `${formattedDate}${dayName ? ` (${dayName})` : ""}`,
                bold: true,
                size: 20,
                color: "0284C7", // Cyan/Sky blue highlight
                font: "Calibri",
              }),
              new TextRun({
                text: `  |  Total Matters Listed: `,
                bold: true,
                size: 20,
                font: "Calibri",
              }),
              new TextRun({
                text: `${matters.length}`,
                bold: true,
                size: 20,
                color: "0F172A",
                font: "Calibri",
              }),
              ...(leadAdvocate
                ? [
                    new TextRun({
                      text: `  |  Lead Counsel: ${leadAdvocate}`,
                      size: 18,
                      color: "475569",
                      font: "Calibri",
                    }),
                  ]
                : []),
              ...(contactPhone
                ? [
                    new TextRun({
                      text: ` (${contactPhone})`,
                      size: 18,
                      color: "475569",
                      font: "Calibri",
                    }),
                  ]
                : []),
            ],
          }),

          // Matters Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),

          // Court Notes & Advocate Remarks Box
          new Paragraph({
            spacing: { before: 240, after: 80 },
            children: [
              new TextRun({
                text: "COURT ATTENDANCE & PROCEEDINGS NOTES / ADVOCATE DIARY ENTRY:",
                bold: true,
                size: 18,
                color: "334155",
                font: "Calibri",
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: cellBorders,
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Matter / Item No.",
                            bold: true,
                            size: 16,
                            color: "64748B",
                          }),
                        ],
                      }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    borders: cellBorders,
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Next Date Given / Court Order / Business Recorded in Court Hall",
                            bold: true,
                            size: 16,
                            color: "64748B",
                          }),
                        ],
                      }),
                    ],
                    width: { size: 80, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              // Empty note lines for handwritten advocate courtroom notes
              ...[1, 2, 3, 4].map(
                () =>
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: cellBorders,
                        margins: { top: 120, bottom: 120, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun("")] })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        borders: cellBorders,
                        margins: { top: 120, bottom: 120, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun("")] })],
                        width: { size: 80, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  })
              ),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
