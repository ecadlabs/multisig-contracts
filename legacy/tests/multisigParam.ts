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

export const transferTransaction = async ({
  Tezos,
  contractAddress,
  recipient,
  amount,
  signatures
}: {
  Tezos: TezosToolkit;
  contractAddress: string;
  recipient: string;
  amount: number;
  signatures: Array<string>;
}): Promise<ContractMethodObject<ContractProvider | Wallet>> => {
  const contract = await Tezos.contract.at(contractAddress);
  const storage: any = await contract.storage();

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
};
