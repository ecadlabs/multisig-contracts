import { describe, test, expect, beforeAll } from "vitest";
import { TezosToolkit, MANAGER_LAMBDA } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { Parser } from "@taquito/michel-codec";
import multisigContract from "../artifacts/main.json";

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
      const chainId = await Tezos.rpc.getChainId();
      const lambda = MANAGER_LAMBDA.transferImplicit(
        "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
        5_000_000
      );
      /*const dataToPack = {
        prim: "Pair",
        args: [
          {
            string: chainId
          },
          {
            prim: "Pair",
            args: [
              {
                string: contractAddress
              },
              {
                prim: "Pair",
                args: [
                  {
                    int: storage.stored_counter.toNumber()
                  },
                  {
                    prim: "Left",
                    args: [{ lambda: lambda }]
                  }
                ]
              }
            ]
          }
        ]
      };
      const typeToPack = {
        prim: "pair",
        args: [
          {
            prim: "chain_id"
          },
          {
            prim: "pair",
            args: [
              {
                prim: "address"
              },
              {
                prim: "pair",
                args: [
                  {
                    prim: "nat"
                  },
                  {
                    prim: "or",
                    args: [
                      {
                        prim: "lambda",
                        args: [
                          { prim: "unit" },
                          {
                            prim: "list",
                            args: [
                              {
                                prim: "operation"
                              }
                            ]
                          }
                        ]
                      },
                      {
                        prim: "pair",
                        args: [
                          {
                            prim: "nat"
                          },
                          {
                            prim: "list",
                            args: [
                              {
                                prim: "key"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }; */
      const p = new Parser();

      const testLambda = `{ DROP ; NIL operation ; PUSH key_hash "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb" ; IMPLICIT_ACCOUNT ; PUSH mutez 5000000 ; UNIT ; TRANSFER_TOKENS ; CONS }`;
      const michelsonData = `(Pair "${chainId}" (Pair "${contractAddress}" (Pair ${storage.stored_counter.toNumber()} (Left ${testLambda}))))`;
      const dataToPack = p.parseMichelineExpression(michelsonData);

      const michelsonType = `(pair chain_id (pair address (pair nat (or (lambda unit (list operation)) (pair nat (list key))))))`;
      const typeToPack = p.parseMichelineExpression(michelsonType);

      /*const dataToPack = `{
        "prim": "Pair",
        "args": [
          { "string": "${chainId}" },
          {
            "prim": "Pair",
            "args": [
              { "string": "${contractAddress}" },
              {
                "prim": "Pair",
                "args": [
                  { "int": "${storage.stored_counter.toNumber()}" },
                  {
                    "prim": "Left",
                    "args": [
                      {
                        "prim": "lambda",
                        "args": [{ lambda: ${lambda} }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }`;
      const typeToPack = `
        {
          "prim": "pair",
          "args": [
            { "prim": "chain_id" },
            { "prim": "address" },
            { "prim": "nat" },
            {
              "prim": "or",
              "args": [
                {
                  "prim": "lambda",
                  "args": [
                    { "prim": "unit" },
                    { "prim": "list", "args": [{ "prim": "operation" }] }
                  ]
                },
                {
                  "prim": "pair",
                  "args": [
                    { "prim": "nat" },
                    { "prim": "list", "args": [{ "prim": "key" }] }
                  ]
                }
              ]
            }
          ]
        }
      `;*/

      const { packed } = await Tezos.rpc.packData({
        data: dataToPack as any,
        type: typeToPack as any
      });

      const sigs = [(await Tezos.signer.sign(packed)).prefixSig];

      const op = await contract.methodsObject
        .main({
          payload: {
            counter: storage.stored_counter.toNumber(),
            action: { operation: [lambda] }
          },
          sigs
        })
        .send();
      await op.confirmation();
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
      expect.fail();
    }
  });
});
