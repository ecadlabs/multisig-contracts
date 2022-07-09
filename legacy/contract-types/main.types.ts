
import { ContractAbstractionFromContractType, WalletContractAbstractionFromContractType } from './type-utils';
import { key, lambda, nat, signature } from './type-aliases';

type Storage = {
    stored_counter: nat;
    threshold: nat;
    keys: Array<key>;
};

type Methods = {
    default: () => Promise<void>;
    main: (
        counter: nat,
        action: (
            { operation: lambda }
            | {
                change_keys: {
                    threshold: nat;
                    keys: Array<key>;
                }
            }
        ),
        sigs: Array<signature>,
    ) => Promise<void>;
};

type MethodsObject = {
    default: () => Promise<void>;
    main: (params: {
        counter: nat,
        action: (
            { operation: lambda }
            | {
                change_keys: {
                    threshold: nat;
                    keys: Array<key>;
                }
            }
        ),
        sigs: Array<signature>,
    }) => Promise<void>;
};

type contractTypes = { methods: Methods, methodsObject: MethodsObject, storage: Storage, code: { __type: 'MainCode', protocol: string, code: object[] } };
export type MainContractType = ContractAbstractionFromContractType<contractTypes>;
export type MainWalletType = WalletContractAbstractionFromContractType<contractTypes>;
