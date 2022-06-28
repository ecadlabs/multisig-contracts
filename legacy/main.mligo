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
    | Operation of unit -> operation list
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
            // let _ = assert(Tezos.get_amount () <> 0mutez) in
            if Tezos.get_amount () <> 0mutez
            then failwith ()
            else
                // forges the bytes that must be signed by the managers
                let { payload ; sigs } = p in
                let bytes_to_sign: bytes = Bytes.pack ((Tezos.get_chain_id (), Tezos.get_self_address ()), payload) in
                // checks that the provided counter is correct
                if payload.counter <> store.stored_counter
                then failwith ()
                else
                    // loops through the list of signatures
                    // compares the managers' keys with the signatures
                    // keeps track of the number of signature to compare it later with the threshold
                    let sig_num: nat =
                        List.fold 
                            (
                                fun ((acc, keys), signature: (nat * key list) * signature) -> 
                                    match signature with
                                    | None -> (failwith (): nat * (key list))
                                    | Some sig -> (
                                        match keys with
                                        | [] -> failwith ()
                                        | hd -> (acc + 1n, [])
                                        | (hd::tl) -> (acc + 1n, tl)
                                    )
                            ) 
                            sigs 
                            (acc, store.keys)
                    in

                    [], store
        )