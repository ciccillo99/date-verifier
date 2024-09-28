import { buildPoseidon } from "circomlibjs";
import { verifyDKIMSignature } from "@zk-email/helpers/dist/dkim";
import { generatePolimiVerifierCircuitInputs } from "../helpers";
import { bigIntToChunkedBytes, bytesToBigInt } from "@zk-email/helpers/dist/binary-format";

const path = require("path");
const fs = require("fs");
const wasm_tester = require("circom_tester").wasm;


describe("Polimi email test", function () {
  jest.setTimeout(10 * 60 * 1000); // 10 minutes

  let rawEmail: Buffer;
  let circuit: any;
  const ethAddress = "0xCbcAC0388501E5317304D7Da1Ee3a082Df67336d"; // Example ETH address

  beforeAll(async () => {
    rawEmail = fs.readFileSync(
      path.join(__dirname, "./emls/polimi-test.eml"), // Adjust the path to your Polimi test email
      "utf8"
    );

    circuit = await wasm_tester(path.join(__dirname, "../src/polimi.circom"), {
      recompile: true,
      output: path.join(__dirname, "../build/polimi"),
      include: [path.join(__dirname, "../node_modules"), path.join(__dirname, "../../../node_modules")],
    });
  });

  it("should verify Polimi email", async function () {
    const polimiVerifierInputs = await generatePolimiVerifierCircuitInputs(rawEmail, ethAddress);
    const witness = await circuit.calculateWitness(polimiVerifierInputs);
    await circuit.checkConstraints(witness);

    // Calculate DKIM pubkey hash to verify its same as the one from circuit output
    const dkimResult = await verifyDKIMSignature(rawEmail, "polimi.it");
    const poseidon = await buildPoseidon();
    const pubkeyChunked = bigIntToChunkedBytes(dkimResult.publicKey, 242, 9); // Chunk into 242-bit pieces
    const hash = poseidon(pubkeyChunked);

    // Assert pubkey hash
    expect(witness[1]).toEqual(poseidon.F.toObject(hash));

    // Check extracted matricola in the body
    const matricolaInEmailBytes = new TextEncoder().encode("10834998").reverse(); // Circuit pack in reverse order
    expect(witness[2]).toEqual(bytesToBigInt(matricolaInEmailBytes));

    // Check address public input
    expect(witness[3]).toEqual(BigInt(ethAddress));
  });

  it("should fail if the matricolaIndex is invalid", async function () {
    const polimiVerifierInputs = await generatePolimiVerifierCircuitInputs(rawEmail, ethAddress);
    polimiVerifierInputs.matricolaIndex = (Number(polimiVerifierInputs.matricolaIndex) + 1).toString(); // Tamper the index

    expect.assertions(1);

    try {
      const witness = await circuit.calculateWitness(polimiVerifierInputs);
      await circuit.checkConstraints(witness);
    } catch (error) {
      expect((error as Error).message).toMatch("Assert Failed");
    }
  });

  it("should fail if the matricolaIndex is out of bounds", async function () {
    const polimiVerifierInputs = await generatePolimiVerifierCircuitInputs(rawEmail, ethAddress);
    polimiVerifierInputs.matricolaIndex = (polimiVerifierInputs.emailBodyLength! + 1).toString(); // Set index out of bounds

    expect.assertions(1);

    try {
      const witness = await circuit.calculateWitness(polimiVerifierInputs);
      await circuit.checkConstraints(witness);
    } catch (error) {
      expect((error as Error).message).toMatch("Assert Failed");
    }
  });
});

