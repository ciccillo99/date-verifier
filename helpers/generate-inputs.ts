import { generateEmailVerifierInputs } from "@zk-email/helpers/dist/input-generators";


export type IVerifierCircuitInputs = {
  emailHeader: string[];
  emailHeaderLength: string;
  pubkey: string[];
  signature: string[];
  refYear: string;
  refMonth: string;
};

export async function generateVerifierCircuitInputs(
  email: string | Buffer,
  refYear: string, 
  refMonth: string 
): Promise<IVerifierCircuitInputs> {
  // Genera gli input necessari per la verifica della firma DKIM
  const emailVerifierInputs = await generateEmailVerifierInputs(email, {
    maxHeadersLength: 1024
  });

  return {
    emailHeader: emailVerifierInputs.emailHeader,
    emailHeaderLength: emailVerifierInputs.emailHeaderLength,
    pubkey: emailVerifierInputs.pubkey,
    signature: emailVerifierInputs.signature,
    refYear, // Passiamo i valori come input pubblici
    refMonth,
  };
}
