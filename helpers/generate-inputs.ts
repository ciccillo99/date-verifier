import { generateEmailVerifierInputs } from "@zk-email/helpers/dist/input-generators";

export type IVerifierCircuitInputs = {
  emailHeader: string[];
  emailHeaderLength: string;
  pubkey: string[];
  signature: string[];
  monthIndex: string;
  yearIndex: string;
  refYear: string;
  refMonth: string;
};
  export async function generateVerifierCircuitInputs(
    email: string | Buffer,
    refYear: string, 
    refMonth: string
  ): Promise<IVerifierCircuitInputs> {
    // Genera gli input necessari per la verifica della firma DKIM
    const emailVerifierInputs = await generateEmailVerifierInputs(email);
  
    const emailHeaderBuffer = Buffer.from(emailVerifierInputs.emailHeader.map((c) => Number(c)));
  
    // Usa il preselettore per individuare l'header "date:"
    const dateSelector = Buffer.from("date:", 'utf-8');
    const dateIndex = emailHeaderBuffer.indexOf(dateSelector);
  
    if (dateIndex === -1) {
      throw new Error("Impossibile trovare l'header 'date:' nell'email.");
    }
  
    // Trova il primo spazio dopo "date:Wed,"
    const firstSpaceAfterDate = emailHeaderBuffer.indexOf(Buffer.from(" ", 'utf-8'), dateIndex + dateSelector.length);
    if (firstSpaceAfterDate === -1) {
      throw new Error("Impossibile trovare il primo spazio dopo la data.");
    }
  
    // Trova il secondo spazio dopo il giorno (per gestire giorni a una o due cifre)
    const secondSpaceAfterDate = emailHeaderBuffer.indexOf(Buffer.from(" ", 'utf-8'), firstSpaceAfterDate + 1);
    if (secondSpaceAfterDate === -1) {
      throw new Error("Impossibile trovare il secondo spazio dopo la data.");
    }
  
    // L'indice del mese sarà subito dopo il secondo spazio (dopo "3 " o "31 ")
    const monthIndex = secondSpaceAfterDate + 1;
  
    // L'indice dell'anno sarà 5 caratteri dopo l'indice del mese (perché anno ha 4 caratteri)
    const yearIndex = monthIndex + 4;
  
    console.log(`monthIndex: ${monthIndex}, yearIndex: ${yearIndex}`);  // Debug
  
    if (monthIndex === -1 || yearIndex === -1) {
      throw new Error("Impossibile trovare il mese o l'anno nell'header dell'email.");
    }
  
    // Converti gli indici in stringhe, come nell'esempio di Twitter
    return {
      emailHeader: emailVerifierInputs.emailHeader,
      emailHeaderLength: emailVerifierInputs.emailHeaderLength,
      pubkey: emailVerifierInputs.pubkey,
      signature: emailVerifierInputs.signature,
      monthIndex: monthIndex.toString(),  
      yearIndex: yearIndex.toString(),    
      refYear,
      refMonth,
    };
  }
  