import { generateVerifierCircuitInputs } from "../helpers";
const path = require("path");
const fs = require("fs");
const snarkjs = require("snarkjs");
const wasm_tester = require("circom_tester").wasm;

// Helper per convertire una stringa di anno (es. "2022") nel suo intero corrispondente usando i valori ASCII
function asciiYearToBigInt(year: string): bigint {
  const asciiCodes = year.split('').map(char => char.charCodeAt(0));
  let yearAsInt = BigInt(0);
  for (let i = 0; i < asciiCodes.length; i++) {
    yearAsInt = yearAsInt * BigInt(256) + BigInt(asciiCodes[i]);
  }
  return yearAsInt;
}

describe("DateVerifier Circuit Test with Proof Generation", function () {
  jest.setTimeout(10 * 60 * 1000); // 10 minutes

  let rawEmail: Buffer;
  let circuit: any;
  const CIRCUIT_NAME = "date-validator";
  const BUILD_DIR = path.join(__dirname, "../build");
  const OUTPUT_DIR = path.join(__dirname, "../proofs");

  beforeAll(async () => {
    rawEmail = fs.readFileSync(
      path.join(__dirname, "./emls/email-test.eml"), // Adjust the path to your test email
      "utf8"
    );

    circuit = await wasm_tester(path.join(__dirname, "../src/date-validator.circom"), {
      recompile: true,
      output: path.join(__dirname, "../build/output"),
      include: [path.join(__dirname, "../node_modules"), path.join(__dirname, "../../../node_modules")],
    });

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }
  });

  async function testWithRefDate(refYear: string, refMonth: string, expectedIsValid: number) {
    // Converte il refYear in intero rappresentato da ASCII
    const refYearAsBigInt = asciiYearToBigInt(refYear).toString(); // Convertiamo il refYear in BigInt e poi in stringa
    const circuitInputs = await generateVerifierCircuitInputs(rawEmail, refYearAsBigInt, refMonth);

    console.log("Circuit Inputs:", circuitInputs);
    // Calculate the witness 
    const witness = await circuit.calculateWitness(circuitInputs);
    await circuit.checkConstraints(witness);

    // Carica i simboli del circuito 
    await circuit.loadSymbols();

    // Recupera l'indice di isDateValid
    const isDateValidIndex = circuit.symbols["main.isDateValid"].varIdx;

    const refYear_ = circuit.symbols["main.refYear"].varIdx;
    console.log("refYear: ",witness[refYear_]);

    const monthPacks = circuit.symbols["main.monthPacks[0]"].varIdx;
    console.log("monthPacks[0]: ",witness[monthPacks]);

    const refMonth_ = circuit.symbols["main.refMonth"].varIdx;
    console.log("refMonth: ",witness[refMonth_]);

    const monthNum = circuit.symbols["main.monthNum"].varIdx;
    console.log("monthNum: ",witness[monthNum]);

    const yearNum = circuit.symbols["main.yearNum"].varIdx;
    console.log("yearNum: ",witness[yearNum]);

    const isMonthValid = circuit.symbols["main.isMonthValid"].varIdx;
    console.log("isMonthValid: ",witness[isMonthValid]);

    const isYearEqual = circuit.symbols["main.isYearEqual"].varIdx;
    console.log("isYearEqual: ",witness[isYearEqual]);

    const isYearGreater = circuit.symbols["main.isYearGreater"].varIdx;
    console.log("isYearGreater: ",witness[isYearGreater]);

    // Assegna il valore di isDateValid ad una variabile
    const isDateValidValue = witness[isDateValidIndex];
    console.log("isDateValid: ",isDateValidValue);

    // Verifica che `isDateValid` corrisponda al valore atteso
    expect(isDateValidValue).toBe(BigInt(expectedIsValid));

    // Genera la prova e verifica la validità
    const wasm = fs.readFileSync(
      path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`)
    );
    const wc = require(path.join(BUILD_DIR, `${CIRCUIT_NAME}_js/witness_calculator.js`));
    const witnessCalculator = await wc(wasm);
    const buff = await witnessCalculator.calculateWTNSBin(circuitInputs, 0);
    fs.writeFileSync(path.join(OUTPUT_DIR, `input_${refYear}_${refMonth}.wtns`), buff);

    const { proof, publicSignals } = await snarkjs.groth16.prove(
      path.join(BUILD_DIR, `${CIRCUIT_NAME}.zkey`),
      path.join(OUTPUT_DIR, `input_${refYear}_${refMonth}.wtns`)
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `proof_${refYear}_${refMonth}.json`),
      JSON.stringify(proof, null, 2)
    );
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `public_${refYear}_${refMonth}.json`),
      JSON.stringify(publicSignals, null, 2)
    );

    const vkey = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `artifacts/${CIRCUIT_NAME}.vkey.json`)).toString());
    const proofVerified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    expect(proofVerified).toBe(true);
  }

  // Definizione dei test case con anno e mese di riferimento e valore atteso di isDateValid
  const testCases = [
    { refYear: "2023", refMonth: "6", expectedIsValid: 0 },  // Data estratta è minore di 2023-06
    //{ refYear: "2022", refMonth: "4", expectedIsValid: 1 },  // Data estratta è maggiore di 2022-02
    //{ refYear: "2023", refMonth: "5", expectedIsValid: 1 },  // Data estratta è uguale a 2023-05
    //{ refYear: "2021", refMonth: "12", expectedIsValid: 1 },  // Data estratta è maggiore di 2021-12
    //{ refYear: "2022", refMonth: "1", expectedIsValid: 1 },  // Data estratta è maggiore di 2022-01
    //{ refYear: "2023", refMonth: "3", expectedIsValid: 1 },  // Data estratta è maggiore di 2023-03
  ];

  // Eseguire ogni test case
  testCases.forEach(({ refYear, refMonth, expectedIsValid }) => {
    it(`should validate date with refYear ${refYear} and refMonth ${refMonth}`, async function () {
      await testWithRefDate(refYear, refMonth, expectedIsValid);
    });
  });
});
