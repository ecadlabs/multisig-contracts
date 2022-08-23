(*
    CONTRACT INTERFACE
    [@layout:comb] is extensively used to order the pair and union fields
    as they are in the original contract
*)

type change_keys_param =
[@layout:comb]
{ threshold : nat; keys : key list}

type action = 
    [@layout:comb]
    | Operation of unit -> (operation list)
    | Change_keys of change_keys_param

type param_payload =
[@layout:comb]
{ 
    counter : nat; 
    action  : action
}

type main_parameter =
[@layout:comb]
{
    payload : param_payload;
    sigs    : (signature option) list;
}

type parameter = 
    | Default
    | Main of main_parameter

type storage =
[@layout:comb]
{
    stored_counter  : nat;
    threshold       : nat;
    keys            : key list;
}

type pair_to_pack =
[@layout:comb]
{
    chain_id        : chain_id;
    contract_address: address;
    payload         : param_payload
}

type return = operation list * storage

(*
    CONTRACT IMPLEMENTATION
*)

let main ((param, store): parameter * storage): return =
    match param with
    | Default -> [], store
    | Main p ->
        (
            // no amount to be sent to this entrypoint
            if Tezos.get_amount () <> 0mutez
            then failwith "UNEXPECTED_MUTEZ_AMOUNT"
            else
                // forges the bytes that must be signed by the managers
                let { payload ; sigs } = p in
                let bytes_pair: pair_to_pack = 
                {
                    chain_id            = (Tezos.get_chain_id ());
                    contract_address    = (Tezos.get_self_address ());
                    payload             = payload
                } in
                let bytes_to_sign: bytes = Bytes.pack bytes_pair in
                // checks that the provided counter is correct
                if payload.counter <> store.stored_counter
                then failwith "INCORRECT_PAYLOAD_COUNTER"
                else
                    // loops through the list of signatures
                    // compares the managers' keys with the signatures
                    // keeps track of the number of signature to compare it later with the threshold
                    let (sig_num, _): (nat * key list) =
                        List.fold 
                            (
                                fun ((acc, keys), signature: (nat * key list) * (signature option)) -> 
                                    match signature with
                                    | None -> (failwith "SIG_IS_NONE": nat * (key list))
                                    | Some sig -> (
                                        match keys with
                                        | [] -> failwith ()
                                        | (key::tl) -> (
                                            // checks the signature
                                            if Crypto.check key sig bytes_to_sign
                                            then (acc + 1n, tl)
                                            else failwith ("WRONG_SIGNATURE", bytes_pair, bytes_to_sign)
                                        )
                                    )
                            ) 
                            sigs 
                            (0n, store.keys)
                    in
                    // checks that the number of signature matched the threshold
                    if store.threshold <= sig_num
                    then
                        let new_store = { store with stored_counter = store.stored_counter + 1n } in
                        let (ops, new_store) = 
                            match payload.action with
                            | Operation exec ->
                                // runs the lambda
                                exec (), new_store
                            | Change_keys { threshold = threshold ; keys = keys } ->
                                // updates the managers' keys
                                [], { new_store with threshold = threshold ; keys = keys }
                        in ops, new_store
                    else failwith "INCORRECT_SIG_THRESHOLD"
        )