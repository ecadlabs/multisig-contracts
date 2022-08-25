import { describe, test, expect, beforeAll } from "vitest";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { Parser } from "@taquito/michel-codec";
import multisigContract from "../artifacts/main.json";
import { transferTransaction, transferPayloadToSign } from "./multisigParam";

const LOCAL_NODE = "http://localhost:20000";

let Tezos: TezosToolkit;
let contractAddress;
// let contractAddress = "KT1KZ19oWG1v2NL5mbBRUsdVf7tygq4R5xXF" (kathmandu);
/**
 * FLEXTESA COMMAND:
 * docker run --rm --name jakarta-sandbox --detach -p 20000:20000 --env flextesa_node_cors_origin='*' --env block_time=5 oxheadalpha/flextesa:20220510 jakartabox start --genesis random
 */

describe("Testing multisig contract", () => {
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
          threshold: 1,
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

  test("Checks if the contract is correctly originated", async () => {
    const contract = await Tezos.contract.at(contractAddress);
    const storage: any = await contract.storage();
    expect(storage.stored_counter.toNumber()).toEqual(0);
    expect(
      await (await Tezos.tz.getBalance(contractAddress)).toNumber()
    ).toEqual(10_000_000);
  });

  test("Send a transfer approval transaction to the contract", async () => {
    const contract = await Tezos.contract.at(contractAddress);
    const storage: any = await contract.storage();

    try {
      const { payload } = await transferPayloadToSign({
        Tezos,
        contractAddress,
        recipient: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
        amount: 5_000_000,
        counter: storage.stored_counter.toNumber()
      });
      const contractCall = await transferTransaction({
        Tezos,
        contractAddress,
        recipient: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
        amount: 5_000_000,
        signatures: [
          (await Tezos.signer.sign(payload, new Uint8Array())).prefixSig
        ]
      });
      const op = await contractCall.send();
      await op.confirmation();
      const newStorage: any = await contract.storage();
      expect(newStorage.stored_counter.toNumber()).toEqual(1);
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
    }
  });

  /*test("Send a transfer approval transaction to the contract", async () => {
    const contract = await Tezos.contract.at(contractAddress);
    const storage: any = await contract.storage();

    try {
      const chainId = await Tezos.rpc.getChainId();

      const p = new Parser();

      const lambda = `{ DROP ; NIL operation ; PUSH key_hash "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb" ; IMPLICIT_ACCOUNT ; PUSH mutez 5000000 ; UNIT ; TRANSFER_TOKENS ; CONS }`;
      const michelsonData = `(Pair "${chainId}" (Pair "${contractAddress}" (Pair ${storage.stored_counter.toNumber()} (Left ${lambda}))))`;
      // const michelsonData = `(Pair "${chainId}" "${contractAddress}" ${storage.stored_counter.toNumber()} (Left ${lambda}))`;
      // const michelsonData = `(Pair (Pair "${chainId}" "${contractAddress}") (Pair ${storage.stored_counter.toNumber()} (Left ${lambda})))`;
      const dataToPack = p.parseMichelineExpression(michelsonData);

      const michelsonType = `(pair chain_id (pair address (pair nat (or (lambda unit (list operation)) (pair nat (list key))))))`;
      // const michelsonType = `(pair chain_id address nat (or (lambda unit (list operation)) (pair nat (list key))))`;
      // const michelsonType = `(pair (pair chain_id address) (pair nat (or (lambda unit (list operation)) (pair nat (list key)))))`;
      const typeToPack = p.parseMichelineExpression(michelsonType);

      const { packed } = await Tezos.rpc.packData({
        data: dataToPack as any,
        type: typeToPack as any
      });

      const sigs = [
        (await Tezos.signer.sign(packed, new Uint8Array())).prefixSig
      ];

      const op = await contract.methodsObject
        .main({
          payload: {
            counter: storage.stored_counter.toNumber(),
            action: { operation: p.parseMichelineExpression(lambda) }
          },
          sigs
        })
        .send();
      await op.confirmation();
      const newStorage: any = await contract.storage();
      expect(newStorage.stored_counter.toNumber()).toEqual(1);
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
      // const expectedBytes = error.errors[1].with.args[1].bytes;
      // console.log("Expected bytes:", expectedBytes);
      // console.log("Generated bytes:", generatedBytes);
      // console.log(
      //   expectedBytes === generatedBytes
      //     ? "Bytes sequences match"
      //     : "Bytes sequences are different"
      // );
      expect.fail();
    }
  });*/
});

/*
ligo compile expression cameligo 'Crypto.check ("edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn": key) ("edsigtZDuVwwJHQZoV9dyeQe1xStaNru4kNVPBJEdukHmYq2hXrV6oP6wrRToHhR4NVn2KLcpzsPhoRxv2H5U5JyAjeXHxdENDK": signature) ("0507070a0000000456d7cf6707070a00000016013a4f8b390e164298e3fd0d678fbe9491eaff490b0007070000050502000000350320053d036d0743035d0a00000015006b82198cb179e8306c1bedd08f12dc863f328886031e0743036a0080ade204034f034d031b": bytes)'
chain 'Bytes.pack (("NetXxwUSSfKRvwL": chain_id) ("KT1UGoyrVyqTegQ5rXVmbSxcWzTqc3XxFgWC": address) 0n )'
*/

/*
ligo compile expression cameligo  'type change_keys_param =
[@layout:comb]
{ threshold : nat; keys : key list} in
type action = 
    [@layout:comb]
    | Operation of unit -> (operation list)
    | Change_keys of change_keys_param in
type param_payload =
[@layout:comb]
{ 
    counter : nat; 
    action  : action
} in
(Bytes.unpack ("0507070a00000004d10f5e1307070a00000016015c001a2fffb865ea3f0ba7ca6f9992957f7d50f200070700000505020000003f020000003a02000000350320053d036d0743035d0a00000015006b82198cb179e8306c1bedd08f12dc863f328886031e0743036a0080ade204034f034d031b": bytes): (chain_id * (address * param_payload)) option)'
*/
