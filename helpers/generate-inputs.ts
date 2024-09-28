import { bytesToBigInt, fromHex } from "@zk-email/helpers/dist/binary-format";
import { generateEmailVerifierInputs } from "@zk-email/helpers/dist/input-generators";

export const SUBJECT_SELECTOR = "Ricezione ricevuta telematica (Successo)";

export type IPolimiCircuitInputs = {
  dateTimestamp: string;
  matricolaIndex: string;
  address: string;
  emailHeader: string[];
  emailHeaderLength: string;
  pubkey: string[];
  signature: string[];
  emailBody: string[];
  emailBodyLength: string;
  precomputedSHA: string[];
  bodyHashIndex: string;
};

export async function generatePolimiVerifierCircuitInputs(
  email: string | Buffer,
  ethereumAddress: string
): Promise<IPolimiCircuitInputs> {
  const emailVerifierInputs = await generateEmailVerifierInputs(email, {
    shaPrecomputeSelector: SUBJECT_SELECTOR,
  });

  // Fornisci un array vuoto o "0" come valore di default nel caso in cui emailBody, precomputedSHA o emailBodyLength siano undefined
  const emailBody = emailVerifierInputs.emailBody || [];
  const precomputedSHA = emailVerifierInputs.precomputedSHA || [];
  const bodyHashIndex = emailVerifierInputs.bodyHashIndex || "0"; // Valore predefinito se non è presente
  const emailBodyLength = emailVerifierInputs.emailBodyLength || "0"; // Valore predefinito se non è presente

  // Converti l'indirizzo Ethereum in formato BigInt
  const address = bytesToBigInt(fromHex(ethereumAddress)).toString();

  // Estrai l'indice della matricola dal corpo dell'email
  const matricolaIndex = extractMatricolaIndex(emailBody);

  // Estrai la data dall'header dell'email e convertila in timestamp Unix
  const dateString = extractDateFromHeader(emailVerifierInputs.emailHeader);
  const dateTimestamp = (new Date(dateString).getTime() / 1000).toString(); // Converti in Unix timestamp in secondi

  return {
    ...emailVerifierInputs,
    emailBody, // Usa il corpo dell'email con valore predefinito
    precomputedSHA, // Usa SHA precomputato con valore predefinito
    bodyHashIndex, // Usa bodyHashIndex con valore predefinito
    emailBodyLength, // Usa emailBodyLength con valore predefinito
    matricolaIndex: matricolaIndex.toString(),
    dateTimestamp,
    address,
  };
}

/**
 * Estrae l'indice della matricola dal corpo dell'email.
 * @param emailBody Il corpo dell'email come array di stringhe.
 * @returns L'indice della matricola nel corpo dell'email.
 */
function extractMatricolaIndex(emailBody: string[]): number {
  // Definisci una regex o una logica di ricerca per la matricola in base al suo formato.
  // Esempio: la matricola è composta da 8 cifre.
  const matricolaPattern = /\b\d{8}\b/;
  const bodyString = emailBody.join("");

  const match = bodyString.match(matricolaPattern);
  if (!match) {
    throw new Error("Matricola non trovata nel corpo dell'email.");
  }

  return bodyString.indexOf(match[0]);
}

/**
 * Estrae la data dall'header dell'email.
 * @param emailHeader L'header dell'email come array di stringhe.
 * @returns La stringa della data trovata nell'header dell'email.
 */
function extractDateFromHeader(emailHeader: string[]): string {
  const dateLine = emailHeader.find((line) => line.startsWith("Date: "));
  if (!dateLine) {
    throw new Error("Intestazione della data non trovata nell'email.");
  }
  return dateLine.replace("Date: ", "").trim();
}
