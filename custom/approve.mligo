let approve ((proposal_id, s): nat * storage): storage =
    let sender = Tezos.get_sender () in
    // checks if the sender is a manager
    if not Set.mem sender s.managers
    then failwith "MULTISIG_NOT_A_MANAGER"
    else
        // checks if the proposal exists
        let proposal = match Big_map.find_opt proposal_id s.proposals with
            | None -> failwith "MULTISIG_NO_PROPOSAL_FOUND"
            | Some prop -> prop
        in
        // checks if the proposal is not expired
        if proposal.expires_at > Tezos.get_level ()
        then failwith "MULTISIG_PROPOSAL_EXPIRED"
        else
            // adds the manager's address to the list of approvals
            if Set.mem sender proposal.approvals
            then failwith "MULTISIG_ALREADY_APPROVED"
            else
                {
                    s with proposals = 
                        Big_map.update 
                            proposal_id 
                            (Some { proposal with approvals = Set.add sender proposal.approvals })
                            s.proposals
                }