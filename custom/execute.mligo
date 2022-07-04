let execute ((proposal_id, s): nat * storage): return =
    // sender must be a manager
    if not Set.mem (Tezos.get_sender ()) s.managers
    then failwith "MULTISIG_NOT_A_MANAGER"
    else
        // finds the proposal
        match (Big_map.find_opt proposal_id s.proposals) with
        | None -> failwith "UNKNOWN_PROPOSAL_ID"
        | Some prop -> (
            // checks if the proposal received enough approvals
            if Set.size prop.approvals < s.required_conf
            then failwith "NOT_ENOUGH_APPROVALS"
            // checks if the proposal is not expired
            else if prop.expires_at < (Tezos.get_level ())
            then failwith "PROPOSAL_EXPIRED"
            else
                // executes the lambda
                let ops = prop.actions () in

                ops, { s with proposals = Big_map.remove proposal_id s.proposals }
        )
