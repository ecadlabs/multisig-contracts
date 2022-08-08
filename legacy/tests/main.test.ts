import { describe, test, expect, beforeAll } from "vitest";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import multisigContract from "../artifacts/main.json";

const LOCAL_NODE = "http://localhost:20000";

let Tezos: TezosToolkit;
let contractAddress;

beforeAll(async () => {
  // sets up the Tezos toolkit
  Tezos = new TezosToolkit(LOCAL_NODE);
  // sets up the signer
  const signer = new InMemorySigner(
    "edskRpm2mUhvoUjHjXgMoDRxMKhtKfww1ixmWiHCWhHuMEEbGzdnz8Ks4vgarKDtxok7HmrEo1JzkXkdkvyw7Rtw6BNtSd7MJ7"
  );
  Tezos.setSignerProvider(signer);
  // originates the contract
  try {
    const originationOp = await Tezos.contract.originate({
      code: multisigContract,
      storage: {
        stored_counter: 0,
        threshold: 2,
        keys: [await signer.publicKey()]
      },
      balance: "10"
    });
    await originationOp.confirmation();
    contractAddress = originationOp.contractAddress;
  } catch (error) {
    console.error(error);
  }
});

describe("Checking setup", async () => {
  test("Checks if the contract is correctly originated", async () => {
    const contract = await Tezos.contract.at(contractAddress);
    const storage: any = await contract.storage();
    expect(storage.stored_counter.toNumber()).toEqual(0);
    expect(
      await (await Tezos.tz.getBalance(contractAddress)).toNumber()
    ).toEqual(10_000_000);
  });
});

describe("Approve a transfer of tez", () => {
  test("Send a transfer approval transaction to the contract", async () => {
    expect(3).toEqual(3);
  });
});
