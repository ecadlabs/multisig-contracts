let execute ((proposal_id, s): nat * storage): return =
    // sender must be a manager
    if not Set.mem (Tezos.get_sender ()) s.managers
    then failwith "MULTISIG_NOT_A_MANAGER"
    else
        // finds the proposal
        match (Big_map)
        [], s