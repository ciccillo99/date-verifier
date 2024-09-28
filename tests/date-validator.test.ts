import { generateVerifierCircuitInputs } from "../helpers";
const path = require("path");
const fs = require("fs");
const snarkjs = require("snarkjs");
const wasm_tester = require("circom_tester").wasm;

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
    const circuitInputs = await generateVerifierCircuitInputs(rawEmail, refYear, refMonth);

    const witness = await circuit.calculateWitness(circuitInputs);
    await circuit.checkConstraints(witness);

    // Verifica che `isDateValid` corrisponda al valore atteso
    expect(witness[circuit.getSignalIdx("main.isDateValid")]).toBe(expectedIsValid);

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

  // Lista dei test con input diversi
  const testCases = [
    { refYear: "2022", refMonth: "02", expectedIsValid: 1 },
    { refYear: "2022", refMonth: "03", expectedIsValid: 1 },
    { refYear: "2022", refMonth: "06", expectedIsValid: 1 },
    { refYear: "2023", refMonth: "02", expectedIsValid: 1 },
    { refYear: "2023", refMonth: "03", expectedIsValid: 1 },
    { refYear: "2023", refMonth: "06", expectedIsValid: 0 },
  ];

  testCases.forEach(({ refYear, refMonth, expectedIsValid }) => {
    it(`should validate date with refYear ${refYear} and refMonth ${refMonth}`, async function () {
      await testWithRefDate(refYear, refMonth, expectedIsValid);
    });
  });
});
