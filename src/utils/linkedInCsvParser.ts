import { Contact, ContactCategory, ContactCategoryItem, NetworkingRelevanceItem, ProfessionalProfileDetails } from "../types";

export interface ParsedLinkedInRawRow {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  company: string;
  position: string;
  url: string;
  connectedOn: string;
  isValid: boolean;
}

export interface LinkedInContactCandidate extends ParsedLinkedInRawRow {
  normalizedJobTitle?: string;
  category?: ContactCategory;
  relevanceScore?: number;
  connectionPoints?: string[];
  academicPath?: string;
  previousCompanies?: string[];
  isDuplicate: boolean;
  duplicateMatchReason?: string;
  existingContactId?: string;
  existingContact?: Contact;
  duplicateAction: 'update' | 'skip' | 'create_new';
  selected: boolean;

  // Multidimensional classification
  categories?: ContactCategoryItem[];
  professionalProfile?: ProfessionalProfileDetails;
  networkingRelevance?: NetworkingRelevanceItem[];
  summary?: string;
  education?: string[];
  pastCompanies?: string[];
  companySector?: string;
}

/**
 * Robust CSV parser handling quotes, comma/semicolon/tab delimiters,
 * and multiline cell contents.
 */
export function parseCsvRows(rawCsvText: string): string[][] {
  const clean = rawCsvText.replace(/^\uFEFF/, ""); // Remove BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  // Auto-detect delimiter from the first non-empty lines (comma, semicolon, or tab)
  const sampleLines = clean.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
  let delimiter = ",";
  const commaCount = sampleLines.reduce((acc, l) => acc + (l.match(/,/g) || []).length, 0);
  const semicolonCount = sampleLines.reduce((acc, l) => acc + (l.match(/;/g) || []).length, 0);
  const tabCount = sampleLines.reduce((acc, l) => acc + (l.match(/\t/g) || []).length, 0);

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentCell += '"';
        i++;
      } else {
        // Toggle inside quote
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Push last cell & row if remaining
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header names for flexible mapping across English and French exports.
 */
function normalizeHeaderName(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Finds the header row in the parsed CSV rows, skipping LinkedIn's introductory notes.
 */
export function extractLinkedInContacts(csvContent: string): ParsedLinkedInRawRow[] {
  const rows = parseCsvRows(csvContent);
  if (rows.length === 0) return [];

  // Look for header row containing typical LinkedIn column names
  let headerIndex = -1;
  let firstNameCol = -1;
  let lastNameCol = -1;
  let emailCol = -1;
  let companyCol = -1;
  let positionCol = -1;
  let urlCol = -1;
  let connectedOnCol = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    const normalizedRow = row.map(normalizeHeaderName);

    const fIdx = normalizedRow.findIndex(h => 
      h.includes("firstname") || h.includes("prenom") || h === "first"
    );
    const lIdx = normalizedRow.findIndex(h => 
      h.includes("lastname") || h.includes("nom") || h === "last" || h.includes("nomdefamille")
    );
    const cIdx = normalizedRow.findIndex(h => 
      h.includes("company") || h.includes("entreprise") || h.includes("societe") || h.includes("organisation")
    );
    const pIdx = normalizedRow.findIndex(h => 
      h.includes("position") || h.includes("poste") || h.includes("titre") || h.includes("jobtitle") || h.includes("fonction")
    );

    if ((fIdx !== -1 || lIdx !== -1) && (cIdx !== -1 || pIdx !== -1)) {
      headerIndex = r;
      firstNameCol = fIdx;
      lastNameCol = lIdx;
      companyCol = cIdx;
      positionCol = pIdx;

      emailCol = normalizedRow.findIndex(h => 
        h.includes("email") || h.includes("courriel") || h.includes("mail") || h.includes("adresseemail")
      );
      urlCol = normalizedRow.findIndex(h => 
        h === "url" || h.includes("linkedin") || h.includes("profile") || h.includes("lien")
      );
      connectedOnCol = normalizedRow.findIndex(h => 
        h.includes("connectedon") || h.includes("connectele") || h.includes("date") || h.includes("connexion")
      );

      break;
    }
  }

  // Fallback: If no header found, assume standard 0: First Name, 1: Last Name, 2: URL, 3: Email, 4: Company, 5: Position, 6: Connected On
  let dataRows: string[][] = [];
  if (headerIndex !== -1) {
    dataRows = rows.slice(headerIndex + 1);
  } else {
    // If first row looks like data
    dataRows = rows;
    firstNameCol = 0;
    lastNameCol = 1;
    companyCol = 2;
    positionCol = 3;
  }

  const contacts: ParsedLinkedInRawRow[] = [];

  dataRows.forEach((row, idx) => {
    const firstName = (firstNameCol !== -1 && row[firstNameCol]) ? row[firstNameCol].trim() : "";
    const lastName = (lastNameCol !== -1 && row[lastNameCol]) ? row[lastNameCol].trim() : "";
    const email = (emailCol !== -1 && row[emailCol]) ? row[emailCol].trim() : "";
    const company = (companyCol !== -1 && row[companyCol]) ? row[companyCol].trim() : "";
    const position = (positionCol !== -1 && row[positionCol]) ? row[positionCol].trim() : "";
    const url = (urlCol !== -1 && row[urlCol]) ? row[urlCol].trim() : "";
    const connectedOn = (connectedOnCol !== -1 && row[connectedOnCol]) ? row[connectedOnCol].trim() : "";

    const fullName = `${firstName} ${lastName}`.trim();

    // Only include if at least name or company/position is somewhat present
    if (fullName.length > 0 || (company.length > 0 && position.length > 0)) {
      contacts.push({
        id: `raw_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        firstName: firstName || fullName.split(" ")[0] || "Inconnu",
        lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
        fullName: fullName || "Contact sans nom",
        email,
        company: company || "Entreprise non spécifiée",
        position: position || "Professionnel",
        url,
        connectedOn,
        isValid: true
      });
    }
  });

  return contacts;
}

/**
 * Normalizes text for comparison (lower case, accent stripping, punctuation trimming).
 */
function normalizeForComparison(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Detects duplicates against existing contacts in DB and marks actions.
 */
export function detectDuplicates(
  rawContacts: ParsedLinkedInRawRow[],
  existingContacts: Contact[]
): LinkedInContactCandidate[] {
  const seenInBatch = new Set<string>();

  return rawContacts.map(raw => {
    const normRawName = normalizeForComparison(raw.fullName);
    const normRawEmail = raw.email ? raw.email.trim().toLowerCase() : "";
    const normRawUrl = raw.url ? raw.url.trim().toLowerCase() : "";

    let match: Contact | undefined;
    let matchReason: string | undefined;

    // 1. Check exact email match
    if (normRawEmail) {
      match = existingContacts.find(c => c.email && c.email.trim().toLowerCase() === normRawEmail);
      if (match) matchReason = `Même adresse email (${match.email})`;
    }

    // 2. Check LinkedIn URL match
    if (!match && normRawUrl) {
      match = existingContacts.find(c => c.linkedInUrl && c.linkedInUrl.trim().toLowerCase() === normRawUrl);
      if (match) matchReason = `Même profil LinkedIn`;
    }

    // 3. Check exact Full Name match
    if (!match && normRawName.length > 2) {
      match = existingContacts.find(c => normalizeForComparison(c.fullName) === normRawName);
      if (match) matchReason = `Même nom complet (${match.fullName})`;
    }

    // 4. Check First Name + Last Name match
    if (!match && raw.firstName && raw.lastName) {
      const targetCombo = normalizeForComparison(`${raw.firstName}${raw.lastName}`);
      match = existingContacts.find(c => normalizeForComparison(`${c.firstName}${c.lastName}`) === targetCombo);
      if (match) matchReason = `Même prénom et nom (${match.fullName})`;
    }

    // Check if duplicate in current batch
    const batchKey = normRawEmail || normRawName;
    const isDuplicateInBatch = seenInBatch.has(batchKey);
    if (batchKey) seenInBatch.add(batchKey);

    const isDuplicate = !!match || isDuplicateInBatch;

    return {
      ...raw,
      isDuplicate,
      duplicateMatchReason: matchReason || (isDuplicateInBatch ? "Présent plusieurs fois dans le fichier importé" : undefined),
      existingContactId: match?.id,
      existingContact: match,
      duplicateAction: match ? 'update' : isDuplicateInBatch ? 'skip' : 'create_new',
      selected: !isDuplicateInBatch // select by default unless internal duplicate
    };
  });
}
