/**
 * Module centralisé de résolution et de déduplication des entreprises NACORA
 * Source unique de vérité pour relier contacts et entreprises.
 */

import { Company } from "../types";
import { dbStore } from "../dbStore";

/**
 * Nettoyage et normalisation prudente du nom d'entreprise
 */
export function normalizeCompanyName(name?: string): string {
  if (!name) return "";
  let clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Enlever les formes juridiques standards en fin de nom
  clean = clean
    .replace(/\b(sa|sas|sarl|sasu|gie|eurl|snc|inc|ltd|llc|corp|corporation)\b$/g, "")
    .trim();

  return clean;
}

/**
 * Détermine si deux noms d'entreprise correspondent prudemment à la même entité.
 * Ex: "Crédit Agricole", "Crédit Agricole SA", "CREDIT AGRICOLE", "Crédit Agricole Centre France"
 */
export function isSameCompany(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const a = normalizeCompanyName(nameA);
  const b = normalizeCompanyName(nameB);

  if (!a || !b) return false;
  if (a === b) return true;

  // Comparaison de racine connue : ex "credit agricole"
  const knownRoots = [
    "credit agricole",
    "bnp paribas",
    "societe generale",
    "bpce",
    "caisse d'epargne",
    "banque populaire",
    "credit mutuel",
    "rothschild",
    "lazard",
    "reckitt",
    "groupama",
    "axa",
    "natixis"
  ];

  for (const root of knownRoots) {
    if (a.includes(root) && b.includes(root)) {
      return true;
    }
  }

  // Si l'un est inclus dans l'autre avec une longueur significative (>6 caractères)
  if (a.length >= 6 && b.length >= 6) {
    if (a.startsWith(b) || b.startsWith(a)) {
      return true;
    }
  }

  return false;
}

/**
 * Résout une entreprise de manière centralisée :
 * 1. Recherche par ID direct si fourni
 * 2. Recherche par nom exact
 * 3. Recherche par nom normalisé / déduplication prudente
 * 4. Création d'une nouvelle entreprise uniquement si non existante
 */
export function resolveCompany(input: {
  companyName?: string;
  companyId?: string;
}): { company: Company; isNew: boolean } {
  const companies = dbStore.getCompanies();
  const rawName = (input.companyName || "").trim();
  const targetId = input.companyId?.trim();

  // 1. Recherche par identifiant direct
  if (targetId) {
    const byId = companies.find(c => c.id === targetId);
    if (byId) {
      return { company: byId, isNew: false };
    }
  }

  const cleanName = rawName || "Entreprise";

  // 2. Recherche par nom exact (insensible à la casse)
  const exactMatch = companies.find(
    c => c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (exactMatch) {
    return { company: exactMatch, isNew: false };
  }

  // 3. Recherche par correspondance normalisée et déduplication
  const normMatch = companies.find(c => isSameCompany(c.name, cleanName));
  if (normMatch) {
    return { company: normMatch, isNew: false };
  }

  // 4. Création prudente d'une nouvelle entreprise
  const newCompany: Company = {
    id: "co_" + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    sector: "Secteur à préciser",
    notes: "",
    createdAt: new Date().toISOString(),
    opportunityCount: 0,
    contactCount: 0,
    noteCount: 0,
    fieldSources: {
      name: "manual"
    }
  };

  dbStore.addCompany(newCompany);
  return { company: newCompany, isNew: true };
}
