import type {
  TezosToolkit,
  ContractMethodObject,
  ContractProvider,
  Wallet
} from "@taquito/taquito";
import { Parser } from "@taquito/michel-codec";

export const transferPayloadToSign = async ({
  Tezos,
  recipient,
  amount,
  contractAddress,
  counter
}: {
  Tezos: TezosToolkit;
  recipient: string;
  amount: number;
  contractAddress: string;
  counter: number;
}): Promise<{ payload: string; lambda: any }> => {
  const chainId = await Tezos.rpc.getChainId();

  const p = new Parser();

  const lambda = `{ DROP ; NIL operation ; PUSH key_hash "${recipient}" ; IMPLICIT_ACCOUNT ; PUSH mutez ${amount} ; UNIT ; TRANSFER_TOKENS ; CONS }`;
  const michelsonData = `(Pair "${chainId}" (Pair "${contractAddress}" (Pair ${counter} (Left ${lambda}))))`;
  const dataToPack = p.parseMichelineExpression(michelsonData);

  const michelsonType = `(pair chain_id (pair address (pair nat (or (lambda unit (list operation)) (pair nat (list key))))))`;
  const typeToPack = p.parseMichelineExpression(michelsonType);

  const { packed } = await Tezos.rpc.packData({
    data: dataToPack as any,
    type: typeToPack as any
  });

  return {
    payload: packed,
    lambda: p.parseMichelineExpression(lambda)
  };
};

export const changeKeysPayloadToSign = async ({
  Tezos,
  contractAddress,
  counter,
  threshold,
  listOfKeys
}: {
  Tezos: TezosToolkit;
  contractAddress: string;
  counter: number;
  threshold: number;
  listOfKeys: Array<string>;
}): Promise<string> => {
  // process the list of keys to format it in Micheline format
  const michelineListOfKeys = `{ ${listOfKeys
    .map(key => `"${key}"`)
    .join(" ; ")} }`;

  const chainId = await Tezos.rpc.getChainId();

  const p = new Parser();

  const michelsonData = `(Pair "${chainId}" (Pair "${contractAddress}" (Pair ${counter} (Right (Pair ${threshold} ${michelineListOfKeys})))))`;
  const dataToPack = p.parseMichelineExpression(michelsonData);

  const michelsonType = `(pair chain_id (pair address (pair nat (or (lambda unit (list operation)) (pair nat (list key))))))`;
  const typeToPack = p.parseMichelineExpression(michelsonType);

  const { packed } = await Tezos.rpc.packData({
    data: dataToPack as any,
    type: typeToPack as any
  });

  return packed;
};

export const sendMultisigOperation = async ({
  Tezos,
  contractAddress,
  recipient,
  amount,
  txOptions,
  signatures
}: {
  Tezos: TezosToolkit;
  contractAddress: string;
  txOptions: {
    type: "transfer" | "changeKeys";
    args?: { threshold: number; keys: Array<string> };
  };
  signatures: Array<string>;
  recipient?: string;
  amount?: number;
}): Promise<ContractMethodObject<ContractProvider | Wallet>> => {
  const contract = await Tezos.contract.at(contractAddress);
  const storage: any = await contract.storage();

  if (txOptions.type === "transfer" && recipient && amount) {
    const { payload, lambda } = await transferPayloadToSign({
      Tezos,
      recipient,
      amount,
      contractAddress,
      counter: storage.stored_counter.toNumber()
    });

    const sig = (await Tezos.signer.sign(payload, new Uint8Array())).prefixSig;

    return contract.methodsObject.main({
      payload: {
        counter: storage.stored_counter.toNumber(),
        action: { operation: lambda }
      },
      sigs: [sig, ...signatures]
    });
  } else if (
    txOptions.type === "changeKeys" &&
    txOptions.args &&
    txOptions.args.hasOwnProperty("threshold") &&
    txOptions.args.hasOwnProperty("keys")
  ) {
    const payload = await changeKeysPayloadToSign({
      Tezos,
      contractAddress,
      counter: storage.stored_counter.toNumber(),
      threshold: txOptions.args.threshold,
      listOfKeys: txOptions.args.keys
    });

    const sig = (await Tezos.signer.sign(payload, new Uint8Array())).prefixSig;

    return contract.methodsObject.main({
      payload: {
        counter: storage.stored_counter.toNumber(),
        action: {
          change_keys: {
            threshold: txOptions.args.threshold,
            keys: txOptions.args.keys
          }
        }
      },
      sigs: [sig, ...signatures]
    });
  } else {
    return Promise.reject("invalid transaction parameters");
  }
};
