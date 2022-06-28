let propose ((info, s): proposal_info * storage): storage =
    // checks if the sender is a manager
    if not Set.mem (Tezos.get_sender ()) s.managers
    then failwith "MULTISIG_NOT_A_MANAGER"
    // checks that the expiry level is in the allowed range
    else if info.expires_at < (Tezos.get_level ()) + s.min_duration || info.expires_at > (Tezos.get_level ()) + s.max_duration
    then failwith "MULTISIG_WRONG_DURATION"
    else
        // adds the proposal to the bigmal
        let new_proposal: proposal =
        {
            actions = info.actions;
            expires_at = info.expires_at;
            approvals = if info.approve then Set.literal [Tezos.get_sender ()] else Set.empty;
        }
        in { 
            s with 
                proposals = Big_map.add s.counter new_proposal s.proposals; 
                counter = s.counter + 1n;
        }