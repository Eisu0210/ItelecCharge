import crypto from "node:crypto";
import { q } from "./db/pool";
import type { Role } from "../src/types";

const ROLES: Role[] = ["admin", "commercial", "installateur", "dispatch", "site_survey"];

/** Prénom / nom : minuscules, sans accents, alphanum (pour l’identifiant). */
export function normalizeNamePart(s: string): string {
  const t = s
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return t.slice(0, 48) || "x";
}

/** Sur une chaîne normalisée en minuscules : première lettre en majuscule, reste en minuscules. */
function capitalizeFirst(nameNormLower: string): string {
  if (!nameNormLower) return "X";
  return nameNormLower[0]!.toUpperCase() + nameNormLower.slice(1).toLowerCase();
}

/**
 * 1ʳᵉ lettre du nom, 1ʳᵉ du prénom, puis le littéral `Itel`, puis exactement 4 chiffres aléatoires (ex. `hmItel0427`).
 * Lettres en minuscules, versions normalisées (accents supprimés).
 */
export function buildInitialPassword(firstName: string, lastName: string): string {
  const fn = normalizeNamePart(firstName);
  const ln = normalizeNamePart(lastName);
  const a = ln[0] ?? "x";
  const b = fn[0] ?? "x";
  const n = String(crypto.randomInt(0, 10_000)).padStart(4, "0");
  return `${a}${b}Itel${n}`;
}

/**
 * Identifiant strict : 1ʳᵉ lettre du nom (majuscule) + prénom (1ʳᵉ lettre majuscule, reste en minuscules), sans rien après le prénom.
 * Ex. Hopengarten + Mathieu → HMathieu. Si cet identifiant existe déjà, une erreur est levée (pas de suffixe).
 */
export async function pickUniqueLogin(firstName: string, lastName: string): Promise<string> {
  const fn = normalizeNamePart(firstName).replace(/[0-9]/g, "") || "x";
  const ln = normalizeNamePart(lastName).replace(/[0-9]/g, "") || "x";
  const letterNom = (ln[0] ?? "x").toUpperCase();
  const prenomCased = capitalizeFirst(fn);
  const login = `${letterNom}${prenomCased}`.slice(0, 64) || "X";
  const { rows } = await q(`SELECT 1 AS one FROM users WHERE LOWER(login) = LOWER($1) LIMIT 1`, [login]);
  if (rows.length > 0) {
    throw new Error("Identifiant déjà utilisé : un compte avec ce prénom et ce nom existe déjà.");
  }
  return login;
}

export function isValidRole(r: string): r is Role {
  return (ROLES as string[]).includes(r);
}
